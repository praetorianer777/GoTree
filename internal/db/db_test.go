package db

import (
	"context"
	"os"
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

func TestOpenPathWithSpecialCharacters(t *testing.T) {
	ctx := context.Background()
	base := t.TempDir()
	a, err := Open(ctx, filepath.Join(base, "family #1", "tree?.db"))
	if err == nil {
		t.Fatal("a missing directory should fail")
	}
	_ = a
	dir := filepath.Join(base, "family #1")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	conn, err := Open(ctx, filepath.Join(dir, "tree?.db"))
	if err != nil {
		t.Fatal(err)
	}
	conn.Close()
	if _, err := os.Stat(filepath.Join(dir, "tree?.db")); err != nil {
		t.Errorf("database not created at the exact path: %v", err)
	}
}
