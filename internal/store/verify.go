package store

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/praetorianer777/gotree/internal/db"
	"github.com/praetorianer777/gotree/internal/gedcom"
)

// VerifyRow compares one kind of record before and after a round trip.
type VerifyRow struct {
	Kind      string `json:"kind"`
	Tree      int    `json:"tree"`
	RoundTrip int    `json:"roundTrip"`
}

// VerifyReport is the result of exporting and reading the export back.
type VerifyReport struct {
	Version  string           `json:"version"`
	OK       bool             `json:"ok"`
	Rows     []VerifyRow      `json:"rows"`
	Warnings []gedcom.Warning `json:"warnings"`
	// Dropped lists tags the re-import did not take over.
	Dropped []TagStat `json:"dropped"`
}

var countQueries = []struct{ kind, query string }{
	{"persons", `SELECT count(*) FROM persons WHERE tree_id = ?`},
	{"names", `SELECT count(*) FROM person_names n JOIN persons p ON p.id = n.person_id WHERE p.tree_id = ?`},
	{"families", `SELECT count(*) FROM families WHERE tree_id = ?`},
	{"children", `SELECT count(*) FROM family_children c JOIN families f ON f.id = c.family_id WHERE f.tree_id = ?`},
	{"events", `SELECT count(*) FROM events WHERE tree_id = ?`},
	{"participants", `SELECT count(*) FROM event_participants x JOIN events e ON e.id = x.event_id WHERE e.tree_id = ?`},
	{"places", `SELECT count(*) FROM places WHERE tree_id = ?`},
	{"sources", `SELECT count(*) FROM sources WHERE tree_id = ?`},
	{"repositories", `SELECT count(*) FROM repositories WHERE tree_id = ?`},
	{"citations", `SELECT count(*) FROM citations WHERE tree_id = ?`},
}

func (s *Store) treeCounts(ctx context.Context, treeID int64) (map[string]int, error) {
	out := map[string]int{}
	for _, c := range countQueries {
		var n int
		if err := s.DB.QueryRowContext(ctx, c.query, treeID).Scan(&n); err != nil {
			return nil, err
		}
		out[c.kind] = n
	}
	return out, nil
}

// VerifyExport exports the whole tree, imports the file into a throwaway
// database and compares what arrived with what was there, so a lossy
// export is noticed before the file is relied on.
func (s *Store) VerifyExport(ctx context.Context, a Actor, version7 bool, appVersion string) (VerifyReport, error) {
	report := VerifyReport{Version: "5.5.1", Warnings: []gedcom.Warning{}, Dropped: []TagStat{}}
	if version7 {
		report.Version = "7.0"
	}
	ex, err := s.ExportGEDCOM(ctx, a, ExportOptions{Version7: version7, Privacy: PrivacyAll, AppVersion: appVersion})
	if err != nil {
		return report, err
	}
	var buf bytes.Buffer
	if err := gedcom.Write(&buf, ex.Records, gedcom.WriteOptions{Version7: version7}); err != nil {
		return report, err
	}
	doc, err := gedcom.Parse(buf.Bytes())
	if err != nil {
		return report, err
	}
	report.Warnings = append(report.Warnings, doc.Warnings...)

	dir, err := os.MkdirTemp("", "gotree-verify-*")
	if err != nil {
		return report, err
	}
	defer os.RemoveAll(dir)
	conn, err := db.Open(ctx, filepath.Join(dir, "verify.db"))
	if err != nil {
		return report, err
	}
	defer conn.Close()
	tmp := &Store{DB: conn, Now: s.Now}
	u, err := tmp.Setup(ctx, SetupInput{Username: "verify", Password: "verify-only-password"})
	if err != nil {
		return report, err
	}
	var treeID int64
	if err := conn.QueryRowContext(ctx, `SELECT tree_id FROM tree_members WHERE user_id = ?`, u.ID).Scan(&treeID); err != nil {
		return report, err
	}
	imported, err := tmp.ImportGEDCOM(ctx, Actor{UserID: u.ID, TreeID: treeID, Role: RoleOwner}, doc, ImportIntoEmpty)
	if err != nil {
		return report, err
	}
	for _, t := range imported.Tags {
		if t.Outcome != TagDropped || t.Path == "SUBM" {
			continue
		}
		// FAMS, CHAN and RIN are always dropped on import because GoTree
		// derives or replaces them; only other drops are losses.
		last := t.Path[strings.LastIndex(t.Path, ".")+1:]
		if _, expected := droppedTags[last]; expected {
			continue
		}
		report.Dropped = append(report.Dropped, t)
	}

	before, err := s.treeCounts(ctx, a.TreeID)
	if err != nil {
		return report, err
	}
	after, err := tmp.treeCounts(ctx, treeID)
	if err != nil {
		return report, err
	}
	report.OK = len(report.Dropped) == 0
	for _, c := range countQueries {
		report.Rows = append(report.Rows, VerifyRow{Kind: c.kind, Tree: before[c.kind], RoundTrip: after[c.kind]})
		if before[c.kind] != after[c.kind] {
			report.OK = false
		}
	}
	return report, nil
}
