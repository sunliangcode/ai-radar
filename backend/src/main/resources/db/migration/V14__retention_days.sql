-- Optional retention for news_items / delivery_sent.
-- NULL = keep forever (default). N > 0 deletes items older than N days
-- that are not saved and not linked to any event.
ALTER TABLE app_settings ADD COLUMN retention_days INTEGER;
