package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// client talks to a test server with a cookie jar, like a browser would.
type client struct {
	t    *testing.T
	base string
	http *http.Client
}

func newClient(t *testing.T, ts *httptest.Server) *client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	return &client{t: t, base: ts.URL, http: &http.Client{Jar: jar}}
}

func (c *client) do(method, path string, body any, headers ...string) (int, []byte) {
	c.t.Helper()
	var rd io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, c.base+path, rd)
	if err != nil {
		c.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	out, err := io.ReadAll(resp.Body)
	if err != nil {
		c.t.Fatal(err)
	}
	return resp.StatusCode, out
}

// call expects the given status and decodes the response into out.
func (c *client) call(method, path string, body any, wantStatus int, out any) {
	c.t.Helper()
	status, raw := c.do(method, path, body)
	if status != wantStatus {
		c.t.Fatalf("%s %s: status %d, want %d: %s", method, path, status, wantStatus, raw)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			c.t.Fatalf("%s %s: decode %s: %v", method, path, raw, err)
		}
	}
}

const testPassword = "correct horse battery"

// loggedIn returns a client that has completed the first-run setup.
func loggedIn(t *testing.T, ts *httptest.Server) *client {
	t.Helper()
	c := newClient(t, ts)
	c.call("POST", "/api/auth/setup", map[string]string{"username": "admin", "password": testPassword}, http.StatusOK, nil)
	return c
}

func TestSetupLoginLogout(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := newClient(t, ts)

	var state authState
	c.call("GET", "/api/auth/state", nil, http.StatusOK, &state)
	if !state.SetupRequired || state.User != nil {
		t.Fatalf("fresh install: %+v", state)
	}
	c.call("GET", "/api/persons", nil, http.StatusUnauthorized, nil)

	var errBody errorBody
	c.call("POST", "/api/auth/setup", map[string]string{"username": "admin", "password": "short"}, http.StatusUnprocessableEntity, &errBody)
	if errBody.Fields["password"] == "" {
		t.Errorf("validation errors must name the field: %+v", errBody)
	}

	c.call("POST", "/api/auth/setup", map[string]string{"username": "admin", "password": testPassword, "treeName": "Weber"}, http.StatusOK, &state)
	if state.SetupRequired || state.User == nil || state.Tree == nil || state.Tree.Name != "Weber" || state.Tree.Role != "owner" {
		t.Fatalf("after setup the user must be logged in: %+v", state)
	}
	c.call("GET", "/api/persons", nil, http.StatusOK, nil)

	// Setup cannot be repeated to create another account.
	other := newClient(t, ts)
	other.call("POST", "/api/auth/setup", map[string]string{"username": "evil", "password": testPassword}, http.StatusConflict, nil)

	c.call("POST", "/api/auth/logout", nil, http.StatusNoContent, nil)
	c.call("GET", "/api/persons", nil, http.StatusUnauthorized, nil)
	c.call("GET", "/api/auth/state", nil, http.StatusOK, &state)
	if state.User != nil {
		t.Errorf("logged out but state has a user: %+v", state)
	}

	c.call("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "wrong password"}, http.StatusUnauthorized, nil)
	c.call("POST", "/api/auth/login", map[string]string{"username": "admin", "password": testPassword}, http.StatusNoContent, nil)
	c.call("GET", "/api/persons", nil, http.StatusOK, nil)
}

func TestSessionCookieFlags(t *testing.T) {
	ts := newServer(t, builtFrontend)
	resp, err := http.Post(ts.URL+"/api/auth/setup", "application/json",
		strings.NewReader(`{"username":"admin","password":"`+testPassword+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	var c *http.Cookie
	for _, ck := range resp.Cookies() {
		if ck.Name == sessionCookie {
			c = ck
		}
	}
	if c == nil {
		t.Fatal("no session cookie")
	}
	if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode || c.Path != "/" || c.MaxAge <= 0 {
		t.Errorf("cookie flags: %+v", c)
	}
}

func TestLoginThrottle(t *testing.T) {
	ts := newServer(t, builtFrontend)
	loggedIn(t, ts)
	c := newClient(t, ts)
	for range 10 {
		c.call("POST", "/api/auth/login", map[string]string{"username": "admin", "password": "nope nope nope"}, http.StatusUnauthorized, nil)
	}
	// Even the right password is refused while throttled.
	c.call("POST", "/api/auth/login", map[string]string{"username": "admin", "password": testPassword}, http.StatusTooManyRequests, nil)
}

func TestThrottleWindow(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	th := newLoginThrottle()
	th.now = func() time.Time { return now }
	for range th.max {
		th.fail("1.2.3.4")
	}
	if th.allow("1.2.3.4") {
		t.Error("allowed after max failures")
	}
	if !th.allow("5.6.7.8") {
		t.Error("another address must not be throttled")
	}
	now = now.Add(th.window + time.Second)
	if !th.allow("1.2.3.4") {
		t.Error("failures must expire after the window")
	}
}

func TestCrossOriginWritesAreRejected(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)
	status, _ := c.do("POST", "/api/persons", map[string]string{"givenNames": "X"},
		"Origin", "https://evil.example", "Sec-Fetch-Site", "cross-site")
	if status != http.StatusForbidden {
		t.Errorf("cross-site POST: status %d, want 403", status)
	}
	status, _ = c.do("POST", "/api/persons", map[string]string{"givenNames": "X"}, "Sec-Fetch-Site", "same-origin")
	if status != http.StatusCreated {
		t.Errorf("same-origin POST: status %d, want 201", status)
	}
}

func TestViewerCannotWrite(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)
	c.call("POST", "/api/persons", map[string]string{"givenNames": "Before"}, http.StatusCreated, nil)

	srv := testServers[ts]
	if _, err := srv.Store.DB.Exec(`UPDATE tree_members SET role = 'viewer'`); err != nil {
		t.Fatal(err)
	}
	c.call("GET", "/api/persons", nil, http.StatusOK, nil)
	c.call("POST", "/api/persons", map[string]string{"givenNames": "After"}, http.StatusForbidden, nil)
}
