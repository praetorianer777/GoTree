// Package api wires the HTTP routes: the JSON API under /api and the
// embedded single-page app for everything else.
package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Server holds the dependencies of the HTTP handlers.
type Server struct {
	DB      *sql.DB
	Version string
	// Frontend is the built SPA (web/dist); see web.Dist.
	Frontend fs.FS
	Log      *slog.Logger
}

// Handler builds the complete HTTP handler.
func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)

	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.NoCache)
		r.Get("/health", s.health)
		r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
			writeError(w, http.StatusNotFound, "not found")
		})
		r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		})
	})

	r.Handle("/*", spaHandler(s.Frontend))
	return r
}

type healthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version"`
	Database string `json:"database"`
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	resp := healthResponse{Status: "ok", Version: s.Version, Database: "ok"}
	status := http.StatusOK
	if err := s.DB.PingContext(ctx); err != nil {
		s.Log.Error("health: database ping failed", "err", err)
		resp.Status, resp.Database = "degraded", "unreachable"
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, resp)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}
