package store

import (
	"context"
	"fmt"
)

// Suggestion is research worth doing for a person: a key fact that is
// missing or unsourced, or a consistency finding to resolve.
type Suggestion struct {
	// Origin identifies the suggestion; a task made from it carries it.
	Origin string `json:"origin"`
	// Kind is missing_birth, birth_unsourced, missing_death or finding.
	Kind     string       `json:"kind"`
	PersonID int64        `json:"personId"`
	Finding  *FindingView `json:"finding,omitempty"`
}

// SuggestionReport lists suggestions with the people findings name.
type SuggestionReport struct {
	Suggestions []Suggestion        `json:"suggestions"`
	Persons     map[int64]PersonRef `json:"persons"`
}

// Suggestions lists what is worth researching for a person, leaving out
// suggestions that already became a task.
func (s *Store) Suggestions(ctx context.Context, a Actor, personID int64) (SuggestionReport, error) {
	if personID <= 0 {
		return SuggestionReport{}, ErrNotFound
	}
	checks, err := s.Checks(ctx, a, personID)
	if err != nil {
		return SuggestionReport{}, err
	}
	var hasBirth, birthSourced, hasDeath bool
	err = s.DB.QueryRowContext(ctx, `
		SELECT
			EXISTS (SELECT 1 FROM events WHERE person_id = ?1 AND type IN ('BIRT', 'CHR', 'BAPM') AND status <> 'disproven'),
			EXISTS (SELECT 1 FROM events e JOIN citation_links l ON l.entity_type = 'event' AND l.entity_id = e.id
				WHERE e.person_id = ?1 AND e.type IN ('BIRT', 'CHR', 'BAPM') AND e.status <> 'disproven'),
			EXISTS (SELECT 1 FROM events WHERE person_id = ?1 AND type IN ('DEAT', 'BURI', 'CREM') AND status <> 'disproven')`,
		personID).Scan(&hasBirth, &birthSourced, &hasDeath)
	if err != nil {
		return SuggestionReport{}, err
	}
	refs, err := s.personRefs(ctx, s.DB, a, []int64{personID})
	if err != nil {
		return SuggestionReport{}, err
	}

	var all []Suggestion
	add := func(kind string) {
		all = append(all, Suggestion{Origin: fmt.Sprintf("missing:%s:%d", kind, personID), Kind: kind, PersonID: personID})
	}
	switch {
	case !hasBirth:
		add("missing_birth")
	case !birthSourced:
		add("birth_unsourced")
	}
	if !hasDeath && !refs[personID].Living {
		add("missing_death")
	}
	for i := range checks.Findings {
		f := checks.Findings[i]
		all = append(all, Suggestion{Origin: f.Origin, Kind: "finding", PersonID: personID, Finding: &f})
	}

	taken, err := s.taskOrigins(ctx, a, "")
	if err != nil {
		return SuggestionReport{}, err
	}
	rep := SuggestionReport{Suggestions: []Suggestion{}, Persons: checks.Persons}
	for _, sg := range all {
		if _, ok := taken[sg.Origin]; !ok {
			rep.Suggestions = append(rep.Suggestions, sg)
		}
	}
	if _, ok := rep.Persons[personID]; !ok {
		rep.Persons[personID] = refs[personID]
	}
	return rep, nil
}

// taskOrigins maps the origins starting with prefix to their task.
func (s *Store) taskOrigins(ctx context.Context, a Actor, prefix string) (map[string]int64, error) {
	rows, err := s.DB.QueryContext(ctx, `
		SELECT origin, id FROM research_tasks WHERE tree_id = ? AND origin_person_id IS NOT NULL AND substr(origin, 1, ?) = ?`,
		a.TreeID, len(prefix), prefix)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]int64{}
	for rows.Next() {
		var origin string
		var id int64
		if err := rows.Scan(&origin, &id); err != nil {
			return nil, err
		}
		out[origin] = id
	}
	return out, rows.Err()
}
