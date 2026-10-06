-- +goose Up

-- Read-only links for relatives without an account. Like sessions, only a
-- hash of the token is stored.
CREATE TABLE share_links (
    id             INTEGER PRIMARY KEY,
    tree_id        INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    token_hash     BLOB NOT NULL UNIQUE,
    label          TEXT NOT NULL CHECK (label <> ''),
    scope          TEXT NOT NULL CHECK (scope IN ('tree', 'descendants')),
    root_person_id INTEGER REFERENCES persons (id) ON DELETE CASCADE,
    privacy        TEXT NOT NULL CHECK (privacy IN ('deceased', 'living_names')),
    expires_at     TEXT,
    revoked_at     TEXT,
    last_used_at   TEXT,
    created_at     TEXT NOT NULL,
    created_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    CHECK ((scope = 'descendants') = (root_person_id IS NOT NULL))
) STRICT;

CREATE INDEX share_links_tree ON share_links (tree_id, created_at);

-- +goose Down
DROP TABLE share_links;
