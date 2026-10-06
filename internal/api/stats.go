package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/praetorianer777/gotree/internal/store"
)

func (s *Server) statsRoutes(r chi.Router) {
	r.Get("/stats", s.stats)
	r.Get("/map", s.mapData)
}

func (s *Server) stats(w http.ResponseWriter, r *http.Request) {
	st, err := s.Store.Stats(r.Context(), actorFrom(r))
	s.respond(w, http.StatusOK, st, err)
}

func (s *Server) mapData(w http.ResponseWriter, r *http.Request) {
	scope := r.URL.Query().Get("scope")
	switch scope {
	case "", store.MapScopeAll:
		scope = store.MapScopeAll
	case store.MapScopeAncestors, store.MapScopeDescendants:
	default:
		writeError(w, http.StatusBadRequest, "scope must be all, ancestors or descendants")
		return
	}
	d, err := s.Store.MapData(r.Context(), actorFrom(r), scope, int64(queryInt(r, "root", 0)))
	s.respond(w, http.StatusOK, d, err)
}
