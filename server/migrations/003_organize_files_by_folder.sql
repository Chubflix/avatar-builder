-- Migration: 003_organize_files_by_folder
-- Created: 2024-01-03
-- Description: Reorganize file storage to use character folders on disk

-- Add a flag to track if files have been migrated
ALTER TABLE generations ADD COLUMN file_migrated INTEGER DEFAULT 0;

-- This migration requires the application to handle the actual file moves
-- The file_migrated flag will be used to track which files have been moved
