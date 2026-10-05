-- +goose Up

-- Timestamps are RFC 3339 UTC text so they sort and compare as strings.

CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
) STRICT;

CREATE TABLE trees (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE tree_members (
    tree_id INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role    TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    PRIMARY KEY (tree_id, user_id)
) STRICT;

CREATE INDEX tree_members_user ON tree_members (user_id);

-- Only a hash of the session token is stored, so a leaked database does not
-- hand out live sessions.
CREATE TABLE sessions (
    token_hash   BLOB PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tree_id      INTEGER REFERENCES trees (id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    user_agent   TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

CREATE TABLE places (
    id         INTEGER PRIMARY KEY,
    tree_id    INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    parent_id  INTEGER REFERENCES places (id) ON DELETE RESTRICT,
    name       TEXT NOT NULL CHECK (name <> ''),
    place_type TEXT NOT NULL DEFAULT '',
    lat        REAL CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
    lng        REAL CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    CHECK (parent_id IS NULL OR parent_id <> id)
) STRICT;

CREATE INDEX places_tree_parent ON places (tree_id, parent_id, name);

CREATE TABLE persons (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    given_names TEXT NOT NULL DEFAULT '',
    surname     TEXT NOT NULL DEFAULT '',
    name_prefix TEXT NOT NULL DEFAULT '',
    name_suffix TEXT NOT NULL DEFAULT '',
    nickname    TEXT NOT NULL DEFAULT '',
    sex         TEXT NOT NULL DEFAULT 'U' CHECK (sex IN ('M', 'F', 'U', 'X')),
    -- NULL: not stated, inferred from the events.
    is_living   INTEGER CHECK (is_living IN (0, 1)),
    notes       TEXT NOT NULL DEFAULT '',
    gedcom_xref TEXT NOT NULL DEFAULT '',
    extra_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by  INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX persons_tree_name ON persons (tree_id, surname, given_names);
CREATE INDEX persons_tree_updated ON persons (tree_id, updated_at);

CREATE TABLE person_names (
    id            INTEGER PRIMARY KEY,
    person_id     INTEGER NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('birth', 'married', 'aka', 'religious', 'immigrant', 'other')),
    given_names   TEXT NOT NULL DEFAULT '',
    surname       TEXT NOT NULL DEFAULT '',
    name_prefix   TEXT NOT NULL DEFAULT '',
    name_suffix   TEXT NOT NULL DEFAULT '',
    nickname      TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'disputed', 'disproven')),
    status_reason TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX person_names_person ON person_names (person_id, sort_order);

-- A NULL partner is an unknown parent, drawn as a placeholder rather than
-- stored as a fake person.
CREATE TABLE families (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    partner1_id INTEGER REFERENCES persons (id) ON DELETE SET NULL,
    partner2_id INTEGER REFERENCES persons (id) ON DELETE SET NULL,
    union_type  TEXT NOT NULL DEFAULT 'unknown' CHECK (union_type IN ('married', 'partners', 'unknown')),
    notes       TEXT NOT NULL DEFAULT '',
    gedcom_xref TEXT NOT NULL DEFAULT '',
    extra_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    CHECK (partner1_id IS NULL OR partner2_id IS NULL OR partner1_id <> partner2_id)
) STRICT;

CREATE INDEX families_partner1 ON families (partner1_id);
CREATE INDEX families_partner2 ON families (partner2_id);
CREATE INDEX families_tree ON families (tree_id);

-- The relation is per parent, so "biological mother, adoptive father" and
-- surrogacy can be recorded; GEDCOM export maps them to PEDI or _FREL/_MREL.
CREATE TABLE family_children (
    family_id         INTEGER NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    child_id          INTEGER NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    relation_partner1 TEXT NOT NULL DEFAULT 'birth'
        CHECK (relation_partner1 IN ('birth', 'adopted', 'foster', 'step', 'surrogate', 'sealing', 'unknown')),
    relation_partner2 TEXT NOT NULL DEFAULT 'birth'
        CHECK (relation_partner2 IN ('birth', 'adopted', 'foster', 'step', 'surrogate', 'sealing', 'unknown')),
    sort_order        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (family_id, child_id)
) STRICT;

CREATE INDEX family_children_child ON family_children (child_id);

CREATE TABLE events (
    id             INTEGER PRIMARY KEY,
    tree_id        INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    person_id      INTEGER REFERENCES persons (id) ON DELETE CASCADE,
    family_id      INTEGER REFERENCES families (id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type <> ''),
    custom_label   TEXT NOT NULL DEFAULT '',
    -- date_raw is kept exactly as entered or imported; date is its
    -- normalized GEDCOM form, empty when it could not be parsed.
    date_raw       TEXT NOT NULL DEFAULT '',
    date           TEXT NOT NULL DEFAULT '',
    date_sort      INTEGER,
    date_sort_end  INTEGER,
    date_qualifier TEXT NOT NULL DEFAULT '',
    place_id       INTEGER REFERENCES places (id) ON DELETE SET NULL,
    description    TEXT NOT NULL DEFAULT '',
    notes          TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'disputed', 'disproven')),
    status_reason  TEXT NOT NULL DEFAULT '',
    sort_order     INTEGER NOT NULL DEFAULT 0,
    extra_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    created_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    CHECK ((person_id IS NULL) <> (family_id IS NULL))
) STRICT;

CREATE INDEX events_person ON events (person_id, date_sort);
CREATE INDEX events_family ON events (family_id, date_sort);
CREATE INDEX events_place ON events (place_id);
CREATE INDEX events_tree_type ON events (tree_id, type);

-- Shared events: the other people of a census household, witnesses,
-- godparents. The event's own person_id/family_id is the principal.
CREATE TABLE event_participants (
    event_id    INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    person_id   INTEGER NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role <> ''),
    custom_role TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (event_id, person_id, role)
) STRICT;

CREATE INDEX event_participants_person ON event_participants (person_id);

CREATE TABLE change_log (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    user_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id   INTEGER NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
    after_json  TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
    at          TEXT NOT NULL
) STRICT;

CREATE INDEX change_log_entity ON change_log (entity_type, entity_id);
CREATE INDEX change_log_tree_at ON change_log (tree_id, at);

-- rowid is the person id. Maintained by the store, not by triggers, because
-- the indexed names come from two tables.
CREATE VIRTUAL TABLE persons_fts USING fts5 (
    names,
    tokenize = 'unicode61 remove_diacritics 2'
);

-- +goose Down
DROP TABLE persons_fts;
DROP TABLE change_log;
DROP TABLE event_participants;
DROP TABLE events;
DROP TABLE family_children;
DROP TABLE families;
DROP TABLE person_names;
DROP TABLE persons;
DROP TABLE places;
DROP TABLE sessions;
DROP TABLE tree_members;
DROP TABLE trees;
DROP TABLE users;
