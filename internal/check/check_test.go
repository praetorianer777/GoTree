package check

import (
	"testing"
	"time"
)

var now = time.Date(2026, 10, 5, 0, 0, 0, 0, time.UTC)

func date(key int, q string) *Range {
	r := FromSortKeys(key, key, q)
	return &r
}

func rules(fs []Finding) map[string]Finding {
	out := map[string]Finding{}
	for _, f := range fs {
		out[f.Rule] = f
	}
	return out
}

func TestPersonRules(t *testing.T) {
	yes := true
	d := Data{
		Persons: []Person{{ID: 1}, {ID: 2}, {ID: 3, Living: &yes}, {ID: 4}},
		Events: []Event{
			{ID: 10, PersonID: 1, Type: "BIRT", Date: date(18500312, "")},
			{ID: 11, PersonID: 1, Type: "DEAT", Date: date(18490000, "")},
			{ID: 12, PersonID: 2, Type: "BIRT", Date: date(17000000, "")},
			{ID: 13, PersonID: 2, Type: "DEAT", Date: date(18200000, "")},
			{ID: 14, PersonID: 2, Type: "CENS", Date: date(18300000, "")},
			{ID: 15, PersonID: 2, Type: "BURI", Date: date(18190000, "")},
			{ID: 16, PersonID: 2, Type: "PROB", Date: date(18210000, "")},
			{ID: 17, PersonID: 3, Type: "BIRT", Date: date(19000000, "")},
			{ID: 18, PersonID: 4, Type: "OCCU", Invalid: true},
		},
	}
	got := rules(Run(d, now))
	if f, ok := got[RuleBirthAfterDeath]; !ok || f.PersonID != 1 || f.Severity != Error {
		t.Errorf("birth after death: %+v", got)
	}
	if f, ok := got[RuleTooOld]; !ok || f.PersonID != 2 || f.Years != 119 {
		t.Errorf("too old: %+v", f)
	}
	if f, ok := got[RuleEventAfterDeath]; !ok || f.EventID != 14 {
		t.Errorf("census after death: %+v", f)
	}
	if f, ok := got[RuleBurialBeforeDeath]; !ok || f.EventID != 15 {
		t.Errorf("burial before death: %+v", f)
	}
	if f, ok := got[RuleLivingTooOld]; !ok || f.PersonID != 3 || f.Years != 125 {
		t.Errorf("living too old: %+v", f)
	}
	if f, ok := got[RuleInvalidDate]; !ok || f.EventID != 18 {
		t.Errorf("invalid date: %+v", f)
	}
	if len(Run(d, now)) != 6 {
		t.Errorf("probate after death is normal: %+v", Run(d, now))
	}
}

func TestVagueDatesDoNotContradict(t *testing.T) {
	d := Data{
		Persons: []Person{{ID: 1}},
		Events: []Event{
			{ID: 1, PersonID: 1, Type: "BIRT", Date: date(18500000, "ABT")},
			{ID: 2, PersonID: 1, Type: "DEAT", Date: date(18490000, "")},
			{ID: 3, PersonID: 1, Type: "RESI", Date: date(18400000, "AFT")},
			{ID: 4, PersonID: 1, Type: "CENS", Date: date(18500000, "BEF")},
		},
	}
	if fs := Run(d, now); len(fs) != 0 {
		t.Errorf("findings: %+v", fs)
	}
	// Same day, same month: a birth on the day of death is fine.
	d.Events = []Event{
		{ID: 1, PersonID: 1, Type: "BIRT", Date: date(18500300, "")},
		{ID: 2, PersonID: 1, Type: "DEAT", Date: date(18500312, "")},
	}
	if fs := Run(d, now); len(fs) != 0 {
		t.Errorf("findings: %+v", fs)
	}
}

func TestBaptismAndBurialStandIn(t *testing.T) {
	d := Data{
		Persons: []Person{{ID: 1}},
		Events: []Event{
			{ID: 1, PersonID: 1, Type: "CHR", Date: date(18600000, "")},
			{ID: 2, PersonID: 1, Type: "BURI", Date: date(18550000, "")},
		},
	}
	// A baptism only bounds the birth from above, so this is an event after
	// the death, not a birth after it.
	if got := rules(Run(d, now)); len(got) != 1 || got[RuleEventAfterDeath].EventID != 1 {
		t.Errorf("baptism after burial: %+v", got)
	}
}

func TestFamilyRules(t *testing.T) {
	d := Data{
		Persons: []Person{{ID: 1, Sex: "M"}, {ID: 2, Sex: "F"}, {ID: 3}, {ID: 4}, {ID: 5}, {ID: 6}},
		Events: []Event{
			{ID: 1, PersonID: 1, Type: "BIRT", Date: date(18000000, "")},
			{ID: 2, PersonID: 1, Type: "DEAT", Date: date(18400000, "")},
			{ID: 3, PersonID: 2, Type: "BIRT", Date: date(18100000, "")},
			{ID: 4, PersonID: 3, Type: "BIRT", Date: date(18200000, "")},
			{ID: 5, PersonID: 4, Type: "BIRT", Date: date(18700000, "")},
			{ID: 6, PersonID: 5, Type: "BIRT", Date: date(18410300, "")},
			{ID: 7, PersonID: 6, Type: "BIRT", Date: date(18450000, "")},
			{ID: 8, FamilyID: 1, Type: "MARR", Date: date(17990000, "")},
		},
		Families: []Family{{ID: 1, Partner1: 1, Partner2: 2, Children: []Child{
			{PersonID: 3, Birth1: true, Birth2: true},
			{PersonID: 4, Birth1: false, Birth2: true},
			{PersonID: 5, Birth1: true, Birth2: true},
			{PersonID: 6, Birth1: true, Birth2: false},
		}}},
	}
	type key struct {
		rule          string
		person, other int64
	}
	got := map[key]bool{}
	for _, f := range Run(d, now) {
		got[key{f.Rule, f.PersonID, f.OtherPersonID}] = true
	}
	want := []key{
		{RuleParentTooYoung, 3, 2},
		{RuleMotherTooOld, 4, 2},
		{RuleBornAfterFatherDie, 6, 1},
		{RuleMarriedBeforeBirth, 1, 0},
		{RuleMarriedBeforeBirth, 2, 0},
	}
	for _, w := range want {
		if !got[w] {
			t.Errorf("missing %+v in %+v", w, got)
		}
	}
	if len(got) != len(want) {
		t.Errorf("got %d findings, want %d: %+v", len(got), len(want), got)
	}
}
