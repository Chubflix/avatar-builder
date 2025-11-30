-- Alter existing characters table to support character.spec.yaml structure
-- The characters table already exists with: id, name, description, created_at, updated_at, user_id

-- Add new columns for character.spec.yaml support
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS in_chat_name TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS spec_data JSONB DEFAULT '{}'::jsonb;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_slug ON characters(slug);

-- Create index on user_id + slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_characters_user_slug ON characters(user_id, slug);

-- Add foreign key constraints to character_greetings
ALTER TABLE character_greetings
  ADD CONSTRAINT fk_character_greetings_character_id
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;

-- Add foreign key constraints to character_description_sections
ALTER TABLE character_description_sections
  ADD CONSTRAINT fk_character_description_sections_character_id
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;

-- Update function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(input_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_slug
  BEFORE INSERT OR UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();
