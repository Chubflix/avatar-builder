ALTER TABLE images ADD COLUMN character_id uuid;

CREATE INDEX idx_images_folder_id ON images(character_id);