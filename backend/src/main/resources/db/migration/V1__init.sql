CREATE TABLE sources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL,
    config_json     TEXT    NOT NULL DEFAULT '{}',
    enabled         INTEGER NOT NULL DEFAULT 1,
    last_fetched_at TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

CREATE TABLE news_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_url   TEXT    NOT NULL,
    title           TEXT    NOT NULL,
    published_at    TEXT,
    content_snippet TEXT,
    score           REAL,
    score_reason    TEXT,
    summary         TEXT,
    tags            TEXT,
    category        TEXT,
    status          TEXT    NOT NULL DEFAULT 'NEW',
    source_refs     TEXT,
    primary_source_type TEXT,
    primary_source_id   TEXT,
    raw_meta        TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

CREATE UNIQUE INDEX uk_news_items_canonical_url ON news_items (canonical_url);
CREATE INDEX idx_news_items_score ON news_items (score DESC);
CREATE INDEX idx_news_items_created_at ON news_items (created_at);
CREATE INDEX idx_sources_enabled ON sources (enabled);
