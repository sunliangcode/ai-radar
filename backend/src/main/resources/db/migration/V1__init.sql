-- === V1__init.sql ===
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

-- === V2__run_experience.sql ===
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

-- === V3__events.sql ===
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

-- === V4__context.sql ===
CREATE TABLE user_contexts (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    payload_json    TEXT    NOT NULL DEFAULT '{}',
    raw_text        TEXT,
    source          TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

-- === V5__impact.sql ===
CREATE TABLE impacts (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id          INTEGER NOT NULL UNIQUE,
    title             TEXT    NOT NULL,
    relevance         REAL    NOT NULL DEFAULT 0,
    impact_score      REAL    NOT NULL DEFAULT 0,
    urgency           REAL    NOT NULL DEFAULT 0,
    confidence        REAL    NOT NULL DEFAULT 0,
    effort            REAL    NOT NULL DEFAULT 50,
    priority          REAL    NOT NULL DEFAULT 0,
    tier              TEXT    NOT NULL DEFAULT 'IGNORE',
    why_text          TEXT,
    evidence_text     TEXT,
    recommendation    TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);

CREATE INDEX idx_impacts_tier ON impacts (tier);
CREATE INDEX idx_impacts_priority ON impacts (priority DESC);

-- === V6__opportunity_action.sql ===
CREATE TABLE opportunities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    impact_id           INTEGER NOT NULL,
    event_id            INTEGER,
    title               TEXT    NOT NULL,
    summary             TEXT,
    estimated_hours     REAL,
    coverage_pct        REAL,
    kind                TEXT    NOT NULL DEFAULT 'OPPORTUNITY',
    created_at          TEXT    NOT NULL,
    updated_at          TEXT    NOT NULL
);

CREATE INDEX idx_opportunities_impact ON opportunities (impact_id);
CREATE INDEX idx_opportunities_kind ON opportunities (kind);

CREATE TABLE recommended_actions (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id       INTEGER,
    impact_id            INTEGER,
    event_id             INTEGER,
    title                TEXT    NOT NULL,
    steps_json           TEXT,
    estimated_minutes    INTEGER,
    success_criteria     TEXT,
    status               TEXT    NOT NULL DEFAULT 'open',
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL
);

CREATE INDEX idx_actions_status ON recommended_actions (status);
CREATE INDEX idx_actions_impact ON recommended_actions (impact_id);

-- === V7__experiment_outcome.sql ===
CREATE TABLE experiments (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id            INTEGER NOT NULL,
    title                TEXT    NOT NULL,
    goal                 TEXT,
    status               TEXT    NOT NULL DEFAULT 'running',
    success_rate         REAL,
    latency_ms           REAL,
    token_cost           REAL,
    human_intervention   REAL,
    review_time_min      REAL,
    notes                TEXT,
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL,
    completed_at         TEXT
);

CREATE INDEX idx_experiments_action ON experiments (action_id);
CREATE INDEX idx_experiments_status ON experiments (status);

CREATE TABLE outcomes (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id        INTEGER,
    month_key            TEXT    NOT NULL,
    insights_count       INTEGER NOT NULL DEFAULT 0,
    actions_count        INTEGER NOT NULL DEFAULT 0,
    experiments_count    INTEGER NOT NULL DEFAULT 0,
    successful_count     INTEGER NOT NULL DEFAULT 0,
    time_saved_hours     REAL    NOT NULL DEFAULT 0,
    ai_cost              REAL    NOT NULL DEFAULT 0,
    roi                  REAL,
    notes                TEXT,
    created_at           TEXT    NOT NULL,
    updated_at           TEXT    NOT NULL,
    UNIQUE (month_key)
);

-- === V8__memory.sql ===
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

-- === V9__weights_stars.sql ===
-- V9: configurable source weights + GitHub star snapshots
ALTER TABLE app_settings ADD COLUMN source_weights_json TEXT;

CREATE TABLE IF NOT EXISTS repo_star_snapshots (
    repo_url     TEXT    NOT NULL,
    stars        INTEGER NOT NULL,
    captured_at  TEXT    NOT NULL,
    PRIMARY KEY (repo_url, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_star_repo_time ON repo_star_snapshots (repo_url, captured_at DESC);

-- === V10__llm_context_window.sql ===
ALTER TABLE app_settings ADD COLUMN context_window_tokens INTEGER;
ALTER TABLE app_settings ADD COLUMN max_completion_tokens INTEGER;

-- === V11__fetch_timeout.sql ===
ALTER TABLE app_settings ADD COLUMN fetch_timeout_ms INTEGER;

-- === V12__ai_parallelism.sql ===
ALTER TABLE app_settings ADD COLUMN ai_parallelism INTEGER;

-- === V13__preference_keywords.sql ===
CREATE TABLE preference_keywords (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT    NOT NULL,
    text        TEXT    NOT NULL,
    source      TEXT    NOT NULL DEFAULT 'manual',
    item_id     INTEGER,
    created_at  TEXT    NOT NULL
);

CREATE INDEX idx_preference_keywords_kind ON preference_keywords (kind);

ALTER TABLE news_items ADD COLUMN dismissed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news_items ADD COLUMN title_display TEXT;

ALTER TABLE recommended_actions ADD COLUMN news_item_id INTEGER;
CREATE INDEX idx_actions_news_item ON recommended_actions (news_item_id);

-- === V14__retention_days.sql ===
-- Optional retention for news_items / delivery_sent.
-- NULL = keep forever (default). N > 0 deletes items older than N days
-- that are not saved and not linked to any event.
ALTER TABLE app_settings ADD COLUMN retention_days INTEGER;

-- === V15__feishu_bind.sql ===
-- Feishu scan-to-bind: store app credentials + recipient open_id (secret never echoed to UI).
ALTER TABLE app_settings ADD COLUMN feishu_app_id TEXT;
ALTER TABLE app_settings ADD COLUMN feishu_app_secret TEXT;
ALTER TABLE app_settings ADD COLUMN feishu_open_id TEXT;

-- === V16__decisions_watch.sql ===
CREATE TABLE decisions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id       INTEGER NOT NULL,
    kind            TEXT    NOT NULL,
    reason          TEXT,
    revisit_at      TEXT,
    status          TEXT    NOT NULL DEFAULT 'open',
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

CREATE INDEX idx_decisions_change ON decisions (change_id);
CREATE INDEX idx_decisions_revisit ON decisions (revisit_at);
CREATE INDEX idx_decisions_status ON decisions (status);

CREATE TABLE watch_subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    change_id       INTEGER,
    topic_key       TEXT,
    rules_json      TEXT    NOT NULL DEFAULT '{}',
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);

CREATE INDEX idx_watch_change ON watch_subscriptions (change_id);
CREATE INDEX idx_watch_topic ON watch_subscriptions (topic_key);
