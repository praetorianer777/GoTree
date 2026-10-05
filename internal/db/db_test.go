package db

import (
	"context"
	"path/filepath"
	"testing"
)

func TestOpenMigratesAndReopens(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "test.db")

	conn, err := Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	v, err := SchemaVersion(ctx, conn)
	if err != nil {
		t.Fatal(err)
	}
	if v < 1 {
		t.Fatalf("schema version %d, want >= 1", v)
	}
	if _, err := conn.ExecContext(ctx, `INSERT INTO app_meta (key, value) VALUES ('k', 'v')`); err != nil {
		t.Fatal(err)
	}
	conn.Close()

	// A second open must find the schema in place and the data intact.
	conn, err = Open(ctx, path)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	var got string
	if err := conn.QueryRowContext(ctx, `SELECT value FROM app_meta WHERE key = 'k'`).Scan(&got); err != nil {
		t.Fatal(err)
	}
	if got != "v" {
		t.Errorf("got %q, want %q", got, "v")
	}
}

func TestPragmasApplyToEveryConnection(t *testing.T) {
	ctx := context.Background()
	conn, err := Open(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(3)

	// Hold several connections at once so the pool has to open new ones.
	for i := range 3 {
		c, err := conn.Conn(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer c.Close()
		var fk int
		if err := c.QueryRowContext(ctx, `PRAGMA foreign_keys`).Scan(&fk); err != nil {
			t.Fatal(err)
		}
		if fk != 1 {
			t.Errorf("connection %d: foreign_keys = %d, want 1", i, fk)
		}
		var mode string
		if err := c.QueryRowContext(ctx, `PRAGMA journal_mode`).Scan(&mode); err != nil {
			t.Fatal(err)
		}
		if mode != "wal" {
			t.Errorf("connection %d: journal_mode = %q, want wal", i, mode)
		}
	}
}
