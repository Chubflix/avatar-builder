-- Seed data for local development
--
-- DEFAULT USER CREDENTIALS:
-- Email: dev@test.com
-- Password: password123
--
-- Note: The user is created via Supabase Auth API, not directly in this seed file.
-- This seed file only creates sample data for existing users.
--
-- To create the default user:
-- 1. Go to http://localhost:3000/login
-- 2. Sign up with dev@test.com / password123
-- OR use Supabase Studio at http://127.0.0.1:54323

-- This seed file is intentionally minimal
-- You can add sample characters/folders here after creating users

-- Example: Uncomment below to seed data for a specific user ID
/*
DO $$
DECLARE
    my_user_id UUID := 'YOUR-USER-ID-HERE';  -- Replace with actual user ID
    char_id UUID;
BEGIN
    -- Create sample character
    INSERT INTO characters (name, description, user_id)
    VALUES ('Sample Character', 'A test character', my_user_id)
    RETURNING id INTO char_id;

    -- Create sample folder
    INSERT INTO folders (name, description, character_id, user_id)
    VALUES ('Sample Folder', 'A test folder', char_id, my_user_id);

    RAISE NOTICE 'Sample data created successfully!';
END $$;
*/
