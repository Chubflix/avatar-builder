-- Migration: 002_add_character_folders
-- Created: 2024-01-02
-- Description: Add character folders support

-- Create character_folders table
CREATE TABLE IF NOT EXISTS character_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add folder_id to generations table
ALTER TABLE generations ADD COLUMN folder_id TEXT REFERENCES character_folders(id) ON DELETE SET NULL;

-- Create index for faster folder lookups
CREATE INDEX IF NOT EXISTS idx_generations_folder_id ON generations(folder_id);
