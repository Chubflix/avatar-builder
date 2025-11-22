# Supabase Migration Guide

This guide outlines the migration from SQLite to Supabase with authentication and Vercel deployment.

## Overview

### New Architecture
- **Database**: PostgreSQL (Supabase) with RLS
- **Auth**: Supabase Auth (Email/Password + Google OAuth)
- **Storage**: Supabase Storage (S3-compatible)
- **Deployment**: Vercel (instead of Docker)
- **Structure**: `characters` → `folders` → `images` (non-recursive)

## Local Development with Supabase

### ✅ Setup Complete!

Your local Supabase development environment is ready! Here's what was configured:

#### 1. Supabase CLI Installed
- Supabase CLI is installed at `$HOME/bin/supabase`
- Version: 2.58.5

#### 2. Local Services Running
Supabase is now running locally with these services:
- **API URL**: http://127.0.0.1:54321
- **Studio URL**: http://127.0.0.1:54323 (Database management UI)
- **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Mailpit URL**: http://127.0.0.1:54324 (Email testing)

**Credentials** (local only):
- Publishable Key: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- Secret Key: `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`

#### 3. Database Schema Applied
All migrations in `supabase/migrations/` have been applied:
- ✅ `00000000000000_initial_schema.sql` - Characters, folders, images tables with RLS
- ✅ `00000000000001_create_storage_bucket.sql` - Storage bucket and policies

#### 4. Environment Configured
Your `.env.local` is configured to use local Supabase (production credentials are commented out).

### Managing Local Supabase

```bash
# Start local development services
supabase start

# Stop services (keeps data)
supabase stop

# View status
supabase status

# Reset database (WARNING: deletes all data)
supabase db reset

# Access Supabase Studio (database UI)
open http://127.0.0.1:54323

# View email testing interface
open http://127.0.0.1:54324
```

### Creating Test Users

Since email confirmations are disabled for local dev, you can sign up users directly:

1. Start your Next.js app: `npm run dev`
2. Go to http://localhost:3000/login
3. Sign up with any email/password (no real email needed)
4. User is created immediately in local database

Or use Supabase Studio:
1. Open http://127.0.0.1:54323
2. Go to Authentication → Users
3. Add user manually

### Testing Multi-User Data Isolation

1. **Create User A**: Sign up with `user-a@test.com`
2. **Create Character**: Add a character (e.g., "Alice")
3. **Create Folder**: Add a folder under Alice
4. **Generate Image**: Create a test image
5. **Sign Out**: Log out of User A
6. **Create User B**: Sign up with `user-b@test.com`
7. **Verify Isolation**: User B should NOT see User A's characters/folders/images
8. **Create Data**: User B creates their own character/folders
9. **Sign Back as User A**: Verify User A only sees their own data

Row Level Security (RLS) ensures each user sees only their own data automatically.

### Switching Between Local and Production

In `.env.local`:

```bash
# For local development (active)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# For production (commented out)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
# SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
```

Just swap the comments to switch environments (restart dev server after changing).

## Completed Steps

### ✅ 1. Dependencies Installed
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support

### ✅ 2. Database Schema Created
- **Location**: `supabase/schema.sql`
- **Tables**: `folders`, `images`
- **Features**:
  - RLS enabled on all tables
  - User isolation (each user sees only their data)
  - Foreign keys to `characters` table
  - JSONB for loras and info
  - Timestamps with auto-update triggers

### ✅ 3. Supabase Clients Configured
- **Client-side**: `app/lib/supabase.js`
- **Server-side**: `app/lib/supabase-server.js`
- Includes authentication helpers
- Includes storage helpers

### ✅ 4. Authentication Pages
- **Login page**: `app/login/page.js`
- **OAuth callback**: `app/auth/callback/route.js`
- **Middleware**: `middleware.js` (route protection)

### ✅ 5. Environment Template
- **File**: `.env.example`
- Copy to `.env.local` and fill in values

## Required Setup Steps

### 1. Supabase Project Setup

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and keys

2. **Run Database Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Run `supabase/schema.sql`
   - Verify tables created with RLS enabled

3. **Setup Storage Bucket**
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('generated-images', 'generated-images', false);
   ```

4. **Configure Storage Policies**
   - Go to Storage → Policies
   - Enable RLS on `storage.objects`
   - Add policies for user-specific access (see schema.sql comments)

5. **Enable Google OAuth** (for production)
   - Go to Authentication → Providers
   - Enable Google
   - Add OAuth credentials from Google Cloud Console
   - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 2. Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SD_API_URL=https://your-sd-api.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Update API Routes

All API routes in `app/api/*` need to be updated:

#### Example Pattern:
```javascript
// Old (SQLite)
import { getDb } from '@/app/lib/db';
const db = getDb();
const folders = db.prepare('SELECT * FROM folders').all();

// New (Supabase)
import { createAuthClient } from '@/app/lib/supabase-server';
const supabase = createAuthClient();
const { data: folders, error } = await supabase
    .from('folders')
    .select('*');
```

#### Routes to Update:
- ✅ `app/api/characters/route.js` - Character CRUD (created)
- ✅ `app/api/characters/[id]/route.js` - Character detail (created)
- ✅ `app/api/folders/route.js` - Updated for Supabase
- ✅ `app/api/folders/[id]/route.js` - Updated for Supabase
- ✅ `app/api/images/route.js` - Updated for Supabase + Storage
- ✅ `app/api/images/[id]/route.js` - Updated for Supabase + Storage
- ✅ `app/api/images/bulk-move/route.js` - Updated for Supabase
- ✅ `app/api/images/bulk-delete/route.js` - Updated for Supabase + Storage
- ✅ `app/api/images/download-zip/route.js` - Updated to download from Storage
- ❌ `app/api/images/serve/[...path]/route.js` - Remove (no longer needed)
- ❌ `app/api/config/route.js` - Keep as-is (reads from file)

### 4. Character Management

Create character management UI:

1. **Character Selector**
   - Dropdown in nav bar
   - Shows user's characters
   - Allows switching between characters

2. **Character CRUD**
   - Create: `app/components/CharacterModal.js`
   - Read: Load in main app
   - Update: Edit character name/description
   - Delete: With confirmation

3. **Context Updates**
   - Add `selectedCharacter` to AppContext
   - Filter folders by `character_id`

### 5. Image Storage Updates

Update image handling to use Supabase Storage:

```javascript
// In app/hooks/index.js - processGeneration()

// Old: Save to filesystem
fs.writeFileSync(filepath, base64Data, 'base64');

// New: Upload to Supabase Storage
import { uploadImage } from '../lib/supabase';
const blob = base64ToBlob(imageData);
const storagePath = await uploadImage(
    blob,
    filename,
    user.id
);
```

### 6. Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Create `vercel.json`**
   ```json
   {
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "installCommand": "npm install",
     "framework": "nextjs",
     "env": {
       "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
       "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
       "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
     }
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.local`

### 7. Update package.json

Remove Docker-related scripts, update for Vercel:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 8. Clean Up Old Files

Remove Docker and SQLite files:
```bash
rm -rf Dockerfile docker-compose*.yml .dockerignore
rm -rf .github/workflows/docker-publish.yml
rm -rf migrations/
rm -rf app/lib/db.js
rm -rf data/
```

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] User can sign in with Google OAuth
- [ ] User can create character
- [ ] User can see only their characters
- [ ] User can create folder under character
- [ ] User can generate image
- [ ] Image saves to Supabase Storage
- [ ] Image metadata saves to database
- [ ] User can view images
- [ ] User can delete images (from DB and Storage)
- [ ] User can restore settings from image (including loras)
- [ ] RLS prevents seeing other users' data
- [ ] Deploy to Vercel works

## Migration Strategy

### Phase 1: Setup ✅
- ✅ Install dependencies
- ✅ Create schema
- ✅ Setup authentication
- ✅ Create Supabase clients

### Phase 2: Backend ✅
- ✅ Update API routes for Supabase
- ✅ Implement character management APIs
- ✅ Update image storage to Supabase Storage
- ✅ Convert all image operations to use Storage

### Phase 3: Frontend (Current)
- Add character selector to UI
- Add character management modal (create/edit/delete characters)
- Update hooks to use new API responses
- Update image display to use Storage URLs
- Update folder creation to require character selection
- Remove subfolder logic from UI (folders are now flat)

### Phase 4: Deployment
- Remove old files (Docker, SQLite, migrations)
- Configure Vercel
- Test locally with Supabase
- Deploy to Vercel
- Test production with Google OAuth

## Important Notes

1. **RLS Security**: All queries automatically filter by `user_id = auth.uid()`
2. **Storage Paths**: `{user_id}/{filename}` prevents conflicts
3. **Characters**: Must have `user_id` column with RLS
4. **No Recursion**: Folders are flat under characters
5. **No Uniqueness**: Multiple folders can have same name
6. **Service Role**: Only use in server-side API routes, bypasses RLS

## Troubleshooting

### RLS Blocks Queries
- Ensure policies are created for all operations (SELECT, INSERT, UPDATE, DELETE)
- Check `user_id` is set correctly on INSERT
- Verify `auth.uid()` returns user ID

### Storage Upload Fails
- Check bucket exists and is named 'generated-images'
- Verify storage policies are set
- Ensure path format is `{user_id}/{filename}`

### OAuth Redirect Issues
- Check callback URL matches in Google Console
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Ensure middleware allows `/auth` routes

## Next Steps

I've set up the foundation. Here's what you need to do next:

1. **Run the schema in Supabase** (`supabase/schema.sql`)
2. **Add your environment variables** (copy `.env.example` to `.env.local`)
3. **Let me know when ready** and I'll help update the API routes and add character management

This is a significant migration, so let's proceed step by step!
