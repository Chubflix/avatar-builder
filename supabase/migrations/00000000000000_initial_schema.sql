-- Avatar Builder Supabase Schema
-- Structure: characters -> folders -> images
-- All tables use RLS (Row Level Security)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CHARACTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own characters"
    ON characters FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters"
    ON characters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
    ON characters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
    ON characters FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- FOLDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_folders_character_id ON folders(character_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
CREATE POLICY "Users can view their own folders"
    ON folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
    ON folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
    ON folders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
    ON folders FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- IMAGES/GENERATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage

    -- Generation parameters
    positive_prompt TEXT,
    negative_prompt TEXT,
    model TEXT,
    orientation TEXT,
    width INTEGER,
    height INTEGER,
    batch_size INTEGER,
    sampler_name TEXT,
    scheduler TEXT,
    steps INTEGER,
    cfg_scale REAL,
    seed BIGINT,
    adetailer_enabled BOOLEAN DEFAULT FALSE,
    adetailer_model TEXT,
    info_json JSONB,
    loras JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_images_folder_id ON images(folder_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for images
CREATE POLICY "Users can view their own images"
    ON images FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
    ON images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
    ON images FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
    ON images FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Create storage bucket for generated images
-- Run this in Supabase Storage UI or via SQL:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('generated-images', 'generated-images', false);

-- Storage RLS policies
-- CREATE POLICY "Users can view their own images"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can upload their own images"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own images"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for folders
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for characters
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
