package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"unicode/utf8"
)

// ChildLink is a child in a family with its relation to each partner.
type ChildLink struct {
	Person           PersonRef `json:"person"`
	RelationPartner1 string    `json:"relationPartner1"`
	RelationPartner2 string    `json:"relationPartner2"`
	SortOrder        int       `json:"sortOrder"`
}

// Family is a couple (either partner may be unknown) and their children.
type Family struct {
	ID int64 `json:"id"`
	// A nil partner is unknown.
	Partner1  *PersonRef  `json:"partner1"`
	Partner2  *PersonRef  `json:"partner2"`
	UnionType string      `json:"unionType"`
	Notes     string      `json:"notes"`
	Children  []ChildLink `json:"children"`
	Events    []Event     `json:"events"`
	CreatedAt string      `json:"createdAt"`
	UpdatedAt string      `json:"updatedAt"`
}

// FamilyInput is the editable part of a Family.
type FamilyInput struct {
	Partner1ID *int64 `json:"partner1Id"`
	Partner2ID *int64 `json:"partner2Id"`
	UnionType  string `json:"unionType"`
	Notes      string `json:"notes"`
}

// ChildInput sets how a child relates to the partners of a family.
type ChildInput struct {
	RelationPartner1 string `json:"relationPartner1"`
	RelationPartner2 string `json:"relationPartner2"`
	SortOrder        *int   `json:"sortOrder"`
}

var childRelations = []string{"birth", "adopted", "foster", "step", "surrogate", "sealing", "unknown"}

func (in *FamilyInput) normalize() {
	in.UnionType = strings.ToLower(strings.TrimSpace(in.UnionType))
	if in.UnionType == "" {
		in.UnionType = "unknown"
	}
	in.Notes = strings.TrimSpace(in.Notes)
}

func (s *Store) validateFamily(ctx context.Context, q queryer, a Actor, familyID int64, in FamilyInput) error {
	var v validator
	v.check(oneOf(in.UnionType, "married", "partners", "unknown"), "unionType", "must be married, partners or unknown")
	v.check(utf8.RuneCountInString(in.Notes) <= 100_000, "notes", "is too long")
	if in.Partner1ID != nil && in.Partner2ID != nil {
		v.check(*in.Partner1ID != *in.Partner2ID, "partner2Id", "a person cannot be their own partner")
	}
	for field, id := range map[string]*int64{"partner1Id": in.Partner1ID, "partner2Id": in.Partner2ID} {
		if id == nil {
			continue
		}
		if err := requireInTree(ctx, q, "persons", *id, a.TreeID); errors.Is(err, ErrNotFound) {
			v.add(field, "does not exist")
			continue
		} else if err != nil {
			return err
		}
		if familyID == 0 {
			continue
		}
		// A partner may not also be a child, or a descendant of a child,
		// of the same family.
		children, err := queryIDs(ctx, q, `SELECT child_id FROM family_children WHERE family_id = ?`, familyID)
		if err != nil {
			return err
		}
		for _, c := range children {
			cyclic, err := isAncestor(ctx, q, c, *id)
			if err != nil {
				return err
			}
			if cyclic {
				v.add(field, "a person cannot be a parent of their own ancestor")
				break
			}
		}
	}
	return v.err()
}

// isAncestor reports whether ancestor is person or one of person's
// ancestors, following every kind of parent-child link.
func isAncestor(ctx context.Context, q queryer, ancestor, person int64) (bool, error) {
	if ancestor == person {
		return true, nil
	}
	var found int
	err := q.QueryRowContext(ctx, `
		WITH RECURSIVE up(id) AS (
			SELECT ?
			UNION
			SELECT parent.id FROM up
			JOIN family_children c ON c.child_id = up.id
			JOIN families f ON f.id = c.family_id
			JOIN persons parent ON parent.id IN (f.partner1_id, f.partner2_id)
		)
		SELECT count(*) FROM up WHERE id = ?`, person, ancestor).Scan(&found)
	return found > 0, err
}

// CreateFamily adds a family.
func (s *Store) CreateFamily(ctx context.Context, a Actor, in FamilyInput) (Family, error) {
	in.normalize()
	var f Family
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := s.validateFamily(ctx, tx, a, 0, in); err != nil {
			return err
		}
		now := s.now()
		res, err := tx.ExecContext(ctx, `
			INSERT INTO families (tree_id, partner1_id, partner2_id, union_type, notes, created_at, updated_at, created_by, updated_by)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			a.TreeID, nullIDPtr(in.Partner1ID), nullIDPtr(in.Partner2ID), in.UnionType, in.Notes, now, now,
			nullID(a.UserID), nullID(a.UserID))
		if err != nil {
			return err
		}
		id, _ := res.LastInsertId()
		if f, err = s.getFamily(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "family", id, "create", nil, f)
	})
	return f, err
}

// UpdateFamily replaces the partners, union type and notes of a family.
func (s *Store) UpdateFamily(ctx context.Context, a Actor, id int64, in FamilyInput) (Family, error) {
	in.normalize()
	var f Family
	err := s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getFamily(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if err := s.validateFamily(ctx, tx, a, id, in); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `
			UPDATE families SET partner1_id = ?, partner2_id = ?, union_type = ?, notes = ?, updated_at = ?, updated_by = ?
			WHERE id = ? AND tree_id = ?`,
			nullIDPtr(in.Partner1ID), nullIDPtr(in.Partner2ID), in.UnionType, in.Notes, s.now(), nullID(a.UserID), id, a.TreeID)
		if err != nil {
			return err
		}
		if f, err = s.getFamily(ctx, tx, a, id); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "family", id, "update", before, f)
	})
	return f, err
}

// DeleteFamily removes a family with its events. The people stay.
func (s *Store) DeleteFamily(ctx context.Context, a Actor, id int64) error {
	return s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getFamily(ctx, tx, a, id)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM families WHERE id = ? AND tree_id = ?`, id, a.TreeID); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "family", id, "delete", before, nil)
	})
}

// SetChild adds a child to a family, or updates how it relates to the
// partners if it is already there.
func (s *Store) SetChild(ctx context.Context, a Actor, familyID, childID int64, in ChildInput) (Family, error) {
	in.RelationPartner1 = strings.ToLower(strings.TrimSpace(in.RelationPartner1))
	in.RelationPartner2 = strings.ToLower(strings.TrimSpace(in.RelationPartner2))
	if in.RelationPartner1 == "" {
		in.RelationPartner1 = "birth"
	}
	if in.RelationPartner2 == "" {
		in.RelationPartner2 = "birth"
	}

	var f Family
	err := s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getFamily(ctx, tx, a, familyID)
		if err != nil {
			return err
		}
		var v validator
		v.check(oneOf(in.RelationPartner1, childRelations...), "relationPartner1", "unknown relation")
		v.check(oneOf(in.RelationPartner2, childRelations...), "relationPartner2", "unknown relation")
		if err := requireInTree(ctx, tx, "persons", childID, a.TreeID); errors.Is(err, ErrNotFound) {
			v.add("childId", "does not exist")
		} else if err != nil {
			return err
		} else {
			for _, partner := range []*PersonRef{before.Partner1, before.Partner2} {
				if partner == nil {
					continue
				}
				cyclic, err := isAncestor(ctx, tx, childID, partner.ID)
				if err != nil {
					return err
				}
				if cyclic {
					v.add("childId", "a person cannot be a child of themselves or of their own descendant")
					break
				}
			}
		}
		if err := v.err(); err != nil {
			return err
		}

		sortOrder := len(before.Children)
		if in.SortOrder != nil {
			sortOrder = *in.SortOrder
		}
		for _, c := range before.Children {
			if c.Person.ID == childID && in.SortOrder == nil {
				sortOrder = c.SortOrder
			}
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO family_children (family_id, child_id, relation_partner1, relation_partner2, sort_order)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT (family_id, child_id) DO UPDATE SET
				relation_partner1 = excluded.relation_partner1,
				relation_partner2 = excluded.relation_partner2,
				sort_order = excluded.sort_order`,
			familyID, childID, in.RelationPartner1, in.RelationPartner2, sortOrder); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE families SET updated_at = ?, updated_by = ? WHERE id = ?`,
			s.now(), nullID(a.UserID), familyID); err != nil {
			return err
		}
		if f, err = s.getFamily(ctx, tx, a, familyID); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "family", familyID, "update", before, f)
	})
	return f, err
}

// RemoveChild takes a child out of a family.
func (s *Store) RemoveChild(ctx context.Context, a Actor, familyID, childID int64) (Family, error) {
	var f Family
	err := s.tx(ctx, func(tx *sql.Tx) error {
		before, err := s.getFamily(ctx, tx, a, familyID)
		if err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx, `DELETE FROM family_children WHERE family_id = ? AND child_id = ?`, familyID, childID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		if _, err := tx.ExecContext(ctx, `UPDATE families SET updated_at = ?, updated_by = ? WHERE id = ?`,
			s.now(), nullID(a.UserID), familyID); err != nil {
			return err
		}
		if f, err = s.getFamily(ctx, tx, a, familyID); err != nil {
			return err
		}
		return s.logChange(ctx, tx, a, "family", familyID, "update", before, f)
	})
	return f, err
}

// GetFamily returns a family with partners, children and events.
func (s *Store) GetFamily(ctx context.Context, a Actor, id int64) (Family, error) {
	return s.getFamily(ctx, s.DB, a, id)
}

func (s *Store) getFamily(ctx context.Context, q queryer, a Actor, id int64) (Family, error) {
	fams, err := s.loadFamilies(ctx, q, a, `f.id = ?`, id)
	if err != nil {
		return Family{}, err
	}
	if len(fams) == 0 {
		return Family{}, ErrNotFound
	}
	return fams[0], nil
}

func (s *Store) loadFamilies(ctx context.Context, q queryer, a Actor, where string, args ...any) ([]Family, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT f.id, f.partner1_id, f.partner2_id, f.union_type, f.notes, f.created_at, f.updated_at
		FROM families f
		WHERE f.tree_id = ? AND `+where+`
		ORDER BY (SELECT min(e.date_sort) FROM events e WHERE e.family_id = f.id AND e.type = 'MARR') IS NULL,
			(SELECT min(e.date_sort) FROM events e WHERE e.family_id = f.id AND e.type = 'MARR'), f.id`,
		append([]any{a.TreeID}, args...)...)
	if err != nil {
		return nil, err
	}
	type raw struct {
		f      Family
		p1, p2 sql.NullInt64
	}
	var found []raw
	var personIDs, familyIDs []int64
	for rows.Next() {
		var r raw
		if err := rows.Scan(&r.f.ID, &r.p1, &r.p2, &r.f.UnionType, &r.f.Notes, &r.f.CreatedAt, &r.f.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		for _, p := range []sql.NullInt64{r.p1, r.p2} {
			if p.Valid {
				personIDs = append(personIDs, p.Int64)
			}
		}
		familyIDs = append(familyIDs, r.f.ID)
		found = append(found, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(found) == 0 {
		return []Family{}, nil
	}

	type childRow struct {
		familyID, childID int64
		link              ChildLink
	}
	var children []childRow
	crows, err := q.QueryContext(ctx, `
		SELECT c.family_id, c.child_id, c.relation_partner1, c.relation_partner2, c.sort_order
		FROM family_children c
		LEFT JOIN events b ON b.person_id = c.child_id AND b.type = 'BIRT'
		WHERE c.family_id IN (`+placeholders(len(familyIDs))+`)
		GROUP BY c.family_id, c.child_id
		ORDER BY c.sort_order, min(b.date_sort) IS NULL, min(b.date_sort), c.child_id`, int64Args(familyIDs)...)
	if err != nil {
		return nil, err
	}
	for crows.Next() {
		var c childRow
		if err := crows.Scan(&c.familyID, &c.childID, &c.link.RelationPartner1, &c.link.RelationPartner2, &c.link.SortOrder); err != nil {
			crows.Close()
			return nil, err
		}
		personIDs = append(personIDs, c.childID)
		children = append(children, c)
	}
	crows.Close()
	if err := crows.Err(); err != nil {
		return nil, err
	}

	refs, err := s.personRefs(ctx, q, a, personIDs)
	if err != nil {
		return nil, err
	}
	events, err := s.loadEvents(ctx, q, a, `e.family_id IN (`+placeholders(len(familyIDs))+`)`, int64Args(familyIDs)...)
	if err != nil {
		return nil, err
	}

	index := map[int64]int{}
	fams := make([]Family, len(found))
	for i, r := range found {
		f := r.f
		if r.p1.Valid {
			ref := refs[r.p1.Int64]
			f.Partner1 = &ref
		}
		if r.p2.Valid {
			ref := refs[r.p2.Int64]
			f.Partner2 = &ref
		}
		f.Children = []ChildLink{}
		f.Events = []Event{}
		fams[i] = f
		index[f.ID] = i
	}
	for _, c := range children {
		c.link.Person = refs[c.childID]
		f := &fams[index[c.familyID]]
		f.Children = append(f.Children, c.link)
	}
	for _, e := range events {
		f := &fams[index[*e.FamilyID]]
		f.Events = append(f.Events, e)
	}
	return fams, nil
}
