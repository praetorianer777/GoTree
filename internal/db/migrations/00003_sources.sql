-- +goose Up

CREATE TABLE repositories (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (name <> ''),
    address     TEXT NOT NULL DEFAULT '',
    url         TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    gedcom_xref TEXT NOT NULL DEFAULT '',
    extra_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by  INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX repositories_tree_name ON repositories (tree_id, name);

CREATE TABLE sources (
    id            INTEGER PRIMARY KEY,
    tree_id       INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    repository_id INTEGER REFERENCES repositories (id) ON DELETE SET NULL,
    call_number   TEXT NOT NULL DEFAULT '',
    title         TEXT NOT NULL CHECK (title <> ''),
    author        TEXT NOT NULL DEFAULT '',
    publication   TEXT NOT NULL DEFAULT '',
    notes         TEXT NOT NULL DEFAULT '',
    gedcom_xref   TEXT NOT NULL DEFAULT '',
    extra_json    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    created_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by    INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX sources_tree_title ON sources (tree_id, title);
CREATE INDEX sources_repository ON sources (repository_id);

-- A citation points into a source ("page 12, entry 34") and can support
-- several facts at once.
CREATE TABLE citations (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    source_id   INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
    page        TEXT NOT NULL DEFAULT '',
    -- GEDCOM QUAY: 0 unreliable, 1 questionable, 2 secondary, 3 primary.
    quality     INTEGER CHECK (quality IS NULL OR quality BETWEEN 0 AND 3),
    text        TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    extra_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by  INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX citations_source ON citations (source_id);

-- What a citation supports. The target is polymorphic, so instead of a
-- foreign key the triggers below remove links whose target is deleted.
-- field names a single value of the target (e.g. "date") for value-level
-- citations; empty means the whole record.
CREATE TABLE citation_links (
    citation_id   INTEGER NOT NULL REFERENCES citations (id) ON DELETE CASCADE,
    entity_type   TEXT NOT NULL CHECK (entity_type IN ('person', 'event', 'family', 'name')),
    entity_id     INTEGER NOT NULL,
    field         TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'disputed', 'disproven')),
    status_reason TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (citation_id, entity_type, entity_id, field)
) STRICT;

CREATE INDEX citation_links_entity ON citation_links (entity_type, entity_id);

-- Foreign-key cascades (deleting a person deletes their events) fire these
-- triggers too, so no link survives its target.
-- +goose StatementBegin
CREATE TRIGGER persons_unlink_citations AFTER DELETE ON persons BEGIN
    DELETE FROM citation_links WHERE entity_type = 'person' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER events_unlink_citations AFTER DELETE ON events BEGIN
    DELETE FROM citation_links WHERE entity_type = 'event' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER families_unlink_citations AFTER DELETE ON families BEGIN
    DELETE FROM citation_links WHERE entity_type = 'family' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER person_names_unlink_citations AFTER DELETE ON person_names BEGIN
    DELETE FROM citation_links WHERE entity_type = 'name' AND entity_id = OLD.id;
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER person_names_unlink_citations;
DROP TRIGGER families_unlink_citations;
DROP TRIGGER events_unlink_citations;
DROP TRIGGER persons_unlink_citations;
DROP TABLE citation_links;
DROP TABLE citations;
DROP TABLE sources;
DROP TABLE repositories;
