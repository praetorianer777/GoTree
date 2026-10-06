-- +goose Up

CREATE TABLE heirlooms (
    id               INTEGER PRIMARY KEY,
    tree_id          INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    name             TEXT NOT NULL CHECK (name <> ''),
    kind             TEXT NOT NULL DEFAULT 'other'
        CHECK (kind IN ('jewellery', 'furniture', 'document', 'photo_album', 'tool', 'textile', 'other')),
    description      TEXT NOT NULL DEFAULT '',
    made_date_raw    TEXT NOT NULL DEFAULT '',
    made_date_sort   INTEGER,
    origin_place_id  INTEGER REFERENCES places (id) ON DELETE SET NULL,
    current_location TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    gedcom_xref      TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    created_by       INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by       INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX heirlooms_tree ON heirlooms (tree_id, name);

-- Who held an heirloom, in order. A custodian may be unknown (person_id
-- NULL with a name in notes), e.g. "sold to a dealer".
CREATE TABLE heirloom_custody (
    id            INTEGER PRIMARY KEY,
    heirloom_id   INTEGER NOT NULL REFERENCES heirlooms (id) ON DELETE CASCADE,
    person_id     INTEGER REFERENCES persons (id) ON DELETE SET NULL,
    from_date_raw TEXT NOT NULL DEFAULT '',
    to_date_raw   TEXT NOT NULL DEFAULT '',
    how           TEXT NOT NULL DEFAULT 'inherited'
        CHECK (how IN ('inherited', 'gift', 'purchased', 'made', 'found', 'other')),
    notes         TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX heirloom_custody_heirloom ON heirloom_custody (heirloom_id, sort_order);
CREATE INDEX heirloom_custody_person ON heirloom_custody (person_id);

-- Photos and citations of heirlooms use the existing link tables. SQLite
-- cannot change a CHECK constraint, so both tables are rebuilt; the
-- triggers that delete from them are dropped first and created again.
DROP TRIGGER persons_unlink_media;
DROP TRIGGER events_unlink_media;
DROP TRIGGER families_unlink_media;
DROP TRIGGER sources_unlink_media;
DROP TRIGGER persons_unlink_citations;
DROP TRIGGER events_unlink_citations;
DROP TRIGGER families_unlink_citations;
DROP TRIGGER person_names_unlink_citations;

CREATE TABLE media_links_new (
    media_id    INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'event', 'family', 'source', 'heirloom')),
    entity_id   INTEGER NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (media_id, entity_type, entity_id)
) STRICT;
INSERT INTO media_links_new SELECT media_id, entity_type, entity_id, sort_order FROM media_links;
DROP TABLE media_links;
ALTER TABLE media_links_new RENAME TO media_links;
CREATE INDEX media_links_entity ON media_links (entity_type, entity_id, sort_order);

CREATE TABLE citation_links_new (
    citation_id   INTEGER NOT NULL REFERENCES citations (id) ON DELETE CASCADE,
    entity_type   TEXT NOT NULL CHECK (entity_type IN ('person', 'event', 'family', 'name', 'heirloom')),
    entity_id     INTEGER NOT NULL,
    field         TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'disputed', 'disproven')),
    status_reason TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (citation_id, entity_type, entity_id, field)
) STRICT;
INSERT INTO citation_links_new SELECT citation_id, entity_type, entity_id, field, status, status_reason FROM citation_links;
DROP TABLE citation_links;
ALTER TABLE citation_links_new RENAME TO citation_links;
CREATE INDEX citation_links_entity ON citation_links (entity_type, entity_id);

-- +goose StatementBegin
CREATE TRIGGER persons_unlink_media AFTER DELETE ON persons BEGIN
    DELETE FROM media_links WHERE entity_type = 'person' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER events_unlink_media AFTER DELETE ON events BEGIN
    DELETE FROM media_links WHERE entity_type = 'event' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER families_unlink_media AFTER DELETE ON families BEGIN
    DELETE FROM media_links WHERE entity_type = 'family' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER sources_unlink_media AFTER DELETE ON sources BEGIN
    DELETE FROM media_links WHERE entity_type = 'source' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER heirlooms_unlink_media AFTER DELETE ON heirlooms BEGIN
    DELETE FROM media_links WHERE entity_type = 'heirloom' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
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
-- +goose StatementBegin
CREATE TRIGGER heirlooms_unlink_citations AFTER DELETE ON heirlooms BEGIN
    DELETE FROM citation_links WHERE entity_type = 'heirloom' AND entity_id = OLD.id;
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER heirlooms_unlink_citations;
DROP TRIGGER heirlooms_unlink_media;
DELETE FROM media_links WHERE entity_type = 'heirloom';
DELETE FROM citation_links WHERE entity_type = 'heirloom';
DROP TABLE heirloom_custody;
DROP TABLE heirlooms;
