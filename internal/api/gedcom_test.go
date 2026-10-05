package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"net/http"
	"os"
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
