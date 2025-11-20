-- Add support for nested folders
-- Migration: 004_add_nested_folders

-- Add parent_id column to character_folders table
ALTER TABLE character_folders ADD COLUMN parent_id TEXT DEFAULT NULL REFERENCES character_folders(id) ON DELETE CASCADE;

-- Create index for faster parent-child lookups
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON character_folders(parent_id);
