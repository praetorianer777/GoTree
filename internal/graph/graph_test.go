package graph

import (
	"fmt"
	"testing"
)

// The test family, by generation:
//
//	1 ∞ 2                     grandparents
//	3 (∞ 4), 5 (∞ 6), 5 ∞ 7   their children 3 and 5 with spouses
//	8 of 3+4; 9 of 5+6; 10 of 5+7; 11 adopted by 3+4
//	12 of 8 (∞ 13)
func family() *Graph {
	both := func(id int64) Child { return Child{PersonID: id, Blood1: true, Blood2: true} }
	return New(
		[]int64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 99},
		[]Family{
			{ID: 100, Partner1: 1, Partner2: 2, Children: []Child{both(3), both(5)}},
			{ID: 101, Partner1: 3, Partner2: 4, Children: []Child{both(8), {PersonID: 11}}},
			{ID: 102, Partner1: 5, Partner2: 6, Children: []Child{both(9)}},
			{ID: 103, Partner1: 5, Partner2: 7, Children: []Child{both(10)}},
			{ID: 104, Partner1: 8, Partner2: 13, Children: []Child{{PersonID: 12, Blood1: true}}},
		},
	)
}

func describe(r Relationship) string {
	if r.Kinship == nil {
		return r.Kind
	}
	k := r.Kinship
	s := fmt.Sprintf("%s %d/%d", r.Kind, k.Up, k.Down)
	if k.Half {
		s += " half"
	}
	if k.Adoptive {
		s += " adoptive"
	}
	return s
}

func TestRelate(t *testing.T) {
	g := family()
	tests := []struct {
		a, b int64
		want string
	}{
		{8, 8, "self"},
		{8, 3, "blood 1/0"},  // parent
		{8, 1, "blood 2/0"},  // grandparent
		{12, 1, "blood 3/0"}, // great-grandparent
		{1, 12, "blood 0/3"}, // great-grandchild
		{3, 5, "blood 1/1"},  // sibling
		{9, 10, "blood 1/1 half"},
		{8, 5, "blood 2/1"},  // aunt or uncle
		{5, 8, "blood 1/2"},  // niece or nephew
		{8, 9, "blood 2/2"},  // first cousin
		{12, 9, "blood 3/2"}, // first cousin once removed
		{8, 10, "blood 2/2"}, // 3 and 5 are full siblings
		{8, 11, "blood 1/1 adoptive"},
		{3, 4, "spouse"},
		{8, 4, "blood 1/0"},
		{8, 6, "spouse_of_relative 2/1"},  // uncle's wife
		{3, 6, "spouse_of_relative 1/1"},  // brother's wife
		{4, 1, "relative_of_spouse 1/0"},  // spouse's father
		{4, 5, "relative_of_spouse 1/1"},  // spouse's brother
		{13, 3, "relative_of_spouse 1/0"}, // spouse's father
		{8, 99, "none"},
		{12, 13, "blood 1/0 adoptive"}, // not 12's birth parent
	}
	for _, tt := range tests {
		if got := describe(g.Relate(tt.a, tt.b)); got != tt.want {
			t.Errorf("%d→%d: got %q, want %q", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestPathAndAncestors(t *testing.T) {
	r := family().Relate(12, 9)
	if fmt.Sprint(r.Kinship.Path) != "[12 8 3 1 5 9]" {
		t.Errorf("path %v", r.Kinship.Path)
	}
	if fmt.Sprint(r.Kinship.Ancestors) != "[1 2]" {
		t.Errorf("a couple of common ancestors: %v", r.Kinship.Ancestors)
	}
	r = family().Relate(8, 6)
	if fmt.Sprint(r.Kinship.Path) != "[8 3 1 5 6]" || r.Via != 5 {
		t.Errorf("in-law path %v via %d", r.Kinship.Path, r.Via)
	}
	r = family().Relate(4, 5)
	if fmt.Sprint(r.Kinship.Path) != "[4 3 1 5]" || r.Via != 3 {
		t.Errorf("in-law path %v via %d", r.Kinship.Path, r.Via)
	}
}

func TestPedigreeCollapse(t *testing.T) {
	// First cousins 3 and 4 marry; their child 5 is related to grandparent
	// couple 1+2 twice, and 3 is both spouse and cousin of 4.
	g := New([]int64{1, 2, 10, 11, 3, 4, 5}, []Family{
		{ID: 1, Partner1: 1, Partner2: 2, Children: []Child{{10, true, true}, {11, true, true}}},
		{ID: 2, Partner1: 10, Children: []Child{{3, true, true}}},
		{ID: 3, Partner1: 11, Children: []Child{{4, true, true}}},
		{ID: 4, Partner1: 3, Partner2: 4, Children: []Child{{5, true, true}}},
	})
	r := g.Relate(3, 4)
	if r.Kind != KindSpouse || len(r.Others) != 1 || r.Others[0].Up != 2 || r.Others[0].Down != 2 {
		t.Errorf("spouse and cousin: %+v", r)
	}
	r = g.Relate(5, 10)
	if describe(r) != "blood 2/0" || len(r.Others) != 1 || r.Others[0].Up != 3 || r.Others[0].Down != 1 {
		t.Errorf("grandparent and great-uncle: %+v", r)
	}
}

func TestUnknownParents(t *testing.T) {
	g := New([]int64{1, 2, 3}, []Family{
		{ID: 7, Children: []Child{{1, true, true}, {2, true, true}}},
		{ID: 8, Partner1: 2, Children: []Child{{3, true, true}}},
	})
	r := g.Relate(1, 3)
	if describe(r) != "blood 1/2" || fmt.Sprint(r.Kinship.Path) != "[1 -7 2 3]" {
		t.Errorf("niece through unknown parents: %+v", r.Kinship)
	}
}
