# Deploying to Vercel with Automatic Migrations

This guide covers deploying Avatar Builder to Vercel with **automatic database migrations** that run during each deployment.

## How It Works

When you deploy to Vercel:
1. Vercel runs `npm run vercel-build`
2. This executes `npm run migrate && next build`
3. The migration script connects to your Supabase PostgreSQL database
4. It applies any pending migrations from `supabase/migrations/`
5. Then Next.js builds your application

## Quick Setup (3 Steps)

### 1. Install Dependencies

```bash
yarn install
```

This will install the `pg` package required for running migrations.

### 2. Configure Vercel Environment Variables

In your Vercel project dashboard, add these environment variables:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `DATABASE_URL` - PostgreSQL connection string for migrations

**Optional:**
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)
- `NEXT_PUBLIC_SD_API_URL` - Stable Diffusion API URL
- `NEXT_PUBLIC_APP_URL` - Your application URL

### 3. Get Your Database Connection String

**Option A: Direct Connection String (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to **Settings → Database**
3. Scroll to **Connection string**
4. Select **Direct connection** (not Transaction mode)
5. Click **Copy** and use this format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. Add this as `DATABASE_URL` in Vercel

**Option B: Auto-build from Components**

If you don't want to store the full connection string, you can provide:
- `NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co`
- `SUPABASE_DB_PASSWORD=your-database-password`

The migration script will automatically build the connection string.

## Vercel Configuration

The `vercel.json` is already configured:

```json
{
  "buildCommand": "npm run vercel-build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

The `package.json` includes the build script:

```json
{
  "scripts": {
    "vercel-build": "yarn migrate && next build",
    "migrate": "node scripts/run-migrations.js"
  }
}
```

## Deployment

### Deploy via Git

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel
3. Vercel will automatically deploy when you push to your main branch

### Deploy via CLI

```bash
# Install Vercel CLI
yarn global add vercel
# or: npm i -g vercel

# Deploy
vercel --prod
```

## Migration Tracking

The migration script creates a `_migrations` table to track which migrations have been applied. This ensures:
- Migrations only run once
- You can deploy multiple times safely
- New migrations are automatically detected and applied

## Monitoring Migrations

### View Build Logs

Check migration output in Vercel:
1. Go to your Vercel project
2. Click on a deployment
3. View the build logs
4. Look for migration output:
   ```
   🔄 Running Supabase migrations...
   Found 2 migration file(s):
     - 00000000000000_initial_schema.sql
     - 00000000000001_create_storage_bucket.sql
   ✅ Migration tracking table ready
   ▶️  Running 00000000000000_initial_schema.sql...
   ✅ Completed 00000000000000_initial_schema.sql
   ✅ Migrations completed successfully!
   ```

### Check Applied Migrations

Query your database:
```sql
SELECT * FROM _migrations ORDER BY executed_at DESC;
```

## Troubleshooting

### Build Fails with "Missing database connection"

**Solution:** Add `DATABASE_URL` to your Vercel environment variables.

Get it from: Supabase Dashboard → Settings → Database → Connection string (Direct)

### Build Fails with "Connection refused"

**Cause:** Database password is incorrect or project is paused.

**Solution:**
1. Verify your database password
2. Check Supabase project is active (not paused)
3. Reset database password if needed:
   - Supabase Dashboard → Settings → Database → Reset database password

### Migration Fails with "already exists"

**This is normal!** The migration script handles this automatically:
- If objects already exist, it marks the migration as complete
- Subsequent deployments will skip it

### Want to Re-run Migrations

Option 1: **Delete tracking records** (be careful!):
```sql
DELETE FROM _migrations WHERE name = '00000000000001_my_migration';
```

Option 2: **Reset all migrations** (DESTRUCTIVE!):
```sql
DROP TABLE _migrations;
-- Then redeploy
```

### Local Testing

Test migrations locally before deploying:

```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Run migrations
yarn migrate

# Expected output:
# 🔄 Running Supabase migrations...
# ✅ Connected to database
# Found X migration file(s)
# ✅ Migrations completed successfully!
```

## Advanced Configuration

### Ignore Migration Errors

If you want deployments to continue even if migrations fail:

Add to Vercel environment variables:
```
IGNORE_MIGRATION_ERRORS=true
```

**Warning:** Only use this if you understand the risks. Failed migrations may cause the app to malfunction.

### Custom Migration Directory

The script looks for migrations in `supabase/migrations/` by default. This cannot be changed without modifying `scripts/run-migrations.js`.

### Manual Migration Run

You can also run migrations separately from the build:

```bash
# Install dependencies
yarn install

# Run migrations only
yarn migrate
```

## Creating New Migrations

### Using Supabase CLI (Recommended)

```bash
# Create a new migration
yarn migrate:new add_new_table

# This creates: supabase/migrations/[timestamp]_description.sql

# Edit the file and add your SQL

# Push to repository and deploy
git add .
git commit -m "Add new migration"
git push
```

### Manual Creation

1. Create a file in `supabase/migrations/`
2. Name it with a timestamp: `00000000000002_description.sql`
3. Add your SQL
4. Commit and deploy

## Best Practices

1. **Always use `IF NOT EXISTS`** for idempotent migrations:
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   ```

2. **Use transactions** for complex migrations:
   ```sql
   BEGIN;
   -- Your migration
   COMMIT;
   ```

3. **Test locally first**:
   ```bash
   yarn migrate
   yarn dev
   ```

4. **Never edit applied migrations** - create new ones instead

5. **Keep migrations small** - one logical change per migration

## Rollback Strategy

Vercel doesn't have built-in rollback for migrations. If a migration causes issues:

1. **Create a rollback migration** with the reverse changes:
   ```bash
   yarn migrate:new rollback_previous_change
   ```

2. **Redeploy** to apply the rollback

3. **Or restore from backup:**
   - Supabase Dashboard → Database → Backups

## Environment-Specific Migrations

All migrations run in all environments. If you need environment-specific logic:

```sql
-- Check environment in migration
DO $$
BEGIN
  IF current_database() = 'production_db' THEN
    -- Production-only changes
  END IF;
END $$;
```

## Additional Resources

- [Supabase Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Main Setup Guide](./VERCEL_SUPABASE_SETUP.md)
