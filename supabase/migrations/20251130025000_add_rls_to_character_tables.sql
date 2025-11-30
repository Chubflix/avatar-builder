-- Add Row Level Security to character_greetings and character_description_sections
-- Users can only access greetings and descriptions for characters they own

-- Enable RLS on character_greetings
ALTER TABLE character_greetings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on character_description_sections
ALTER TABLE character_description_sections ENABLE ROW LEVEL SECURITY;

-- Policies for character_greetings
-- SELECT: Users can view greetings for their own characters
CREATE POLICY "Users can view greetings for their own characters"
  ON character_greetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_greetings.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- INSERT: Users can create greetings for their own characters
CREATE POLICY "Users can create greetings for their own characters"
  ON character_greetings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_greetings.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update greetings for their own characters
CREATE POLICY "Users can update greetings for their own characters"
  ON character_greetings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_greetings.character_id
        AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_greetings.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete greetings for their own characters
CREATE POLICY "Users can delete greetings for their own characters"
  ON character_greetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_greetings.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- Policies for character_description_sections
-- SELECT: Users can view description sections for their own characters
CREATE POLICY "Users can view description sections for their own characters"
  ON character_description_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_description_sections.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- INSERT: Users can create description sections for their own characters
CREATE POLICY "Users can create description sections for their own characters"
  ON character_description_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_description_sections.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update description sections for their own characters
CREATE POLICY "Users can update description sections for their own characters"
  ON character_description_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_description_sections.character_id
        AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_description_sections.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete description sections for their own characters
CREATE POLICY "Users can delete description sections for their own characters"
  ON character_description_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_description_sections.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- Create indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_character_greetings_character_lookup
  ON character_greetings(character_id, id);

CREATE INDEX IF NOT EXISTS idx_character_description_sections_character_lookup
  ON character_description_sections(character_id, id);
