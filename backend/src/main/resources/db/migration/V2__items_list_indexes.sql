-- Feed list filters: dismissed + unread + score ordering
CREATE INDEX IF NOT EXISTS idx_news_items_feed_score
    ON news_items (dismissed, read_flag, score DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_news_items_feed_created
    ON news_items (dismissed, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_news_items_read_flag
    ON news_items (read_flag);

CREATE INDEX IF NOT EXISTS idx_news_items_saved
    ON news_items (saved);
