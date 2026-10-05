-- +goose Up
CREATE TABLE app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
) STRICT;

-- +goose Down
DROP TABLE app_meta;
