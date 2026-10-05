// Command gotree runs the GoTree server: the JSON API and the embedded web UI.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/praetorianer777/gotree/internal/api"
	"github.com/praetorianer777/gotree/internal/config"
	"github.com/praetorianer777/gotree/internal/db"
	"github.com/praetorianer777/gotree/internal/media"
	"github.com/praetorianer777/gotree/internal/store"
	"github.com/praetorianer777/gotree/web"
)

// version is set at build time with -ldflags "-X main.version=…".
var version = "dev"

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(log); err != nil {
		log.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.FromOS()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(cfg.DataDir, 0o750); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	conn, err := db.Open(ctx, cfg.DBPath())
	if err != nil {
		return err
	}
	defer conn.Close()

	st := store.New(conn)
	if err := bootstrapAdmin(ctx, st, cfg, log); err != nil {
		return err
	}
	if err := st.PruneSessions(ctx); err != nil {
		return err
	}

	srv := &http.Server{
		Addr: cfg.ListenAddr,
		Handler: (&api.Server{
			Store:     st,
			Files:     media.Files{Root: cfg.MediaDir()},
			MaxUpload: int64(cfg.MaxUploadMB) << 20,
			Version:   version,
			Frontend:  web.Dist(),
			Log:       log,
		}).Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	errc := make(chan error, 1)
	go func() {
		log.Info("gotree listening", "addr", cfg.ListenAddr, "version", version, "data", cfg.DataDir)
		errc <- srv.ListenAndServe()
	}()

	select {
	case err := <-errc:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		log.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown: %w", err)
		}
	}
	return nil
}

// bootstrapAdmin creates the first account from the environment, for
// unattended installs. Without GOTREE_ADMIN_PASSWORD the web UI asks for it.
func bootstrapAdmin(ctx context.Context, st *store.Store, cfg config.Config, log *slog.Logger) error {
	if cfg.AdminPassword == "" {
		return nil
	}
	need, err := st.NeedsSetup(ctx)
	if err != nil || !need {
		return err
	}
	if _, err := st.Setup(ctx, store.SetupInput{Username: cfg.AdminUser, Password: cfg.AdminPassword}); err != nil {
		return fmt.Errorf("create admin from GOTREE_ADMIN_PASSWORD: %w", err)
	}
	log.Info("created admin account from the environment", "user", cfg.AdminUser)
	return nil
}
