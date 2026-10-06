package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Role kinds of a record template.
const (
	// RoleKindPrincipal is the person the event is about: the head of a
	// census household, the baptized child, the deceased.
	RoleKindPrincipal = "principal"
	// RoleKindPartner is one of the couple of a family event (marriage).
	RoleKindPartner = "partner"
	// RoleKindParent is a parent of the principal; applying links them as
	// the principal's parents when none are recorded yet.
	RoleKindParent = "parent"
	// RoleKindParticipant takes part in the event with its participant role.
	RoleKindParticipant = "participant"
)

// Column kinds; each may appear once in a template.
var columnKinds = []string{"given", "surname", "sex", "age", "occupation", "residence", "birthplace", "notes"}

// TemplateRole is a role a row of the record can have.
type TemplateRole struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Kind  string `json:"kind"`
	// Participant is the event participant role for parent and participant
	// kinds (one of the participant roles of events).
	Participant string `json:"participant"`
}

// RecordTemplate describes a kind of record: the event it documents, the
// roles people have in it and the columns transcribed per person.
type RecordTemplate struct {
	// Key is a built-in name or "custom:<id>".
	Key     string `json:"key"`
	Name    string `json:"name"`
	Builtin bool   `json:"builtin"`
	// EventType is the GEDCOM tag of the event, EVEN for others.
	EventType string         `json:"eventType"`
	Roles     []TemplateRole `json:"roles"`
	Columns   []string       `json:"columns"`
}

func role(key, kind, participant string) TemplateRole {
	return TemplateRole{Key: key, Kind: kind, Participant: participant}
}

// builtinTemplates are offered in every tree. Their labels are translated
// by the client, keyed by template and role key.
var builtinTemplates = []RecordTemplate{
	{
		Key: "census", EventType: "CENS",
		Roles: []TemplateRole{
			role("head", RoleKindPrincipal, ""), role("spouse", RoleKindParticipant, "spouse"),
			role("child", RoleKindParticipant, "child"), role("parent", RoleKindParticipant, "parent"),
			role("sibling", RoleKindParticipant, "sibling"), role("relative", RoleKindParticipant, "relative"),
			role("lodger", RoleKindParticipant, "other"), role("servant", RoleKindParticipant, "other"),
		},
		Columns: []string{"given", "surname", "sex", "age", "occupation", "birthplace"},
	},
	{
		Key: "baptism", EventType: "BAPM",
		Roles: []TemplateRole{
			role("child", RoleKindPrincipal, ""), role("father", RoleKindParent, "parent"),
			role("mother", RoleKindParent, "parent"), role("godparent", RoleKindParticipant, "godparent"),
			role("clergy", RoleKindParticipant, "clergy"),
		},
		Columns: []string{"given", "surname", "sex", "occupation", "residence", "notes"},
	},
	{
		Key: "marriage", EventType: "MARR",
		Roles: []TemplateRole{
			role("groom", RoleKindPartner, ""), role("bride", RoleKindPartner, ""),
			role("groomParent", RoleKindParticipant, "parent"), role("brideParent", RoleKindParticipant, "parent"),
			role("witness", RoleKindParticipant, "witness"), role("officiant", RoleKindParticipant, "officiant"),
		},
		Columns: []string{"given", "surname", "age", "occupation", "residence", "birthplace"},
	},
	{
		Key: "burial", EventType: "BURI",
		Roles: []TemplateRole{
			role("deceased", RoleKindPrincipal, ""), role("spouse", RoleKindParticipant, "spouse"),
			role("informant", RoleKindParticipant, "informant"), role("clergy", RoleKindParticipant, "clergy"),
		},
		Columns: []string{"given", "surname", "sex", "age", "occupation", "residence", "notes"},
	},
	{
		Key: "death", EventType: "DEAT",
		Roles: []TemplateRole{
			role("deceased", RoleKindPrincipal, ""), role("spouse", RoleKindParticipant, "spouse"),
			role("informant", RoleKindParticipant, "informant"),
		},
		Columns: []string{"given", "surname", "sex", "age", "occupation", "residence", "notes"},
	},
	{
		Key: "free", EventType: "EVEN",
		Roles: []TemplateRole{
			role("person", RoleKindPrincipal, ""), role("other", RoleKindParticipant, "other"),
		},
		Columns: []string{"given", "surname", "sex", "age", "notes"},
	},
}

func init() {
	for i := range builtinTemplates {
		builtinTemplates[i].Builtin = true
		builtinTemplates[i].Name = builtinTemplates[i].Key
	}
}

// ListTemplates returns the built-in templates and the tree's own.
func (s *Store) ListTemplates(ctx context.Context, a Actor) ([]RecordTemplate, error) {
	out := append([]RecordTemplate{}, builtinTemplates...)
	rows, err := s.DB.QueryContext(ctx, `SELECT id, definition FROM record_templates WHERE tree_id = ? ORDER BY name, id`, a.TreeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var def string
		if err := rows.Scan(&id, &def); err != nil {
			return nil, err
		}
		t, err := decodeTemplate(id, def)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func decodeTemplate(id int64, def string) (RecordTemplate, error) {
	var t RecordTemplate
	if err := json.Unmarshal([]byte(def), &t); err != nil {
		return RecordTemplate{}, err
	}
	t.Key, t.Builtin = "custom:"+strconv.FormatInt(id, 10), false
	return t, nil
}

func (s *Store) template(ctx context.Context, q queryer, a Actor, key string) (RecordTemplate, error) {
	for _, t := range builtinTemplates {
		if t.Key == key {
			return t, nil
		}
	}
	id, err := strconv.ParseInt(strings.TrimPrefix(key, "custom:"), 10, 64)
	if !strings.HasPrefix(key, "custom:") || err != nil {
		return RecordTemplate{}, ErrNotFound
	}
	var def string
	err = q.QueryRowContext(ctx, `SELECT definition FROM record_templates WHERE id = ? AND tree_id = ?`, id, a.TreeID).Scan(&def)
	if errors.Is(err, sql.ErrNoRows) {
		return RecordTemplate{}, ErrNotFound
	}
	if err != nil {
		return RecordTemplate{}, err
	}
	return decodeTemplate(id, def)
}

func validateTemplate(t RecordTemplate) error {
	var v validator
	v.check(t.Name != "" && utf8.RuneCountInString(t.Name) <= 120, "name", "give the template a name of at most 120 characters")
	v.check(eventTypePattern.MatchString(t.EventType), "eventType", "must be a GEDCOM tag such as CENS, or a custom tag starting with _")
	family := familyEventTypes[t.EventType]
	keys := map[string]bool{}
	kinds := map[string]int{}
	for _, r := range t.Roles {
		v.check(r.Key != "" && !keys[r.Key], "roles", "every role needs its own key")
		keys[r.Key] = true
		v.check(r.Label != "" && utf8.RuneCountInString(r.Label) <= 60, "roles", "every role needs a name of at most 60 characters")
		v.check(oneOf(r.Kind, RoleKindPrincipal, RoleKindPartner, RoleKindParent, RoleKindParticipant), "roles", "unknown kind "+r.Kind)
		if r.Kind == RoleKindParent || r.Kind == RoleKindParticipant {
			v.check(oneOf(r.Participant, participantRoles...), "roles", "unknown participant role "+r.Participant)
		}
		kinds[r.Kind]++
	}
	if family {
		v.check(kinds[RoleKindPartner] == 2 && kinds[RoleKindPrincipal] == 0, "roles", "a family event needs two partner roles and no principal")
	} else {
		v.check(kinds[RoleKindPrincipal] == 1 && kinds[RoleKindPartner] == 0, "roles", "the event needs exactly one principal role")
	}
	seen := map[string]bool{}
	for _, c := range t.Columns {
		v.check(oneOf(c, columnKinds...) && !seen[c], "columns", "unknown or repeated column "+c)
		seen[c] = true
	}
	v.check(seen["given"] || seen["surname"], "columns", "a template needs a name column")
	return v.err()
}

// SaveTemplate creates (id 0) or replaces a custom template.
func (s *Store) SaveTemplate(ctx context.Context, a Actor, id int64, t RecordTemplate) (RecordTemplate, error) {
	t.Name = strings.TrimSpace(t.Name)
	t.EventType = strings.ToUpper(strings.TrimSpace(t.EventType))
	for i := range t.Roles {
		t.Roles[i].Label = strings.TrimSpace(t.Roles[i].Label)
		if t.Roles[i].Kind == RoleKindPrincipal || t.Roles[i].Kind == RoleKindPartner {
			t.Roles[i].Participant = ""
		}
	}
	if err := validateTemplate(t); err != nil {
		return RecordTemplate{}, err
	}
	t.Key, t.Builtin = "", false
	def, err := json.Marshal(t)
	if err != nil {
		return RecordTemplate{}, err
	}
	err = s.tx(ctx, func(tx *sql.Tx) error {
		now := s.now()
		if id == 0 {
			res, err := tx.ExecContext(ctx, `
				INSERT INTO record_templates (tree_id, name, definition, created_at, updated_at, created_by, updated_by)
				VALUES (?, ?, ?, ?, ?, ?, ?)`, a.TreeID, t.Name, string(def), now, now, nullID(a.UserID), nullID(a.UserID))
			if err != nil {
				return err
			}
			id, _ = res.LastInsertId()
			return s.logChange(ctx, tx, a, "record_template", id, "create", nil, t)
		}
		res, err := tx.ExecContext(ctx, `UPDATE record_templates SET name = ?, definition = ?, updated_at = ?, updated_by = ? WHERE id = ? AND tree_id = ?`,
			t.Name, string(def), now, nullID(a.UserID), id, a.TreeID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return s.logChange(ctx, tx, a, "record_template", id, "update", nil, t)
	})
	if err != nil {
		return RecordTemplate{}, err
	}
	t.Key = "custom:" + strconv.FormatInt(id, 10)
	return t, nil
}

// DeleteTemplate removes a custom template. Transcriptions using it are a
// conflict, since they could no longer be read.
func (s *Store) DeleteTemplate(ctx context.Context, a Actor, id int64) error {
	return s.tx(ctx, func(tx *sql.Tx) error {
		var used int
		if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM transcriptions WHERE tree_id = ? AND template_key = ?`,
			a.TreeID, "custom:"+strconv.FormatInt(id, 10)).Scan(&used); err != nil {
			return err
		}
		if used > 0 {
			return ErrConflict
		}
		res, err := tx.ExecContext(ctx, `DELETE FROM record_templates WHERE id = ? AND tree_id = ?`, id, a.TreeID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return s.logChange(ctx, tx, a, "record_template", id, "delete", nil, nil)
	})
}
