// Package db opens the SQLite database and applies the embedded migrations.
package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"net/url"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var embedded embed.FS

var migrations = func() fs.FS {
	sub, err := fs.Sub(embedded, "migrations")
	if err != nil {
		panic(err)
	}
	return sub
}()

// Open opens (creating if needed) the database at path and migrates it to the
// latest schema.
func Open(ctx context.Context, path string) (*sql.DB, error) {
	// Pragmas go into the DSN so every pooled connection gets them, not just
	// the first one.
	q := url.Values{}
	q.Add("_pragma", "foreign_keys(1)")
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "busy_timeout(5000)")
	q.Add("_pragma", "synchronous(NORMAL)")
	q.Set("_txlock", "immediate")
	dsn := "file:" + path + "?" + q.Encode()

	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	if err := conn.PingContext(ctx); err != nil {
		conn.Close()
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	if err := Migrate(ctx, conn); err != nil {
		conn.Close()
		return nil, err
	}
	return conn, nil
}

// Migrate applies all pending migrations.
func Migrate(ctx context.Context, conn *sql.DB) error {
	provider, err := goose.NewProvider(goose.DialectSQLite3, conn, migrations)
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

// SchemaVersion reports the version of the newest applied migration.
func SchemaVersion(ctx context.Context, conn *sql.DB) (int64, error) {
	provider, err := goose.NewProvider(goose.DialectSQLite3, conn, migrations)
	if err != nil {
		return 0, err
	}
	return provider.GetDBVersion(ctx)
}
