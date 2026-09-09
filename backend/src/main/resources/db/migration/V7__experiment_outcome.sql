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
