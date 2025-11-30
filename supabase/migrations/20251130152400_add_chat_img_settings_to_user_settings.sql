-- Add chat_img_settings JSONB field to user_settings
-- Stores configuration for chat image generation (model, style, positive/negative prefixes)

ALTER TABLE IF EXISTS user_settings
    ADD COLUMN IF NOT EXISTS chat_img_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
