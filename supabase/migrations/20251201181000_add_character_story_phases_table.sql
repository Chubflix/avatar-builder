-- Create character_story_phases table for storing a character's story phases
-- Each phase belongs to a character and has a name, order, and description

CREATE TABLE IF NOT EXISTS character_story_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL,
  phase_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lookups and ordering
CREATE INDEX IF NOT EXISTS idx_character_story_phases_character_id
  ON character_story_phases(character_id);

CREATE INDEX IF NOT EXISTS idx_character_story_phases_order
  ON character_story_phases(character_id, phase_order);

-- Ensure order is unique per character
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_story_phases_unique_order
  ON character_story_phases(character_id, phase_order);

-- Also ensure (character_id, id) is unique to support composite FKs from child tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_story_phases_character_id_id
  ON character_story_phases(character_id, id);

-- Add foreign key to characters (cascades on delete)
ALTER TABLE character_story_phases
  ADD CONSTRAINT fk_character_story_phases_character_id
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;

-- Trigger to update updated_at timestamp (reuses existing function if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_character_story_phases_updated_at'
  ) THEN
    CREATE TRIGGER update_character_story_phases_updated_at
      BEFORE UPDATE ON character_story_phases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS and add policies to restrict access to character owners
ALTER TABLE character_story_phases ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view story phases for their own characters"
  ON character_story_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_story_phases.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- INSERT policy
CREATE POLICY "Users can create story phases for their own characters"
  ON character_story_phases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_story_phases.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update story phases for their own characters"
  ON character_story_phases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_story_phases.character_id
        AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_story_phases.character_id
        AND characters.user_id = auth.uid()
    )
  );

-- DELETE policy
CREATE POLICY "Users can delete story phases for their own characters"
  ON character_story_phases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_story_phases.character_id
        AND characters.user_id = auth.uid()
    )
  );
