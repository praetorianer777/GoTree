package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/praetorianer777/gotree/internal/store"
)

func (s *Server) heirloomRoutes(r chi.Router) {
	r.Route("/heirlooms", func(r chi.Router) {
		r.Get("/", s.listHeirlooms)
		r.Post("/", s.createHeirloom)
		r.Get("/{id}", s.getHeirloom)
		r.Put("/{id}", s.updateHeirloom)
		r.Delete("/{id}", s.deleteHeirloom)
	})
}

func (s *Server) listHeirlooms(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListHeirlooms(r.Context(), actorFrom(r), r.URL.Query().Get("q"), int64(queryInt(r, "person", 0)))
	s.respond(w, http.StatusOK, list, err)
}

func (s *Server) createHeirloom(w http.ResponseWriter, r *http.Request) {
	var in store.HeirloomInput
	if !decode(w, r, &in) {
		return
	}
	h, err := s.Store.CreateHeirloom(r.Context(), actorFrom(r), in)
	s.respond(w, http.StatusCreated, h, err)
}

func (s *Server) getHeirloom(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		h, err := s.Store.GetHeirloom(r.Context(), actorFrom(r), id)
		s.respond(w, http.StatusOK, h, err)
	}
}

func (s *Server) updateHeirloom(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in store.HeirloomInput
	if !decode(w, r, &in) {
		return
	}
	h, err := s.Store.UpdateHeirloom(r.Context(), actorFrom(r), id, in)
	s.respond(w, http.StatusOK, h, err)
}

func (s *Server) deleteHeirloom(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		s.noContent(w, s.Store.DeleteHeirloom(r.Context(), actorFrom(r), id))
	}
}
