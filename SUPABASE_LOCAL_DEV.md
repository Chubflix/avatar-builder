# Supabase Local Development Quick Reference

## Current Status

✅ **Supabase is running locally**

Your local development environment is fully configured with:
- PostgreSQL database with RLS (Row Level Security)
- Authentication service
- Storage service
- Email testing (Mailpit)
- Supabase Studio (database management UI)

## Quick Commands

```bash
# Start Supabase (if stopped)
supabase start

# Stop Supabase (keeps data)
supabase stop

# Check status
supabase status

# View logs
supabase logs

# Reset database (⚠️ DELETES ALL DATA)
supabase db reset
```

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://127.0.0.1:54321 | Supabase API endpoint |
| Studio | http://127.0.0.1:54323 | Database management UI |
| Database | postgresql://postgres:postgres@127.0.0.1:54322/postgres | Direct DB connection |
| Mailpit | http://127.0.0.1:54324 | Email testing interface |

## Database Schema

### Tables

1. **characters**
   - `id` (UUID, PK)
   - `name` (TEXT, required)
   - `description` (TEXT, optional)
   - `user_id` (UUID, FK to auth.users)
   - `created_at`, `updated_at` (timestamps)
   - **RLS**: Users see only their own characters

2. **folders**
   - `id` (UUID, PK)
   - `character_id` (UUID, FK to characters)
   - `name` (TEXT, required)
   - `description` (TEXT, optional)
   - `user_id` (UUID, FK to auth.users)
   - `created_at`, `updated_at` (timestamps)
   - **RLS**: Users see only their own folders

3. **images**
   - `id` (UUID, PK)
   - `folder_id` (UUID, FK to folders, nullable)
   - `filename` (TEXT)
   - `storage_path` (TEXT) - Path in Supabase Storage
   - Generation parameters (prompt, model, settings, etc.)
   - `loras` (JSONB) - Saved LoRA configurations
   - `user_id` (UUID, FK to auth.users)
   - `created_at` (timestamp)
   - **RLS**: Users see only their own images

### Storage Buckets

- **generated-images** (private)
  - Path format: `{user_id}/{filename}`
  - Max size: 50MB per file
  - Allowed types: PNG, JPEG, JPG, WebP
  - **RLS**: Users can only access their own images

## Testing Multi-User Isolation

### Test Scenario

1. **Sign up User A** (`user-a@test.com`)
   - Create character "Alice"
   - Create folder "Portraits"
   - Generate an image

2. **Sign out, Sign up User B** (`user-b@test.com`)
   - Should see NO characters (empty state)
   - Create character "Bob"
   - Create folder "Landscapes"

3. **Switch back to User A**
   - Should only see "Alice" character
   - Should only see "Portraits" folder
   - Bob's data is invisible

**Expected behavior**: Complete data isolation. User A never sees User B's data, and vice versa.

## Row Level Security (RLS)

All tables have RLS enabled with these policies:

- **SELECT**: `WHERE user_id = auth.uid()`
- **INSERT**: `WITH CHECK user_id = auth.uid()`
- **UPDATE**: `WHERE user_id = auth.uid()`
- **DELETE**: `WHERE user_id = auth.uid()`

This means:
- Users automatically see only their own data
- Users can only create records with their own `user_id`
- Users can only modify/delete their own records
- No code changes needed - RLS handles it automatically

## Common Tasks

### Create a Test User

**Option 1: Via Login Page (Recommended)**
```
1. Start dev server: npm run dev
2. Go to: http://localhost:3000/login
3. Click "Sign Up"
4. Enter: dev@test.com / password123 (or any email/password)
5. User is created instantly and you're logged in automatically
   (no email confirmation needed in local mode)
```

**Option 2: Via Supabase Studio SQL Editor**
```
1. Open: http://127.0.0.1:54323
2. Go to: SQL Editor
3. Open file: supabase/create_dev_user.sql
4. Copy contents and paste in SQL Editor
5. Click "Run"
6. Default user created: dev@test.com / password123
```

**Option 3: Via Supabase Studio UI**
```
1. Open: http://127.0.0.1:54323
2. Go to: Authentication → Users
3. Click: "Create User"
4. Fill in email/password
5. Check "Auto Confirm User"
```

### View Database Tables

```
1. Open: http://127.0.0.1:54323
2. Go to: Table Editor
3. Select table: characters, folders, or images
4. View/edit data directly
```

### View Sent Emails (Signups, Password Resets)

```
1. Open: http://127.0.0.1:54324
2. All emails sent by Supabase appear here
3. Click to view email content
```

### Check Storage Files

```
1. Open: http://127.0.0.1:54323
2. Go to: Storage
3. Select bucket: generated-images
4. Browse folders by user_id
```

### Run SQL Queries

```
1. Open: http://127.0.0.1:54323
2. Go to: SQL Editor
3. Write query, e.g.:
   SELECT * FROM characters WHERE user_id = 'USER_ID_HERE';
4. Click "Run"
```

## Environment Variables

Your `.env.local` is configured for local development:

```bash
# Active (Local Development)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Production (commented out)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# ...
```

**To switch to production:** Comment out local variables, uncomment production ones, restart dev server.

## Migrations

Migrations are in `supabase/migrations/`:

- `00000000000000_initial_schema.sql` - Creates tables, RLS policies
- `00000000000001_create_storage_bucket.sql` - Creates storage bucket, policies

**To create a new migration:**
```bash
supabase migration new my_migration_name
# Edit the created file in supabase/migrations/
supabase db reset  # Apply migration
```

## Troubleshooting

### Services won't start
```bash
# Check what's using ports
lsof -i :54321
lsof -i :54322
lsof -i :54323

# Stop Supabase
supabase stop

# Start again
supabase start
```

### Database schema is wrong
```bash
# Reset to clean state (⚠️ deletes all data)
supabase db reset
```

### Can't authenticate
1. Check `.env.local` has correct local keys
2. Restart Next.js dev server
3. Clear browser cookies
4. Check Supabase is running: `supabase status`

### Images won't upload
1. Verify storage bucket exists in Studio
2. Check storage policies are set
3. Ensure `user_id` is in storage path
4. Check file size < 50MB

### RLS blocking queries
1. Verify user is authenticated
2. Check `user_id` is set on INSERT
3. Review policies in Studio → Authentication → Policies

## Development Workflow

1. **Start services**
   ```bash
   supabase start
   npm run dev
   ```

2. **Make changes**
   - Edit code as normal
   - Changes hot-reload in Next.js

3. **Test with multiple users**
   - Use different browsers/incognito for different users
   - Or sign out/sign in with different accounts

4. **View database changes**
   - Open Studio to see data in real-time
   - Use SQL Editor for complex queries

5. **Stop when done**
   ```bash
   supabase stop  # Data persists in Docker volumes
   ```

## Next Steps

1. ✅ Supabase is running locally
2. ✅ Database schema is applied
3. ✅ Storage bucket is configured
4. ✅ Environment variables are set

**You can now:**
- Start your Next.js app: `npm run dev`
- Sign up users at http://localhost:3000/login
- Test character/folder/image creation
- Verify data isolation between users
- Use Supabase Studio to inspect data

**Need help?** Check the full migration guide in `MIGRATION_GUIDE.md`
