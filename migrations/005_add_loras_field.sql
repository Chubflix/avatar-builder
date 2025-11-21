-- Add loras JSON field to store lora settings used in generation
ALTER TABLE generations ADD COLUMN loras TEXT;
