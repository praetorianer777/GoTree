package api

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/praetorianer777/gotree/internal/store"
)

func TestFamilyWorkflow(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)

	var country, city store.Place
	c.call("POST", "/api/places", map[string]any{"name": "Germany", "placeType": "country"}, http.StatusCreated, &country)
	c.call("POST", "/api/places", map[string]any{"name": "Leipzig", "parentId": country.ID}, http.StatusCreated, &city)
	if city.FullName != "Leipzig, Germany" {
		t.Errorf("place full name %q", city.FullName)
	}

	var father, mother, child store.Person
	c.call("POST", "/api/persons", map[string]any{"givenNames": "Johann", "surname": "Weber", "sex": "M"}, http.StatusCreated, &father)
	c.call("POST", "/api/persons", map[string]any{
		"givenNames": "Maria", "surname": "Weber", "sex": "F",
		"alternateNames": []map[string]any{{"type": "birth", "surname": "Schulz"}},
	}, http.StatusCreated, &mother)
	c.call("POST", "/api/persons", map[string]any{"givenNames": "Paul", "surname": "Weber", "sex": "M"}, http.StatusCreated, &child)

	var fam store.Family
	c.call("POST", "/api/families", map[string]any{"partner1Id": father.ID, "partner2Id": mother.ID, "unionType": "married"}, http.StatusCreated, &fam)
	c.call("PUT", fmt.Sprintf("/api/families/%d/children/%d", fam.ID, child.ID), map[string]any{}, http.StatusOK, &fam)
	if len(fam.Children) != 1 || fam.Children[0].Person.ID != child.ID {
		t.Fatalf("children: %+v", fam.Children)
	}

	var birth, marriage store.Event
	c.call("POST", "/api/events", map[string]any{"personId": child.ID, "type": "BIRT", "date": "12.3.1925", "placeId": city.ID}, http.StatusCreated, &birth)
	if birth.Date.Normalized != "12 MAR 1925" || birth.Place == nil || birth.Place.FullName != "Leipzig, Germany" {
		t.Errorf("birth: %+v", birth)
	}
	c.call("POST", "/api/events", map[string]any{"familyId": fam.ID, "type": "MARR", "date": "1920"}, http.StatusCreated, &marriage)

	var census store.Event
	c.call("POST", "/api/events", map[string]any{
		"personId": father.ID, "type": "CENS", "date": "1933",
		"participants": []map[string]any{{"personId": mother.ID, "role": "spouse"}, {"personId": child.ID, "role": "child"}},
	}, http.StatusCreated, &census)

	var detail store.PersonDetail
	c.call("GET", fmt.Sprintf("/api/persons/%d", child.ID), nil, http.StatusOK, &detail)
	if len(detail.ParentFamilies) != 1 || detail.ParentFamilies[0].Partner2.ID != mother.ID {
		t.Errorf("parents: %+v", detail.ParentFamilies)
	}
	if len(detail.Events) == 0 || detail.Events[0].Date.Normalized != "12 MAR 1925" {
		t.Errorf("events: %+v", detail.Events)
	}
	var roles []string
	for _, e := range detail.Events {
		roles = append(roles, e.Role)
	}
	if len(detail.Events) != 2 || roles[1] != "child" {
		t.Errorf("events with roles: %+v", detail.Events)
	}

	var list store.PersonList
	c.call("GET", "/api/persons?q=schulz", nil, http.StatusOK, &list)
	if list.Total != 1 || list.Items[0].ID != mother.ID {
		t.Errorf("search by birth name: %+v", list)
	}
	c.call("GET", "/api/persons?limit=2", nil, http.StatusOK, &list)
	if list.Total != 3 || len(list.Items) != 2 {
		t.Errorf("paging: %+v", list)
	}

	c.call("DELETE", fmt.Sprintf("/api/places/%d", country.ID), nil, http.StatusConflict, nil)
	c.call("DELETE", fmt.Sprintf("/api/events/%d", birth.ID), nil, http.StatusNoContent, nil)
	c.call("GET", fmt.Sprintf("/api/events/%d", birth.ID), nil, http.StatusNotFound, nil)
	c.call("DELETE", fmt.Sprintf("/api/families/%d/children/%d", fam.ID, child.ID), nil, http.StatusOK, &fam)
	if len(fam.Children) != 0 {
		t.Errorf("child not removed: %+v", fam.Children)
	}
}

func TestRequestErrors(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)

	var e errorBody
	c.call("POST", "/api/persons", map[string]any{"givenName": "typo"}, http.StatusBadRequest, &e)
	if e.Error == "" {
		t.Error("unknown fields must be rejected with a message")
	}
	c.call("POST", "/api/persons", map[string]any{"sex": "Q"}, http.StatusUnprocessableEntity, &e)
	if e.Fields["sex"] == "" {
		t.Errorf("fields: %+v", e)
	}
	c.call("GET", "/api/persons/999", nil, http.StatusNotFound, nil)
	c.call("GET", "/api/persons/abc", nil, http.StatusNotFound, nil)
	c.call("PATCH", "/api/persons/1", map[string]any{}, http.StatusMethodNotAllowed, nil)

	status, _ := c.do("POST", "/api/persons", nil)
	if status != http.StatusBadRequest {
		t.Errorf("empty body: status %d", status)
	}
}

func TestAddRelativeAndDatePreview(t *testing.T) {
	ts := newServer(t, builtFrontend)
	c := loggedIn(t, ts)

	var paul store.Person
	c.call("POST", "/api/persons", map[string]any{"givenNames": "Paul"}, http.StatusCreated, &paul)
	var res store.RelativeResult
	c.call("POST", fmt.Sprintf("/api/persons/%d/relatives", paul.ID), map[string]any{
		"relation": "partner", "person": map[string]any{"givenNames": "Eva"},
	}, http.StatusCreated, &res)
	if res.Person.GivenNames != "Eva" || len(res.Family.Events) != 1 {
		t.Errorf("relative: %+v", res)
	}
	var e errorBody
	c.call("POST", fmt.Sprintf("/api/persons/%d/relatives", paul.ID), map[string]any{"relation": "cousin", "person": map[string]any{}},
		http.StatusUnprocessableEntity, &e)
	if e.Fields["relation"] == "" {
		t.Errorf("fields: %+v", e)
	}

	var d parsedDate
	c.call("GET", "/api/dates/parse?q=abt+12.3.1850", nil, http.StatusOK, &d)
	if !d.Valid || d.Normalized != "ABT 12 MAR 1850" || d.Qualifier != "ABT" {
		t.Errorf("parse: %+v", d)
	}
	c.call("GET", "/api/dates/parse?q=31+FEB+1850", nil, http.StatusOK, &d)
	if d.Valid || d.Error == "" {
		t.Errorf("invalid date: %+v", d)
	}
	c.call("GET", "/api/dates/parse?q=", nil, http.StatusOK, &d)
	if !d.Empty {
		t.Errorf("empty date: %+v", d)
	}
}
