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
