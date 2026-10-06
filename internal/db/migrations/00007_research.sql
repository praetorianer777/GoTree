-- +goose Up

CREATE TABLE research_tasks (
    id         INTEGER PRIMARY KEY,
    tree_id    INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    title      TEXT NOT NULL CHECK (title <> ''),
    status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
    priority   TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    -- A day (YYYY-MM-DD) or empty.
    due_on     TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    -- Set for tasks made from a suggestion (a consistency finding or a
    -- missing fact), so the same suggestion does not become two tasks.
    origin     TEXT NOT NULL DEFAULT '',
    -- The person the suggestion was about. Person ids can be reused after
    -- a deletion, so an origin only counts while its person exists.
    origin_person_id INTEGER REFERENCES persons (id) ON DELETE SET NULL,
    done_at    TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX research_tasks_tree ON research_tasks (tree_id, status, due_on);
CREATE UNIQUE INDEX research_tasks_origin ON research_tasks (tree_id, origin) WHERE origin_person_id IS NOT NULL;

-- Searches are logged whether they found something or not: knowing that a
-- register was searched in vain saves searching it again.
CREATE TABLE research_log (
    id          INTEGER PRIMARY KEY,
    tree_id     INTEGER NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
    task_id     INTEGER REFERENCES research_tasks (id) ON DELETE SET NULL,
    searched_on TEXT NOT NULL,
    query       TEXT NOT NULL CHECK (query <> ''),
    location    TEXT NOT NULL DEFAULT '',
    result      TEXT NOT NULL CHECK (result IN ('found', 'not_found', 'partial')),
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    updated_by  INTEGER REFERENCES users (id) ON DELETE SET NULL
) STRICT;

CREATE INDEX research_log_tree ON research_log (tree_id, searched_on);
CREATE INDEX research_log_task ON research_log (task_id);

-- What a task or log entry is about. Like media_links, the entity is
-- polymorphic, so triggers remove links to deleted rows.
CREATE TABLE research_links (
    owner_type  TEXT NOT NULL CHECK (owner_type IN ('task', 'log')),
    owner_id    INTEGER NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'source', 'place')),
    entity_id   INTEGER NOT NULL,
    PRIMARY KEY (owner_type, owner_id, entity_type, entity_id)
) STRICT;

CREATE INDEX research_links_entity ON research_links (entity_type, entity_id);

-- +goose StatementBegin
CREATE TRIGGER research_tasks_unlink AFTER DELETE ON research_tasks BEGIN
    DELETE FROM research_links WHERE owner_type = 'task' AND owner_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER research_log_unlink AFTER DELETE ON research_log BEGIN
    DELETE FROM research_links WHERE owner_type = 'log' AND owner_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER persons_unlink_research AFTER DELETE ON persons BEGIN
    DELETE FROM research_links WHERE entity_type = 'person' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER sources_unlink_research AFTER DELETE ON sources BEGIN
    DELETE FROM research_links WHERE entity_type = 'source' AND entity_id = OLD.id;
END;
-- +goose StatementEnd
-- +goose StatementBegin
CREATE TRIGGER places_unlink_research AFTER DELETE ON places BEGIN
    DELETE FROM research_links WHERE entity_type = 'place' AND entity_id = OLD.id;
END;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER places_unlink_research;
DROP TRIGGER sources_unlink_research;
DROP TRIGGER persons_unlink_research;
DROP TRIGGER research_log_unlink;
DROP TRIGGER research_tasks_unlink;
DROP TABLE research_links;
DROP TABLE research_log;
DROP TABLE research_tasks;
