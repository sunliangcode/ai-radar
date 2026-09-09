CREATE TABLE memory_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    kind            TEXT    NOT NULL,
    ref_type        TEXT,
    ref_id          INTEGER,
    title           TEXT,
    payload_json    TEXT,
    created_at      TEXT    NOT NULL
);

CREATE INDEX idx_memory_kind ON memory_entries (kind);
CREATE INDEX idx_memory_created ON memory_entries (created_at DESC);
