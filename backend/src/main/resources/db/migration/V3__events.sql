CREATE TABLE events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'EMERGING',
    summary          TEXT,
    impact           TEXT,
    watch_next       TEXT,
    score            REAL,
    reliability      REAL,
    first_seen_at    TEXT    NOT NULL,
    last_updated_at  TEXT    NOT NULL
);

CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_score ON events (score DESC);
CREATE INDEX idx_events_last_updated ON events (last_updated_at);

CREATE TABLE event_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER NOT NULL,
    news_item_id    INTEGER NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'UPDATE',
    created_at      TEXT    NOT NULL,
    UNIQUE (event_id, news_item_id)
);

CREATE INDEX idx_event_items_event ON event_items (event_id);
CREATE INDEX idx_event_items_item ON event_items (news_item_id);

CREATE TABLE timeline_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        INTEGER NOT NULL,
    at              TEXT    NOT NULL,
    label           TEXT    NOT NULL,
    news_item_id    INTEGER,
    note            TEXT,
    created_at      TEXT    NOT NULL
);

CREATE INDEX idx_timeline_event_at ON timeline_entries (event_id, at);

CREATE TABLE event_cluster_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    news_item_id    INTEGER NOT NULL,
    decision        TEXT    NOT NULL,
    event_id        INTEGER,
    confidence      REAL,
    reason          TEXT,
    created_at      TEXT    NOT NULL
);

CREATE INDEX idx_cluster_log_item ON event_cluster_log (news_item_id);
