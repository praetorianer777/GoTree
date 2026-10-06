package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/praetorianer777/gotree/internal/store"
)

func (s *Server) transcriptionRoutes(r chi.Router) {
	r.Get("/templates", s.listTemplates)
	r.Post("/templates", s.saveTemplate)
	r.Put("/templates/{id}", s.saveTemplate)
	r.Delete("/templates/{id}", s.deleteTemplate)
	r.Route("/transcriptions", func(r chi.Router) {
		r.Get("/", s.listTranscriptions)
		r.Post("/", s.createTranscription)
		r.Post("/match", s.matchRows)
		r.Get("/{id}", s.getTranscription)
		r.Put("/{id}", s.updateTranscription)
		r.Delete("/{id}", s.deleteTranscription)
		r.Post("/{id}/apply", s.applyTranscription)
	})
}

func (s *Server) listTemplates(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListTemplates(r.Context(), actorFrom(r))
	s.respond(w, http.StatusOK, list, err)
}

func (s *Server) saveTemplate(w http.ResponseWriter, r *http.Request) {
	var id int64
	status := http.StatusCreated
	if chi.URLParam(r, "id") != "" {
		var ok bool
		if id, ok = pathID(w, r, "id"); !ok {
			return
		}
		status = http.StatusOK
	}
	var in store.RecordTemplate
	if !decode(w, r, &in) {
		return
	}
	t, err := s.Store.SaveTemplate(r.Context(), actorFrom(r), id, in)
	s.respond(w, status, t, err)
}

func (s *Server) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		s.noContent(w, s.Store.DeleteTemplate(r.Context(), actorFrom(r), id))
	}
}

func (s *Server) listTranscriptions(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListTranscriptions(r.Context(), actorFrom(r))
	s.respond(w, http.StatusOK, list, err)
}

func (s *Server) createTranscription(w http.ResponseWriter, r *http.Request) {
	var in store.TranscriptionInput
	if !decode(w, r, &in) {
		return
	}
	t, err := s.Store.CreateTranscription(r.Context(), actorFrom(r), in)
	s.respond(w, http.StatusCreated, t, err)
}

func (s *Server) getTranscription(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		t, err := s.Store.GetTranscription(r.Context(), actorFrom(r), id)
		s.respond(w, http.StatusOK, t, err)
	}
}

func (s *Server) updateTranscription(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in store.TranscriptionInput
	if !decode(w, r, &in) {
		return
	}
	t, err := s.Store.UpdateTranscription(r.Context(), actorFrom(r), id, in)
	s.respond(w, http.StatusOK, t, err)
}

func (s *Server) deleteTranscription(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		s.noContent(w, s.Store.DeleteTranscription(r.Context(), actorFrom(r), id))
	}
}

func (s *Server) applyTranscription(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		res, err := s.Store.ApplyTranscription(r.Context(), actorFrom(r), id)
		s.respond(w, http.StatusOK, res, err)
	}
}

// matchRows is a POST because the rows of a whole record do not fit a URL;
// it changes nothing.
func (s *Server) matchRows(w http.ResponseWriter, r *http.Request) {
	var in store.MatchRequest
	if !decode(w, r, &in) {
		return
	}
	c, err := s.Store.Match(r.Context(), actorFrom(r), in)
	s.respond(w, http.StatusOK, c, err)
}
