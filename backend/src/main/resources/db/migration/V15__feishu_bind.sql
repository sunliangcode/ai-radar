-- Feishu scan-to-bind: store app credentials + recipient open_id (secret never echoed to UI).
ALTER TABLE app_settings ADD COLUMN feishu_app_id TEXT;
ALTER TABLE app_settings ADD COLUMN feishu_app_secret TEXT;
ALTER TABLE app_settings ADD COLUMN feishu_open_id TEXT;
