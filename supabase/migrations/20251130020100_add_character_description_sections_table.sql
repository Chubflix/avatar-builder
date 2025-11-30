-- Create character_description_sections table for storing character descriptions
CREATE TABLE IF NOT EXISTS character_description_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL,
  section VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on character_id for faster lookups
CREATE INDEX idx_character_description_sections_character_id ON character_description_sections(character_id);

-- Create unique index on character_id + section to prevent duplicates
CREATE UNIQUE INDEX idx_character_description_sections_unique ON character_description_sections(character_id, section);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_character_description_sections_updated_at
  BEFORE UPDATE ON character_description_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
