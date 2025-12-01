-- Add optional story_phase_id to character_greetings and create FK to character_story_phases

ALTER TABLE character_greetings
  ADD COLUMN IF NOT EXISTS story_phase_id UUID NULL;

-- Ensure we have an index to filter by phase quickly
CREATE INDEX IF NOT EXISTS idx_character_greetings_story_phase_id
  ON character_greetings(story_phase_id);

-- Prefer a composite FK to guarantee the phase belongs to the same character
ALTER TABLE character_greetings
  ADD CONSTRAINT fk_character_greetings_story_phase
  FOREIGN KEY (character_id, story_phase_id)
  REFERENCES character_story_phases(character_id, id)
  ON DELETE SET NULL;
