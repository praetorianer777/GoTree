package store

import (
	"context"
	"errors"
	"os"
)

// Snapshot writes a consistent copy of the whole database to path, which
// must not exist yet. VACUUM INTO reads inside one transaction, so writes
// that happen meanwhile are either fully in the copy or not at all, and
// the copy is compacted and has no WAL file to go with it.
func (s *Store) Snapshot(ctx context.Context, path string) error {
	if _, err := os.Stat(path); err == nil {
		return errors.New("snapshot target exists")
	}
	_, err := s.DB.ExecContext(ctx, `VACUUM INTO ?`, path)
	return err
}
