# Importing Existing Data to Supabase

This guide explains how to migrate your existing SQLite database and images to Supabase.

## What Gets Imported

The import script migrates:

1. **Root Folders → Characters**
   - Folders with `parent_id = NULL` become characters
   - Example: "Lena Hoffmann", "Laura Fischer", "Rosie Brown"

2. **Child Folders → Folders**
   - Folders with a `parent_id` become folders linked to their parent character
   - Example: "Portrait" folder under "Laura Fischer" character

3. **Images → Supabase Storage + Database**
   - All images are uploaded to Supabase Storage
   - Metadata is stored in the `images` table
   - Generation parameters preserved (prompts, model, seed, etc.)

## Prerequisites

### 1. Run Migrations First

Make sure your Supabase database has the schema:

```bash
# Set your database connection
export POSTGRES_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Run migrations
yarn migrate

# Or use Supabase CLI
supabase db push
```

### 2. Set Environment Variables

You need these environment variables for the import:

```bash
# Supabase Configuration
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Where to find these:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Dashboard → Settings → API → service_role key (secret key)

**Note:** The import script uses a hardcoded user ID (`63289aab-77fc-4153-9d50-63be3a047202`) for all imported data. Make sure this user exists in your Supabase auth.users table.

## Running the Import

### Quick Import

```bash
# Set environment variables (or add to .env.local)
export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Run import
yarn import
```

### Using .env.local

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then run:
```bash
yarn import
```

## What Happens During Import

The script will:

1. **Verify user ID** (using hardcoded user: `63289aab-77fc-4153-9d50-63be3a047202`)
2. **Read SQLite database** from `data/avatar-builder.db`
3. **Import root folders** as characters
4. **Import child folders** as folders linked to characters
5. **Upload images** to Supabase Storage (bucket: `generated-images`)
6. **Create image records** with all metadata preserved

### Example Output

```
🔄 Starting data import from SQLite to Supabase...

📝 Step 1: Verifying user account...
  Using user ID: 63289aab-77fc-4153-9d50-63be3a047202

📊 Step 2: Reading SQLite database...
  Found 5 root folders (→ characters)
  Found 4 child folders (→ folders)
  Found 388 images

👤 Step 3: Importing characters...
  Creating character: Lena Hoffmann
  ✅ Created: Lena Hoffmann (char-id)
  Creating character: Laura Fischer
  ✅ Created: Laura Fischer (char-id)
  ...

📁 Step 4: Importing folders...
  Creating folder: Portrait
  ✅ Created: Portrait (folder-id)
  ...

🖼️  Step 5: Importing images...
  [1/388] Uploading image.png...
  [10/388] ✅ Imported 10 images so far...
  [20/388] ✅ Imported 20 images so far...
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Import completed!

Characters: 5 imported
Folders:    4 imported

Images:
  ✅ Imported: 385
  ⚠️  Skipped:  3 (files not found)
  ❌ Failed:   0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Storage Structure

Images are stored in Supabase Storage under:

```
generated-images/
  └── {user_id}/
      ├── image-uuid-1.png
      ├── image-uuid-2.png
      └── ...
```

This ensures:
- Each user's images are isolated
- RLS policies work correctly
- Images are organized by user

## Troubleshooting

### "File not found" warnings

**Cause:** Image file doesn't exist at expected path.

**Solution:** This is normal if:
- Some images were deleted manually
- Files weren't migrated to folder directories yet
- The script will skip these and continue

### "Upload failed"

**Cause:** Storage bucket doesn't exist or RLS policy blocks upload.

**Solution:**
1. Check storage bucket exists: Supabase Dashboard → Storage → `generated-images`
2. Verify RLS policies allow uploads (should be automatic from migration)
3. Check `SUPABASE_SERVICE_ROLE_KEY` is correct (bypasses RLS)

### "Database insert failed"

**Cause:** Schema mismatch or missing migrations.

**Solution:**
```bash
# Verify migrations are applied
yarn migrate

# Or check in Supabase Dashboard → Database → Tables
# Should see: characters, folders, images
```

### Import runs but no data visible in app

**Cause:** You're logged in as a different user.

**Solution:**
1. Log out of the app
2. Log in with the account that has user ID: `63289aab-77fc-4153-9d50-63be3a047202`
3. Your data will be visible now

## Re-running the Import

**⚠️ Warning:** The script uploads with `upsert: true`, so re-running will:
- Overwrite existing images in storage (same filenames)
- May create duplicate database records

**To avoid duplicates:**
1. Delete existing data first (Supabase Dashboard → Database)
2. Or create a new user account for the second import

## Verifying the Import

After import, verify in Supabase Dashboard:

### Check Database
1. **Characters**: Dashboard → Database → Tables → `characters`
2. **Folders**: Dashboard → Database → Tables → `folders`
3. **Images**: Dashboard → Database → Tables → `images`

### Check Storage
1. Dashboard → Storage → `generated-images`
2. Look for your `{user_id}` folder
3. Verify images are present

### Check App
1. Start app: `yarn dev`
2. Log in with import user credentials
3. You should see all characters and images

## Migration Mapping

Here's how your SQLite data maps to Supabase:

### Root Folders → Characters

| SQLite `character_folders` | Supabase `characters` |
|----------------------------|----------------------|
| id                         | (new UUID)           |
| name                       | name                 |
| description                | description          |
| parent_id = NULL           | -                    |
| -                          | user_id (from auth)  |

### Child Folders → Folders

| SQLite `character_folders` | Supabase `folders`   |
|----------------------------|---------------------|
| id                         | (new UUID)          |
| name                       | name                |
| description                | description         |
| parent_id                  | character_id (mapped) |
| -                          | user_id (from auth) |

### Generations → Images

| SQLite `generations`       | Supabase `images`    |
|---------------------------|---------------------|
| id                        | (new UUID)          |
| filename                  | filename            |
| folder_id                 | folder_id (mapped)  |
| -                         | storage_path        |
| positive_prompt           | positive_prompt     |
| negative_prompt           | negative_prompt     |
| model                     | model               |
| ... (all other fields)    | ... (preserved)     |
| -                         | user_id (from auth) |

## Next Steps

After successful import:

1. **Test the app**: `yarn dev` and verify all data is accessible
2. **Deploy to Vercel**: Your data is now in Supabase and will work in production
3. **Backup SQLite** (optional): Keep the original `data/` folder as backup
4. **Update ENV**: Make sure production environment variables are set in Vercel

## Cleaning Up

Once you've verified the import was successful:

### Keep Your SQLite Backup
```bash
# Optionally move to a backup location
mv data/avatar-builder.db data/avatar-builder.db.backup
```

### Local Images
The script doesn't delete local images. You can:
- Keep them as backup
- Delete them to save space (after verifying Supabase Storage)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify environment variables are correct
3. Check Supabase Dashboard for errors
4. Review the import script output for specific error messages
