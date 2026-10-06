package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// ResearchLink is what a task or log entry is about.
type ResearchLink struct {
	EntityType string `json:"entityType"`
	EntityID   int64  `json:"entityId"`
	// Label is the person's name, the source title or the place name.
	Label string `json:"label"`
}

// ResearchLinkInput names a linked person, source or place.
type ResearchLinkInput struct {
	EntityType string `json:"entityType"`
	EntityID   int64  `json:"entityId"`
}

// ResearchTask is a to-do of the research.
type ResearchTask struct {
	ID       int64  `json:"id"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	Priority string `json:"priority"`
	DueOn    string `json:"dueOn"`
	Notes    string `json:"notes"`
	// Origin is set for tasks made from a suggestion.
	Origin    string         `json:"origin"`
	DoneAt    *string        `json:"doneAt"`
	Links     []ResearchLink `json:"links"`
	LogCount  int            `json:"logCount"`
	CreatedAt string         `json:"createdAt"`
	UpdatedAt string         `json:"updatedAt"`
}

// ResearchTaskInput is the editable part of a task. Origin is only used
// when creating.
type ResearchTaskInput struct {
	Title    string              `json:"title"`
	Status   string              `json:"status"`
	Priority string              `json:"priority"`
	DueOn    string              `json:"dueOn"`
	Notes    string              `json:"notes"`
	Origin   string              `json:"origin"`
	Links    []ResearchLinkInput `json:"links"`
}

// LogEntry records one search, successful or not.
type LogEntry struct {
	ID         int64          `json:"id"`
	TaskID     *int64         `json:"taskId"`
	TaskTitle  string         `json:"taskTitle"`
	SearchedOn string         `json:"searchedOn"`
	Query      string         `json:"query"`
	Location   string         `json:"location"`
	Result     string         `json:"result"`
	Notes      string         `json:"notes"`
	Links      []ResearchLink `json:"links"`
	CreatedAt  string         `json:"createdAt"`
	UpdatedAt  string         `json:"updatedAt"`
}

// LogEntryInput is the editable part of a log entry.
type LogEntryInput struct {
	TaskID     *int64              `json:"taskId"`
	SearchedOn string              `json:"searchedOn"`
	Query      string              `json:"query"`
	Location   string              `json:"location"`
	Result     string              `json:"result"`
	Notes      string              `json:"notes"`
	Links      []ResearchLinkInput `json:"links"`
}

// ResearchFilter narrows task and log listings.
type ResearchFilter struct {
	// Status is a task status, "active" for open and in progress, or
	// empty for all.
	Status   string
	TaskID   int64
	PersonID int64
	Limit    int
}

var linkTables = map[string]string{"person": "persons", "source": "sources", "place": "places"}

func validDay(s string) bool {
	_, err := time.Parse(time.DateOnly, s)
	return err == nil
}

func (s *Store) validateLinks(ctx context.Context, q queryer, a Actor, v *validator, links []ResearchLinkInput) error {
	for _, l := range links {
		table, ok := linkTables[l.EntityType]
		if !ok {
			v.add("links", "unknown kind "+l.EntityType)
			continue
		}
		if err := requireInTree(ctx, q, table, l.EntityID, a.TreeID); errors.Is(err, ErrNotFound) {
			v.add("links", "a linked "+l.EntityType+" does not exist")
		} else if err != nil {
			return err
		}
	}
	return nil
}

func writeResearchLinks(ctx context.Context, tx *sql.Tx, owner string, id int64, links []ResearchLinkInput) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM research_links WHERE owner_type = ? AND owner_id = ?`, owner, id); err != nil {
		return err
	}
	for _, l := range links {
		if _, err := tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO research_links (owner_type, owner_id, entity_type, entity_id) VALUES (?, ?, ?, ?)`,
			owner, id, l.EntityType, l.EntityID); err != nil {
			return err
		}
	}
	return nil
}

// researchLinks loads the links of the given owners with their labels.
func (s *Store) researchLinks(ctx context.Context, q queryer, a Actor, owner string, ids []int64) (map[int64][]ResearchLink, error) {
	out := map[int64][]ResearchLink{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := q.QueryContext(ctx, `
		SELECT owner_id, entity_type, entity_id FROM research_links
		WHERE owner_type = ? AND owner_id IN (`+placeholders(len(ids))+`) ORDER BY entity_type, rowid`,
		append([]any{owner}, int64Args(ids)...)...)
	if err != nil {
		return nil, err
	}
	type row struct {
		owner int64
		link  ResearchLink
	}
	var found []row
	byType := map[string][]int64{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.owner, &r.link.EntityType, &r.link.EntityID); err != nil {
			rows.Close()
			return nil, err
		}
		found = append(found, r)
		byType[r.link.EntityType] = append(byType[r.link.EntityType], r.link.EntityID)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	labels := map[string]map[int64]string{"person": {}, "source": {}, "place": {}}
	persons, err := s.personRefs(ctx, q, a, byType["person"])
	if err != nil {
		return nil, err
	}
	for id, p := range persons {
		labels["person"][id] = strings.TrimSpace(p.GivenNames + " " + p.Surname)
	}
	places, err := placeRefs(ctx, q, a, byType["place"])
	if err != nil {
		return nil, err
	}
	for id, p := range places {
		labels["place"][id] = p.FullName
	}
	if src := byType["source"]; len(src) > 0 {
		rows, err := q.QueryContext(ctx, `SELECT id, title FROM sources WHERE tree_id = ? AND id IN (`+placeholders(len(src))+`)`,
			append([]any{a.TreeID}, int64Args(src)...)...)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var id int64
			var title string
			if err := rows.Scan(&id, &title); err != nil {
				rows.Close()
				return nil, err
			}
			labels["source"][id] = title
		}
		rows.Close()
	}
	for _, r := range found {
		r.link.Label = labels[r.link.EntityType][r.link.EntityID]
		out[r.owner] = append(out[r.owner], r.link)
	}
	return out, nil
}

func orEmptyLinks(l []ResearchLink) []ResearchLink {
	if l == nil {
		return []ResearchLink{}
	}
	return l
}

func (in *ResearchTaskInput) normalize() {
	in.Title = strings.TrimSpace(in.Title)
	in.Notes = strings.TrimSpace(in.Notes)
	in.Origin = strings.TrimSpace(in.Origin)
	if in.Status == "" {
		in.Status = "open"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
}

// originPattern matches the origins Suggestions and Checks hand out; the
// third part is the person the suggestion is about.
var originPattern = regexp.MustCompile(`^(?:missing:[a-z_]+|check:[a-z_]+):([0-9]+)(?::[0-9]+:[0-9]+)?$`)

func originPerson(origin string) int64 {
	m := originPattern.FindStringSubmatch(origin)
	if m == nil {
		return 0
	}
	id, _ := strconv.ParseInt(m[1], 10, 64)
	return id
}

func (s *Store) validateTask(ctx context.Context, q queryer, a Actor, in ResearchTaskInput) error {
	var v validator
	v.check(in.Title != "" && utf8.RuneCountInString(in.Title) <= 300, "title", "say what to find out, in at most 300 characters")
	v.check(oneOf(in.Status, "open", "in_progress", "done"), "status", "must be open, in_progress or done")
	v.check(oneOf(in.Priority, "low", "normal", "high"), "priority", "must be low, normal or high")
	v.check(in.DueOn == "" || validDay(in.DueOn), "dueOn", "must be a date")
	v.check(utf8.RuneCountInString(in.Notes) <= 10000, "notes", "is too long")
	if in.Origin != "" {
		if pid := originPerson(in.Origin); pid == 0 {
			v.add("origin", "is not a suggestion")
		} else if err := requireInTree(ctx, q, "persons", pid, a.TreeID); errors.Is(err, ErrNotFound) {
			v.add("origin", "names a person that does not exist")
		} else if err != nil {
			return err
		}
	}
	if err := s.validateLinks(ctx, q, a, &v, in.Links); err != nil {
		return err
	}
	return v.err()
}

// CreateTask adds a task. A task with the origin of an existing one is a
// conflict, so a suggestion cannot become two tasks.
func (s *Store) CreateTask(ctx context.Context, a Actor, in ResearchTaskInput) (ResearchTask, error) {
	in.normalize()
	var task ResearchTask
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := s.validateTask(ctx, tx, a, in); err != nil {
			return err
		}
		if in.Origin != "" {
			var one int
			err := tx.QueryRowContext(ctx, `SELECT 1 FROM research_tasks WHERE tree_id = ? AND origin = ? AND origin_person_id IS NOT NULL`,
				a.TreeID, in.Origin).Scan(&one)
			if err == nil {
				return fmt.Errorf("a task for this already exists: %w", ErrConflict)
			}
			if !errors.Is(err, sql.ErrNoRows) {
				return err
			}
		}
		now := s.now()
		res, err := tx.ExecContext(ctx, `
			INSERT INTO research_tasks (tree_id, title, status, priority, due_on, notes, origin, origin_person_id, done_at,
				created_at, updated_at, created_by, updated_by)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			a.TreeID, in.Title, in.Status, in.Priority, in.DueOn, in.Notes, in.Origin, nullID(originPerson(in.Origin)), doneAt(in.Status, now, nil),
			now, now, nullID(a.UserID), nullID(a.UserID))
		if err != nil {
			return err
		}
		id, _ := res.LastInsertId()
		if err := writeResearchLinks(ctx, tx, "task", id, in.Links); err != nil {
			return err
		}
		if task, err = s.getTask(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_task", id, "create", nil, task)
	})
	return task, err
}

// doneAt keeps the first completion time while a task stays done.
func doneAt(status, now string, previous *string) sql.NullString {
	switch {
	case status != "done":
		return sql.NullString{}
	case previous != nil:
		return sql.NullString{String: *previous, Valid: true}
	default:
		return sql.NullString{String: now, Valid: true}
	}
}

// UpdateTask replaces a task's fields and links.
func (s *Store) UpdateTask(ctx context.Context, a Actor, id int64, in ResearchTaskInput) (ResearchTask, error) {
	in.normalize()
	var task ResearchTask
	err := s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getTask(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if err := s.validateTask(ctx, tx, a, in); err != nil {
			return err
		}
		now := s.now()
		if _, err := tx.ExecContext(ctx, `
			UPDATE research_tasks SET title = ?, status = ?, priority = ?, due_on = ?, notes = ?, done_at = ?, updated_at = ?, updated_by = ?
			WHERE id = ? AND tree_id = ?`,
			in.Title, in.Status, in.Priority, in.DueOn, in.Notes, doneAt(in.Status, now, before.DoneAt), now, nullID(a.UserID),
			id, a.TreeID); err != nil {
			return err
		}
		if err := writeResearchLinks(ctx, tx, "task", id, in.Links); err != nil {
			return err
		}
		if task, err = s.getTask(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_task", id, "update", before, task)
	})
	return task, err
}

// DeleteTask removes a task; its log entries stay, without the task.
func (s *Store) DeleteTask(ctx context.Context, a Actor, id int64) error {
	return s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getTask(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM research_tasks WHERE id = ? AND tree_id = ?`, id, a.TreeID); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_task", id, "delete", before, nil)
	})
}

func (s *Store) getTask(ctx context.Context, q queryer, a Actor, id int64) (ResearchTask, error) {
	tasks, err := s.tasks(ctx, q, a, `t.id = ?`, []any{id}, 1)
	if err != nil {
		return ResearchTask{}, err
	}
	if len(tasks) == 0 {
		return ResearchTask{}, ErrNotFound
	}
	return tasks[0], nil
}

// ListTasks lists tasks: unfinished first, then by due day (tasks without
// one last), priority and age.
func (s *Store) ListTasks(ctx context.Context, a Actor, f ResearchFilter) ([]ResearchTask, error) {
	where, args := []string{"1 = 1"}, []any{}
	switch f.Status {
	case "":
	case "active":
		where = append(where, `t.status <> 'done'`)
	default:
		where = append(where, `t.status = ?`)
		args = append(args, f.Status)
	}
	if f.PersonID != 0 {
		where = append(where, `EXISTS (SELECT 1 FROM research_links l WHERE l.owner_type = 'task' AND l.owner_id = t.id AND l.entity_type = 'person' AND l.entity_id = ?)`)
		args = append(args, f.PersonID)
	}
	return s.tasks(ctx, s.DB, a, strings.Join(where, " AND "), args, f.Limit)
}

func (s *Store) tasks(ctx context.Context, q queryer, a Actor, where string, args []any, limit int) ([]ResearchTask, error) {
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	rows, err := q.QueryContext(ctx, `
		SELECT t.id, t.title, t.status, t.priority, t.due_on, t.notes, t.origin, t.done_at, t.created_at, t.updated_at,
			(SELECT count(*) FROM research_log g WHERE g.task_id = t.id)
		FROM research_tasks t WHERE t.tree_id = ? AND `+where+`
		ORDER BY t.status = 'done', t.due_on = '', t.due_on,
			CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, t.created_at, t.id
		LIMIT ?`, append(append([]any{a.TreeID}, args...), limit)...)
	if err != nil {
		return nil, err
	}
	tasks := []ResearchTask{}
	var ids []int64
	for rows.Next() {
		var t ResearchTask
		var done sql.NullString
		if err := rows.Scan(&t.ID, &t.Title, &t.Status, &t.Priority, &t.DueOn, &t.Notes, &t.Origin, &done,
			&t.CreatedAt, &t.UpdatedAt, &t.LogCount); err != nil {
			rows.Close()
			return nil, err
		}
		t.DoneAt = strPtr(done)
		tasks = append(tasks, t)
		ids = append(ids, t.ID)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	links, err := s.researchLinks(ctx, q, a, "task", ids)
	if err != nil {
		return nil, err
	}
	for i := range tasks {
		tasks[i].Links = orEmptyLinks(links[tasks[i].ID])
	}
	return tasks, nil
}

func (in *LogEntryInput) normalize() {
	in.Query = strings.TrimSpace(in.Query)
	in.Location = strings.TrimSpace(in.Location)
	in.Notes = strings.TrimSpace(in.Notes)
}

func (s *Store) validateLog(ctx context.Context, q queryer, a Actor, in LogEntryInput) error {
	var v validator
	v.check(in.Query != "" && utf8.RuneCountInString(in.Query) <= 500, "query", "say what you searched for, in at most 500 characters")
	v.check(validDay(in.SearchedOn), "searchedOn", "must be a date")
	v.check(utf8.RuneCountInString(in.Location) <= 300, "location", "is too long")
	v.check(oneOf(in.Result, "found", "not_found", "partial"), "result", "must be found, not_found or partial")
	v.check(utf8.RuneCountInString(in.Notes) <= 10000, "notes", "is too long")
	if in.TaskID != nil {
		if err := requireInTree(ctx, q, "research_tasks", *in.TaskID, a.TreeID); errors.Is(err, ErrNotFound) {
			v.add("taskId", "does not exist")
		} else if err != nil {
			return err
		}
	}
	if err := s.validateLinks(ctx, q, a, &v, in.Links); err != nil {
		return err
	}
	return v.err()
}

// CreateLogEntry records a search.
func (s *Store) CreateLogEntry(ctx context.Context, a Actor, in LogEntryInput) (LogEntry, error) {
	in.normalize()
	var e LogEntry
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := s.validateLog(ctx, tx, a, in); err != nil {
			return err
		}
		now := s.now()
		res, err := tx.ExecContext(ctx, `
			INSERT INTO research_log (tree_id, task_id, searched_on, query, location, result, notes, created_at, updated_at, created_by, updated_by)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			a.TreeID, nullIDPtr(in.TaskID), in.SearchedOn, in.Query, in.Location, in.Result, in.Notes, now, now, nullID(a.UserID), nullID(a.UserID))
		if err != nil {
			return err
		}
		id, _ := res.LastInsertId()
		if err := writeResearchLinks(ctx, tx, "log", id, in.Links); err != nil {
			return err
		}
		if e, err = s.getLogEntry(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_log", id, "create", nil, e)
	})
	return e, err
}

// UpdateLogEntry replaces a log entry.
func (s *Store) UpdateLogEntry(ctx context.Context, a Actor, id int64, in LogEntryInput) (LogEntry, error) {
	in.normalize()
	var e LogEntry
	err := s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getLogEntry(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if err := s.validateLog(ctx, tx, a, in); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			UPDATE research_log SET task_id = ?, searched_on = ?, query = ?, location = ?, result = ?, notes = ?, updated_at = ?, updated_by = ?
			WHERE id = ? AND tree_id = ?`,
			nullIDPtr(in.TaskID), in.SearchedOn, in.Query, in.Location, in.Result, in.Notes, s.now(), nullID(a.UserID), id, a.TreeID); err != nil {
			return err
		}
		if err := writeResearchLinks(ctx, tx, "log", id, in.Links); err != nil {
			return err
		}
		if e, err = s.getLogEntry(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_log", id, "update", before, e)
	})
	return e, err
}

// DeleteLogEntry removes a log entry.
func (s *Store) DeleteLogEntry(ctx context.Context, a Actor, id int64) error {
	return s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getLogEntry(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM research_log WHERE id = ? AND tree_id = ?`, id, a.TreeID); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "research_log", id, "delete", before, nil)
	})
}

func (s *Store) getLogEntry(ctx context.Context, q queryer, a Actor, id int64) (LogEntry, error) {
	entries, err := s.logEntries(ctx, q, a, `g.id = ?`, []any{id}, 1)
	if err != nil {
		return LogEntry{}, err
	}
	if len(entries) == 0 {
		return LogEntry{}, ErrNotFound
	}
	return entries[0], nil
}

// ListLog lists log entries, newest search first.
func (s *Store) ListLog(ctx context.Context, a Actor, f ResearchFilter) ([]LogEntry, error) {
	where, args := []string{"1 = 1"}, []any{}
	if f.TaskID != 0 {
		where = append(where, `g.task_id = ?`)
		args = append(args, f.TaskID)
	}
	if f.PersonID != 0 {
		// A search counts for a person when it is linked to them, or its
		// task is.
		where = append(where, `(EXISTS (SELECT 1 FROM research_links l WHERE l.owner_type = 'log' AND l.owner_id = g.id AND l.entity_type = 'person' AND l.entity_id = ?)
			OR EXISTS (SELECT 1 FROM research_links l WHERE l.owner_type = 'task' AND l.owner_id = g.task_id AND l.entity_type = 'person' AND l.entity_id = ?))`)
		args = append(args, f.PersonID, f.PersonID)
	}
	return s.logEntries(ctx, s.DB, a, strings.Join(where, " AND "), args, f.Limit)
}

func (s *Store) logEntries(ctx context.Context, q queryer, a Actor, where string, args []any, limit int) ([]LogEntry, error) {
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	rows, err := q.QueryContext(ctx, `
		SELECT g.id, g.task_id, coalesce(t.title, ''), g.searched_on, g.query, g.location, g.result, g.notes, g.created_at, g.updated_at
		FROM research_log g LEFT JOIN research_tasks t ON t.id = g.task_id
		WHERE g.tree_id = ? AND `+where+` ORDER BY g.searched_on DESC, g.id DESC LIMIT ?`,
		append(append([]any{a.TreeID}, args...), limit)...)
	if err != nil {
		return nil, err
	}
	entries := []LogEntry{}
	var ids []int64
	for rows.Next() {
		var e LogEntry
		var task sql.NullInt64
		if err := rows.Scan(&e.ID, &task, &e.TaskTitle, &e.SearchedOn, &e.Query, &e.Location, &e.Result, &e.Notes,
			&e.CreatedAt, &e.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		e.TaskID = ptrID(task)
		entries = append(entries, e)
		ids = append(ids, e.ID)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	links, err := s.researchLinks(ctx, q, a, "log", ids)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		entries[i].Links = orEmptyLinks(links[entries[i].ID])
	}
	return entries, nil
}
