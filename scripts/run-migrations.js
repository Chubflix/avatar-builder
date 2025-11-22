#!/usr/bin/env node

/**
 * Run Supabase migrations during Vercel build
 *
 * This script reads migration files from supabase/migrations/
 * and executes them against the Supabase PostgreSQL database.
 *
 * Uses the 'pg' library for direct PostgreSQL access to execute DDL statements.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runMigrations() {
  log(colors.blue, '🔄 Running Supabase migrations...\n');

  // Check environment variables
  // Supabase connection string format:
  // postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres
  const databaseUrl = process.env.POSTGRES_URL || buildConnectionString();

  if (!databaseUrl) {
    log(colors.red, '❌ Error: Missing database connection');
    console.log('\nSet ONE of these environment variables:');
    console.log('  - DATABASE_URL (PostgreSQL connection string)');
    console.log('  OR');
    console.log('  - SUPABASE_DB_URL (Supabase direct connection)');
    console.log('\nGet it from Supabase Dashboard → Settings → Database → Connection string (Direct)');
    console.log('\nAdd these to your Vercel project settings.\n');
    process.exit(1);
  }

  // Create PostgreSQL client
  // Handle SSL configuration based on environment
  const isLocalSupabase = databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost');

  // SSL configuration for Supabase
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 environment variable if you still get SSL errors
  const sslConfig = isLocalSupabase
    ? false
    : process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false };

  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslConfig
  });

  try {
    log(colors.blue, 'Connecting to database...\n');
    await client.connect();
    log(colors.green, '✅ Connected to database\n');

    // Get migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      log(colors.yellow, '⚠️  No migrations directory found');
      console.log(`Expected: ${migrationsDir}\n`);
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      log(colors.yellow, '⚠️  No migration files found\n');
      return;
    }

    log(colors.blue, `Found ${migrationFiles.length} migration file(s):\n`);
    migrationFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Create migrations tracking table if it doesn't exist
    const createTrackingTable = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(createTrackingTable);
    log(colors.green, '✅ Migration tracking table ready\n');

    // Get already executed migrations
    const { rows: executedRows } = await client.query(
      'SELECT name FROM _migrations ORDER BY id'
    );
    const executedMigrations = executedRows.map(row => row.name);

    if (executedMigrations.length > 0) {
      log(colors.blue, `Previously executed: ${executedMigrations.length} migration(s)\n`);
    }

    // Run each migration
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');

      // Skip if already executed
      if (executedMigrations.includes(migrationName)) {
        log(colors.yellow, `⏭️  Skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      try {
        // Read migration file
        const migrationPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        log(colors.blue, `▶️  Running ${file}...`);

        // Execute migration in a transaction
        await client.query('BEGIN');

        try {
          // Run the migration SQL
          await client.query(sql);

          // Record migration as executed
          await client.query(
            'INSERT INTO _migrations (name) VALUES ($1)',
            [migrationName]
          );

          await client.query('COMMIT');

          log(colors.green, `✅ Completed ${file}`);
          successCount++;

        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }

      } catch (error) {
        log(colors.red, `❌ Failed ${file}`);
        console.error(`   Error: ${error.message}\n`);

        // Check if error is due to already existing objects (idempotent migrations)
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          log(colors.yellow, `   (Migration appears to be partially applied, marking as complete)\n`);

          try {
            await client.query(
              'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
              [migrationName]
            );
            skippedCount++;
          } catch (trackError) {
            errorCount++;
          }
        } else {
          errorCount++;

          // For critical errors, stop execution
          if (!process.env.IGNORE_MIGRATION_ERRORS) {
            log(colors.red, '\n❌ Stopping due to migration error.');
            log(colors.yellow, 'Set IGNORE_MIGRATION_ERRORS=true to continue on errors.\n');
            throw error;
          }
        }
      }
    }

    // Summary
    console.log('\n' + '━'.repeat(50));
    if (errorCount === 0) {
      log(colors.green, `✅ Migrations completed successfully!`);
      console.log(`   Applied: ${successCount}`);
      console.log(`   Skipped: ${skippedCount}`);
    } else {
      log(colors.yellow, `⚠️  Migrations completed with errors`);
      console.log(`   Applied: ${successCount}`);
      console.log(`   Skipped: ${skippedCount}`);
      console.log(`   Failed:  ${errorCount}`);
      console.log('\nNote: Some errors may be expected for idempotent migrations.');
    }
    console.log('━'.repeat(50) + '\n');

  } finally {
    // Close database connection
    await client.end();
    log(colors.blue, 'Database connection closed\n');
  }
}

function buildConnectionString() {
  // Build connection string from Supabase URL and password
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.POSTGRES_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    return null;
  }

  // Extract project ref from URL: https://xxxxx.supabase.co
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  // Build PostgreSQL connection string
  return `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

// Run migrations
runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log(colors.red, '\n❌ Migration script failed:');
    console.error(error);
    process.exit(1);
  });
