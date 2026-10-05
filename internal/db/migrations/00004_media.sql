-- +goose Up

-- Files live on disk under DATA_DIR/media, named by their SHA-256; this
-- table holds what is known about them.
CREATE TABLE media (
    id            INTEGER PRIMARY KEY,
    tree_id       INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    sha256        TEXT NOT NULL CHECK (length(sha256) = 64),
    mime          TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK (kind IN ('image', 'document', 'audio', 'video')),
    size          INTEGER NOT NULL,
    original_name TEXT NOT NULL DEFAULT '',
    width         INTEGER,
    height        INTEGER,
    -- EXIF orientation (1-8); thumbnails are rotated accordingly, width and
    -- height above are as displayed.
    orientation   INTEGER NOT NULL DEFAULT 1,
    title         TEXT NOT NULL DEFAULT '',
    date_raw      TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    transcript    TEXT NOT NULL DEFAULT '',
    taken_at      TEXT NOT NULL DEFAULT '',
    gps_lat       REAL,
    gps_lng       REAL,
    gedcom_xref   TEXT NOT NULL DEFAULT '',
    extra_json    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(extra_json)),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    created_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
    UNIQUE (tree_id, sha256)
) STRICT;

CREATE TABLE media_links (
    media_id    INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'event', 'family', 'source')),
    entity_id   INTEGER NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (media_id, entity_type, entity_id)
) STRICT;

CREATE INDEX media_links_entity ON media_links (entity_type, entity_id, sort_order);

-- Face tags: a box on a photo in coordinates relative to the displayed
-- image (0-1). person_id is set once the face is matched; name keeps what
-- an imported tag said.
CREATE TABLE media_regions (
    id        INTEGER PRIMARY KEY,
    media_id  INTEGER NOT NULL REFERENCES media (id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES persons (id) ON DELETE SET NULL,
    name      TEXT NOT NULL DEFAULT '',
    x         REAL NOT NULL CHECK (x >= 0 AND x <= 1),
    y         REAL NOT NULL CHECK (y >= 0 AND y <= 1),
    w         REAL NOT NULL CHECK (w > 0 AND x + w <= 1.0001),
    h         REAL NOT NULL CHECK (h > 0 AND y + h <= 1.0001),
    source    TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'xmp'))
) STRICT;

CREATE INDEX media_regions_media ON media_regions (media_id);
CREATE INDEX media_regions_person ON media_regions (person_id);

ALTER TABLE persons ADD COLUMN portrait_media_id INTEGER REFERENCES media (id) ON DELETE SET NULL;
ALTER TABLE persons ADD COLUMN portrait_region_id INTEGER REFERENCES media_regions (id) ON DELETE SET NULL;

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

-- +goose Down
DROP TRIGGER sources_unlink_media;
DROP TRIGGER families_unlink_media;
DROP TRIGGER events_unlink_media;
DROP TRIGGER persons_unlink_media;
ALTER TABLE persons DROP COLUMN portrait_region_id;
ALTER TABLE persons DROP COLUMN portrait_media_id;
DROP TABLE media_regions;
DROP TABLE media_links;
DROP TABLE media;
