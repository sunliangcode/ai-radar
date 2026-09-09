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
