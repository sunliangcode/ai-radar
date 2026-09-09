CREATE TABLE user_contexts (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    payload_json    TEXT    NOT NULL DEFAULT '{}',
    raw_text        TEXT,
    source          TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);
