package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/praetorianer777/gotree/internal/store"
)

func (s *Server) researchRoutes(r chi.Router) {
	r.Route("/research", func(r chi.Router) {
		r.Get("/tasks", s.listTasks)
		r.Post("/tasks", s.createTask)
		r.Put("/tasks/{id}", s.updateTask)
		r.Delete("/tasks/{id}", s.deleteTask)
		r.Get("/log", s.listLog)
		r.Post("/log", s.createLogEntry)
		r.Put("/log/{id}", s.updateLogEntry)
		r.Delete("/log/{id}", s.deleteLogEntry)
		r.Get("/suggestions", s.suggestions)
	})
}

func researchFilter(r *http.Request) store.ResearchFilter {
	return store.ResearchFilter{
		Status:   r.URL.Query().Get("status"),
		TaskID:   int64(queryInt(r, "task", 0)),
		PersonID: int64(queryInt(r, "person", 0)),
		Limit:    queryInt(r, "limit", 0),
	}
}

func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := s.Store.ListTasks(r.Context(), actorFrom(r), researchFilter(r))
	s.respond(w, http.StatusOK, tasks, err)
}

func (s *Server) createTask(w http.ResponseWriter, r *http.Request) {
	var in store.ResearchTaskInput
	if !decode(w, r, &in) {
		return
	}
	t, err := s.Store.CreateTask(r.Context(), actorFrom(r), in)
	s.respond(w, http.StatusCreated, t, err)
}

func (s *Server) updateTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in store.ResearchTaskInput
	if !decode(w, r, &in) {
		return
	}
	t, err := s.Store.UpdateTask(r.Context(), actorFrom(r), id, in)
	s.respond(w, http.StatusOK, t, err)
}

func (s *Server) deleteTask(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		s.noContent(w, s.Store.DeleteTask(r.Context(), actorFrom(r), id))
	}
}

func (s *Server) listLog(w http.ResponseWriter, r *http.Request) {
	entries, err := s.Store.ListLog(r.Context(), actorFrom(r), researchFilter(r))
	s.respond(w, http.StatusOK, entries, err)
}

func (s *Server) createLogEntry(w http.ResponseWriter, r *http.Request) {
	var in store.LogEntryInput
	if !decode(w, r, &in) {
		return
	}
	e, err := s.Store.CreateLogEntry(r.Context(), actorFrom(r), in)
	s.respond(w, http.StatusCreated, e, err)
}

func (s *Server) updateLogEntry(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in store.LogEntryInput
	if !decode(w, r, &in) {
		return
	}
	e, err := s.Store.UpdateLogEntry(r.Context(), actorFrom(r), id, in)
	s.respond(w, http.StatusOK, e, err)
}

func (s *Server) deleteLogEntry(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathID(w, r, "id"); ok {
		s.noContent(w, s.Store.DeleteLogEntry(r.Context(), actorFrom(r), id))
	}
}

func (s *Server) suggestions(w http.ResponseWriter, r *http.Request) {
	rep, err := s.Store.Suggestions(r.Context(), actorFrom(r), int64(queryInt(r, "person", 0)))
	s.respond(w, http.StatusOK, rep, err)
}
