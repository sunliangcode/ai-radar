ALTER TABLE news_items ADD COLUMN read_flag INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news_items ADD COLUMN saved INTEGER NOT NULL DEFAULT 0;

CREATE TABLE app_settings (
    id                      INTEGER PRIMARY KEY CHECK (id = 1),
    interest_profile        TEXT,
    summary_language        TEXT,
    score_threshold         INTEGER,
    max_items               INTEGER,
    lookback_hours          INTEGER,
    fetch_interval_ms       INTEGER,
    push_cron               TEXT,
    timezone                TEXT,
    ui_base_url             TEXT,
    push_only_when_items    INTEGER,
    openai_base_url         TEXT,
    openai_model            TEXT,
    feishu_webhook_url      TEXT,
    webhook_url             TEXT,
    webhook_headers_json    TEXT,
    smtp_host               TEXT,
    smtp_port               INTEGER,
    smtp_username           TEXT,
    smtp_from               TEXT,
    smtp_to                 TEXT,
    smtp_starttls           INTEGER,
    updated_at              TEXT NOT NULL
);

INSERT INTO app_settings (id, updated_at) VALUES (1, datetime('now'));

CREATE TABLE delivery_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    channel         TEXT    NOT NULL,
    success         INTEGER NOT NULL,
    item_count      INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER,
    error_message   TEXT,
    created_at      TEXT    NOT NULL
);

CREATE INDEX idx_delivery_log_created_at ON delivery_log (created_at);

CREATE TABLE delivery_sent (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    channel         TEXT    NOT NULL,
    day             TEXT    NOT NULL,
    canonical_url   TEXT    NOT NULL,
    created_at      TEXT    NOT NULL,
    UNIQUE (channel, day, canonical_url)
);

CREATE INDEX idx_delivery_sent_day ON delivery_sent (day);
