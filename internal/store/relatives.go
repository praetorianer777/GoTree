package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// Relations accepted by AddRelative.
const (
	RelationParent  = "parent"
	RelationPartner = "partner"
	RelationChild   = "child"
	RelationSibling = "sibling"
)

// RelativeInput adds a relative to a person: either an existing person
// (PersonID) or a new one (Person).
type RelativeInput struct {
	Relation string       `json:"relation"`
	PersonID *int64       `json:"personId"`
	Person   *PersonInput `json:"person"`
	// FamilyID picks the family when the person has several that fit: the
	// parent family for a parent or sibling, the partner family for a child.
	FamilyID *int64 `json:"familyId"`
	// UnionType is used for a new partner; "married" also creates the
	// marriage event, so its date can be filled in right away.
	UnionType string `json:"unionType"`
	// ChildRelation is how the child relates to the parent being linked:
	// birth (default), adopted, foster, …
	ChildRelation string `json:"childRelation"`
}

// RelativeResult is the relative and the family that connects them.
type RelativeResult struct {
	Person Person `json:"person"`
	Family Family `json:"family"`
}

// AddRelative links a new or existing person to personID as a parent,
// partner, child or sibling, creating the connecting family when needed.
// Relatives can be added in any order: a sibling of someone without known
// parents gets a family whose parents are both unknown, and a child of
// someone without a known partner gets a family with an unknown other
// parent. Everything happens in one transaction.
func (s *Store) AddRelative(ctx context.Context, a Actor, personID int64, in RelativeInput) (RelativeResult, error) {
	in.Relation = strings.ToLower(strings.TrimSpace(in.Relation))
	in.UnionType = strings.ToLower(strings.TrimSpace(in.UnionType))
	in.ChildRelation = strings.ToLower(strings.TrimSpace(in.ChildRelation))
	if in.UnionType == "" {
		in.UnionType = "married"
	}
	if in.ChildRelation == "" {
		in.ChildRelation = "birth"
	}

	var v validator
	v.check(oneOf(in.Relation, RelationParent, RelationPartner, RelationChild, RelationSibling), "relation", "must be parent, partner, child or sibling")
	v.check((in.PersonID == nil) != (in.Person == nil), "person", "give either an existing person or a new one")
	v.check(oneOf(in.UnionType, "married", "partners", "unknown"), "unionType", "must be married, partners or unknown")
	v.check(oneOf(in.ChildRelation, childRelations...), "childRelation", "unknown relation")
	if in.PersonID != nil {
		v.check(*in.PersonID != personID, "personId", "a person cannot be their own relative")
	}
	if err := v.err(); err != nil {
		return RelativeResult{}, err
	}

	var res RelativeResult
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := requireInTree(ctx, tx, "persons", personID, a.TreeID); err != nil {
			return err
		}

		var relative Person
		var err error
		if in.PersonID != nil {
			if err := requireInTree(ctx, tx, "persons", *in.PersonID, a.TreeID); errors.Is(err, ErrNotFound) {
				return &ValidationError{Fields: map[string]string{"personId": "does not exist"}}
			} else if err != nil {
				return err
			}
			if relative, err = s.getPerson(ctx, tx, a, *in.PersonID); err != nil {
				return err
			}
		} else if relative, err = s.createPerson(ctx, tx, a, *in.Person); err != nil {
			return err
		}

		var fam Family
		switch in.Relation {
		case RelationPartner:
			fam, err = s.createFamily(ctx, tx, a, FamilyInput{Partner1ID: &personID, Partner2ID: &relative.ID, UnionType: in.UnionType})
			if err == nil && in.UnionType == "married" {
				_, err = s.createEvent(ctx, tx, a, EventInput{FamilyID: &fam.ID, Type: "MARR"})
			}
		case RelationChild:
			fam, err = s.familyFor(ctx, tx, a, personID, in.FamilyID, `(f.partner1_id = ? OR f.partner2_id = ?)`,
				FamilyInput{Partner1ID: &personID}, nil)
			if err == nil {
				fam, err = s.setChild(ctx, tx, a, fam.ID, relative.ID, s.childInputFor(fam, personID, in.ChildRelation))
			}
		case RelationParent:
			fam, err = s.familyFor(ctx, tx, a, personID, in.FamilyID,
				`f.id IN (SELECT family_id FROM family_children WHERE child_id = ?)`, FamilyInput{}, &personID)
			if err == nil {
				fam, err = s.addParent(ctx, tx, a, fam, personID, relative.ID, in.ChildRelation)
			}
		case RelationSibling:
			fam, err = s.familyFor(ctx, tx, a, personID, in.FamilyID,
				`f.id IN (SELECT family_id FROM family_children WHERE child_id = ?)`, FamilyInput{}, &personID)
			if err == nil {
				fam, err = s.setChild(ctx, tx, a, fam.ID, relative.ID, ChildInput{})
			}
		}
		if err != nil {
			return err
		}

		// Re-read so the result reflects the new links (e.g. living state
		// does not change, but the family now lists everyone).
		if fam, err = s.getFamily(ctx, tx, a, fam.ID); err != nil {
			return err
		}
		if relative, err = s.getPerson(ctx, tx, a, relative.ID); err != nil {
			return err
		}
		res = RelativeResult{Person: relative, Family: fam}
		return nil
	})
	return res, err
}

// familyFor picks the family a relative goes into: the requested one (which
// must be among the candidates), the only candidate, or a newly created
// one when there is none. With several candidates and no choice it asks
// the caller to pick. childOf, when set, is added as a child of a newly
// created family.
func (s *Store) familyFor(ctx context.Context, tx *sql.Tx, a Actor, personID int64, requested *int64, where string, create FamilyInput, childOf *int64) (Family, error) {
	args := []any{personID}
	if strings.Count(where, "?") == 2 {
		args = append(args, personID)
	}
	candidates, err := s.loadFamilies(ctx, tx, a, where, args...)
	if err != nil {
		return Family{}, err
	}
	if requested != nil {
		for _, f := range candidates {
			if f.ID == *requested {
				return f, nil
			}
		}
		return Family{}, &ValidationError{Fields: map[string]string{"familyId": "is not one of this person's families"}}
	}
	switch len(candidates) {
	case 1:
		return candidates[0], nil
	case 0:
		f, err := s.createFamily(ctx, tx, a, create)
		if err != nil || childOf == nil {
			return f, err
		}
		return s.setChild(ctx, tx, a, f.ID, *childOf, ChildInput{})
	default:
		return Family{}, &ValidationError{Fields: map[string]string{"familyId": "this person has several families; choose one"}}
	}
}

// childInputFor sets the given relation towards parentID's side of the
// family and birth towards the other side.
func (s *Store) childInputFor(f Family, parentID int64, relation string) ChildInput {
	in := ChildInput{RelationPartner1: "birth", RelationPartner2: "birth"}
	if f.Partner2 != nil && f.Partner2.ID == parentID {
		in.RelationPartner2 = relation
	} else {
		in.RelationPartner1 = relation
	}
	return in
}

// addParent puts parentID into a free partner slot of the family and
// records how childID relates to that parent.
func (s *Store) addParent(ctx context.Context, tx *sql.Tx, a Actor, f Family, childID, parentID int64, relation string) (Family, error) {
	in := FamilyInput{UnionType: f.UnionType, Notes: f.Notes}
	if f.Partner1 != nil {
		in.Partner1ID = &f.Partner1.ID
	}
	if f.Partner2 != nil {
		in.Partner2ID = &f.Partner2.ID
	}
	slot := "relation_partner1"
	switch {
	case in.Partner1ID == nil:
		in.Partner1ID = &parentID
	case in.Partner2ID == nil:
		in.Partner2ID = &parentID
		slot = "relation_partner2"
	default:
		return Family{}, &ValidationError{Fields: map[string]string{"relation": "both parents in this family are already known"}}
	}
	if err := s.validateFamily(ctx, tx, a, f.ID, in); err != nil {
		return Family{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE families SET partner1_id = ?, partner2_id = ?, updated_at = ?, updated_by = ? WHERE id = ? AND tree_id = ?`,
		nullIDPtr(in.Partner1ID), nullIDPtr(in.Partner2ID), s.now(), nullID(a.UserID), f.ID, a.TreeID); err != nil {
		return Family{}, err
	}
	// slot is one of two fixed column names, never user input.
	if _, err := tx.ExecContext(ctx, `UPDATE family_children SET `+slot+` = ? WHERE family_id = ? AND child_id = ?`,
		relation, f.ID, childID); err != nil {
		return Family{}, err
	}
	after, err := s.getFamily(ctx, tx, a, f.ID)
	if err != nil {
		return Family{}, err
	}
	return after, s.logChange(ctx, tx, a, "family", f.ID, "update", f, after)
}
