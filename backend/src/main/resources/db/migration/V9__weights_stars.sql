-- V9: configurable source weights + GitHub star snapshots
ALTER TABLE app_settings ADD COLUMN source_weights_json TEXT;

CREATE TABLE IF NOT EXISTS repo_star_snapshots (
    repo_url     TEXT    NOT NULL,
    stars        INTEGER NOT NULL,
    captured_at  TEXT    NOT NULL,
    PRIMARY KEY (repo_url, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_star_repo_time ON repo_star_snapshots (repo_url, captured_at DESC);
