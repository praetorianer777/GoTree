package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/praetorianer777/gotree/internal/store"
)

func TestImportEndpoint(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)
	ged, err := os.ReadFile("../store/testdata/ancestry-551.ged")
	if err != nil {
		t.Fatal(err)
	}

	status, body := c.upload("/api/import/gedcom", "tree.ged", ged)
	if status != http.StatusOK {
		t.Fatalf("import: %d %s", status, body)
	}
	var report store.ImportReport
	if err := json.Unmarshal(body, &report); err != nil {
		t.Fatal(err)
	}
	if report.Counts["persons"] != 4 {
		t.Errorf("report: %+v", report.Counts)
	}

	// The tree now has data: a second import needs mode=replace.
	if status, _ := c.upload("/api/import/gedcom", "tree.ged", ged); status != http.StatusConflict {
		t.Errorf("second import: %d", status)
	}

	var zipped bytes.Buffer
	zw := zip.NewWriter(&zipped)
	f, _ := zw.Create("gedcom.ged")
	_, _ = f.Write(ged)
	_, _ = zw.Create("media/photo.jpg")
	zw.Close()
	if status, body := c.upload("/api/import/gedcom?mode=replace", "tree.zip", zipped.Bytes()); status != http.StatusOK {
		t.Errorf("zip import: %d %s", status, body)
	}

	if status, _ := c.upload("/api/import/gedcom?mode=replace", "x.ged", []byte("<html>nope</html>")); status != http.StatusUnprocessableEntity {
		t.Errorf("not a gedcom: %d", status)
	}
	var empty bytes.Buffer
	zw = zip.NewWriter(&empty)
	_, _ = zw.Create("readme.txt")
	zw.Close()
	if status, _ := c.upload("/api/import/gedcom?mode=replace", "x.zip", empty.Bytes()); status != http.StatusUnprocessableEntity {
		t.Errorf("zip without gedcom: %d", status)
	}
}

func TestExportEndpoints(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)
	ged, _ := os.ReadFile("../store/testdata/ancestry-551.ged")
	if status, _ := c.upload("/api/import/gedcom", "tree.ged", ged); status != http.StatusOK {
		t.Fatalf("import: %d", status)
	}
	if status, _ := c.upload("/api/media", "p.jpg", jpegBytes(t, 20, 10)); status != http.StatusCreated {
		t.Fatalf("media: %d", status)
	}

	resp, err := c.http.Get(c.base + "/api/export/gedcom?version=5.5.1")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !bytes.HasPrefix(body, []byte("0 HEAD\n")) || !strings.Contains(resp.Header.Get("Content-Disposition"), ".ged") {
		t.Errorf("ged export: %q %v", body[:min(40, len(body))], resp.Header)
	}

	resp, err = c.http.Get(c.base + "/api/export/gedcom?version=7.0&format=gedzip")
	if err != nil {
		t.Fatal(err)
	}
	body, _ = io.ReadAll(resp.Body)
	resp.Body.Close()
	zr, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	// All media are packed, linked to someone or not, so the archive is a
	// complete copy.
	if len(names) != 2 || names[0] != "gedcom.ged" || !strings.HasPrefix(names[1], "media/") || !strings.Contains(resp.Header.Get("Content-Disposition"), ".gdz") {
		t.Errorf("gedzip: %v %v", names, resp.Header)
	}

	var report store.VerifyReport
	c.call("GET", "/api/export/verify?version=7.0", nil, http.StatusOK, &report)
	if !report.OK || len(report.Rows) == 0 {
		t.Errorf("verify: %+v", report)
	}
	c.call("GET", "/api/export/gedcom?privacy=nobody", nil, http.StatusUnprocessableEntity, nil)
}
