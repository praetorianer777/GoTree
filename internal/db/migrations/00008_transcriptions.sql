-- +goose Up

-- Record templates of the user; the built-in ones live in the code. The
-- definition is the JSON of store.RecordTemplate.
CREATE TABLE record_templates (
    id         INTEGER PRIMARY KEY,
    tree_id    INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    name       TEXT NOT NULL CHECK (name <> ''),
    definition TEXT NOT NULL CHECK (json_valid(definition)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX record_templates_tree ON record_templates (tree_id, name);

-- A record transcribed row by row. It stays a draft until applied, which
-- creates the people, the event and the citations.
CREATE TABLE transcriptions (
    id           INTEGER PRIMARY KEY,
    tree_id      INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    -- A built-in template key, or "custom:<record_templates.id>".
    template_key TEXT NOT NULL CHECK (template_key <> ''),
    title        TEXT NOT NULL DEFAULT '',
    source_id    INTEGER REFERENCES sources (id) ON DELETE SET NULL,
    page         TEXT NOT NULL DEFAULT '',
    date_raw     TEXT NOT NULL DEFAULT '',
    place_id     INTEGER REFERENCES places (id) ON DELETE SET NULL,
    notes        TEXT NOT NULL DEFAULT '',
    rows_json    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(rows_json)),
    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
    event_id     INTEGER REFERENCES events (id) ON DELETE SET NULL,
    applied_at   TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    created_by   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by   INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX transcriptions_tree ON transcriptions (tree_id, updated_at);

-- +goose Down
DROP TABLE transcriptions;
DROP TABLE record_templates;
