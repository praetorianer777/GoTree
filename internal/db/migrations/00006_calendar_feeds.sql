-- +goose Up

-- Secret calendar subscription URLs. Calendar apps cannot log in, so the
-- token in the URL is the credential; only its hash is stored.
CREATE TABLE calendar_feeds (
    id              INTEGER PRIMARY KEY,
    tree_id         INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    token_hash      BLOB NOT NULL UNIQUE,
    label           TEXT NOT NULL CHECK (label <> ''),
    include_living  INTEGER NOT NULL DEFAULT 0 CHECK (include_living IN (0, 1)),
    revoked_at      TEXT,
    last_used_at    TEXT,
    created_at      TEXT NOT NULL,
    created_by      INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX calendar_feeds_tree ON calendar_feeds (tree_id, created_at);

-- +goose Down
DROP TABLE calendar_feeds;
