package api

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/praetorianer777/gotree/internal/store"
)

func TestCalendarFeed(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)
	var anna store.Person
	c.call("POST", "/api/persons", map[string]any{"givenNames": "Anna", "surname": "Weber"}, http.StatusCreated, &anna)
	c.call("POST", "/api/events", map[string]any{"personId": anna.ID, "type": "BIRT", "date": "12 MAR 1850"}, http.StatusCreated, nil)
	c.call("POST", "/api/events", map[string]any{"personId": anna.ID, "type": "DEAT", "date": "1 MAY 1920"}, http.StatusCreated, nil)

	var feed store.CalendarFeed
	c.call("POST", "/api/calendar-feeds", map[string]any{"label": "Phone", "includeLiving": false}, http.StatusCreated, &feed)

	// The calendar app has no session.
	resp, body := get(t, ts.URL+"/ical/"+feed.Token+".ics")
	if resp.StatusCode != http.StatusOK || !strings.HasPrefix(resp.Header.Get("Content-Type"), "text/calendar") {
		t.Fatalf("status %d, type %q", resp.StatusCode, resp.Header.Get("Content-Type"))
	}
	for _, want := range []string{"SUMMARY:Birthday: Anna Weber (born 1850)", "SUMMARY:Remembrance: Anna Weber (died 1920)", "DTSTART;VALUE=DATE:18500312"} {
		if !strings.Contains(body, want) {
			t.Errorf("feed lacks %q:\n%s", want, body)
		}
	}
	if resp, _ := get(t, ts.URL+"/ical/"+feed.Token); resp.StatusCode != http.StatusNotFound {
		t.Errorf("without .ics: %d", resp.StatusCode)
	}

	var feeds []store.CalendarFeed
	c.call("GET", "/api/calendar-feeds", nil, http.StatusOK, &feeds)
	if len(feeds) != 1 {
		t.Errorf("feeds: %+v", feeds)
	}
	c.call("DELETE", fmt.Sprintf("/api/calendar-feeds/%d", feed.ID), nil, http.StatusNoContent, nil)
	if resp, _ := get(t, ts.URL+"/ical/"+feed.Token+".ics"); resp.StatusCode != http.StatusNotFound {
		t.Errorf("revoked feed: %d", resp.StatusCode)
	}
}
