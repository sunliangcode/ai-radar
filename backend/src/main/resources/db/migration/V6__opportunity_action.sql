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
