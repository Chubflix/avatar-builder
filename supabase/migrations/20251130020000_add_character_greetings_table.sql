-- Create character_greetings table for storing character greetings
CREATE TABLE IF NOT EXISTS character_greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL,
  greeting_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on character_id for faster lookups
CREATE INDEX idx_character_greetings_character_id ON character_greetings(character_id);

-- Create index on greeting_order for ordering
CREATE INDEX idx_character_greetings_order ON character_greetings(character_id, greeting_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_greetings_updated_at
  BEFORE UPDATE ON character_greetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
