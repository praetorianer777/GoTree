// Package config resolves the runtime settings from flags and environment.
package config

import (
	"errors"
	"flag"
	"os"
	"path/filepath"
)

// Config holds everything the server needs to start.
type Config struct {
	// DataDir holds the SQLite database and uploaded media.
	DataDir string
	// ListenAddr is the address the HTTP server binds to, e.g. ":8080".
	ListenAddr string
}

// DBPath is the location of the SQLite database inside DataDir.
func (c Config) DBPath() string {
	return filepath.Join(c.DataDir, "gotree.db")
}

// Load parses args (without the program name). Flags win over environment
// variables, which win over the defaults.
func Load(args []string, getenv func(string) string) (Config, error) {
	cfg := Config{
		DataDir:    envOr(getenv, "GOTREE_DATA_DIR", "data"),
		ListenAddr: envOr(getenv, "GOTREE_LISTEN_ADDR", ":8080"),
	}

	fs := flag.NewFlagSet("gotree", flag.ContinueOnError)
	fs.StringVar(&cfg.DataDir, "data-dir", cfg.DataDir, "directory for the database and media (env GOTREE_DATA_DIR)")
	fs.StringVar(&cfg.ListenAddr, "listen", cfg.ListenAddr, "HTTP listen address (env GOTREE_LISTEN_ADDR)")
	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}

	if cfg.DataDir == "" {
		return Config{}, errors.New("data dir must not be empty")
	}
	if cfg.ListenAddr == "" {
		return Config{}, errors.New("listen address must not be empty")
	}
	return cfg, nil
}

// FromOS loads the configuration from the process arguments and environment.
func FromOS() (Config, error) {
	return Load(os.Args[1:], os.Getenv)
}

func envOr(getenv func(string) string, key, fallback string) string {
	if v := getenv(key); v != "" {
		return v
	}
	return fallback
}
