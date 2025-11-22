# Vercel + Supabase Deployment Guide

This guide explains how to deploy Avatar Builder to Vercel with Supabase database and run migrations automatically.

## Prerequisites

- Supabase account with a project created
- Vercel account
- GitHub repository connected to Vercel
- Supabase CLI installed locally (`brew install supabase/tap/supabase` or `npm i -g supabase`)

## Setup Steps

### 1. Link Your Supabase Project

First, link your local repository to your Supabase project:

```bash
# Login to Supabase CLI
supabase login

# Link to your project (get project-ref from Supabase dashboard)
supabase link --project-ref your-project-ref
```

### 2. Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stable Diffusion API
NEXT_PUBLIC_SD_API_URL=https://your-sd-api-url

# Application URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
- Copy the `anon/public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- Copy the `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

### 3. Configure GitHub Secrets for Automated Migrations

For the GitHub Actions workflow to run migrations automatically, add these secrets to your GitHub repository:

**Go to: Repository → Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

```
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
```

**How to get these values:**

#### Supabase Secrets:
1. **SUPABASE_ACCESS_TOKEN**:
   ```bash
   supabase login
   # Token will be saved, retrieve it with:
   cat ~/.supabase/access-token
   ```

2. **SUPABASE_PROJECT_ID**:
   - Go to Supabase Dashboard → Settings → General
   - Copy the "Reference ID"

3. **SUPABASE_DB_PASSWORD**:
   - Go to Supabase Dashboard → Settings → Database
   - Copy the database password (or reset it if you don't have it)

#### Vercel Secrets:
1. **VERCEL_TOKEN**:
   - Go to Vercel → Settings → Tokens
   - Create a new token

2. **VERCEL_ORG_ID** and **VERCEL_PROJECT_ID**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link

   # Get IDs from .vercel/project.json
   cat .vercel/project.json
   ```

### 4. Deployment Options

You have three options for running migrations:

#### Option A: Automated GitHub Actions (Recommended)

The included `.github/workflows/deploy.yml` will automatically:
1. Run migrations on Supabase
2. Deploy to Vercel

**Every time you push to `main` branch**, migrations run automatically before deployment.

#### Option B: Manual Migration Before Deploy

Run migrations manually before deploying:

```bash
# Link your Supabase project (one-time setup)
supabase link --project-ref your-project-ref

# Push migrations to production
npm run migrate

# Or directly:
supabase db push
```

Then deploy normally via Vercel (Git push or `vercel --prod`).

#### Option C: Vercel Build Command with Migration Script

Update `vercel.json` to run migrations during build:

```json
{
  "buildCommand": "npm run migrate && yarn build",
  "devCommand": "yarn dev",
  "installCommand": "yarn install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Note**: This requires adding SUPABASE_* environment variables to Vercel and installing Supabase CLI in the build environment (not recommended as it increases build time).

## Local Development

### Start Local Supabase

```bash
# Start local Supabase (Docker required)
npm run supabase:start

# This will start:
# - PostgreSQL database (port 54322)
# - Studio UI (http://localhost:54323)
# - API server (http://localhost:54321)
```

### Run Migrations Locally

```bash
# Apply all pending migrations
npm run migrate

# Reset database and reapply all migrations
npm run supabase:reset

# Create a new migration
npm run migrate:new migration_name
```

### Development Workflow

1. Start Supabase: `npm run supabase:start`
2. Start Next.js: `npm run dev`
3. Access Studio: http://localhost:54323
4. Access App: http://localhost:3000

## Migration Management

### Creating New Migrations

```bash
# Create a new migration file
npm run migrate:new add_new_feature

# Edit the generated file in supabase/migrations/
# Then apply it:
npm run migrate
```

### Migration File Naming

Migrations are timestamped and run in order:
```
supabase/migrations/
├── 00000000000000_initial_schema.sql
├── 00000000000001_create_storage_bucket.sql
└── 00000000000002_your_new_migration.sql
```

### Checking Migration Status

```bash
# View Supabase status (local)
npm run supabase:status

# Check remote project
supabase db diff --linked
```

## Troubleshooting

### Migrations Not Running on Vercel

1. **Check GitHub Actions logs**:
   - Go to GitHub → Actions tab
   - Check the latest workflow run for errors

2. **Verify secrets are set**:
   - GitHub → Settings → Secrets and variables → Actions
   - Ensure all required secrets are present

3. **Manual migration push**:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

### "Error: Migration already applied"

This is normal if migrations have already run. Supabase tracks which migrations have been applied and skips them automatically.

### "Unable to connect to database"

1. Check your Supabase project is running (not paused)
2. Verify database password is correct
3. Check IP restrictions in Supabase → Settings → Database → Connection pooling

### Vercel Build Fails

1. Check environment variables are set correctly
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present
3. Check build logs in Vercel dashboard

## Best Practices

1. **Always test migrations locally first**:
   ```bash
   supabase db reset  # Reset local DB
   npm run dev        # Test the app
   ```

2. **Use transactions in migrations** for complex changes:
   ```sql
   BEGIN;
   -- Your migration SQL
   COMMIT;
   ```

3. **Never edit applied migrations** - create new ones instead

4. **Backup before major migrations**:
   - Supabase Dashboard → Database → Backups

5. **Use descriptive migration names**:
   ```bash
   npm run migrate:new add_user_preferences_table
   npm run migrate:new fix_image_storage_path_constraint
   ```

## Additional Resources

- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
