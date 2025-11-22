#!/usr/bin/env node

/**
 * Import data from SQLite to Supabase
 *
 * Migrates:
 * - Root folders (parent_id = NULL) → characters
 * - Child folders → folders (linked to characters)
 * - Images → Supabase Storage + images table
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Configuration
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'avatar-builder.db');
const GENERATED_DIR = path.join(DATA_DIR, 'generated');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hardcoded user ID for import
const USER_ID = '63289aab-77fc-4153-9d50-63be3a047202';

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  log(colors.red, '❌ Error: Missing Supabase credentials');
  console.log('\nRequired environment variables:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  console.log('\nExample:');
  console.log('  export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
  console.log('  yarn import\n');
  process.exit(1);
}

// Initialize clients (using service role key to bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function importData() {
  log(colors.blue, '🔄 Starting data import from SQLite to Supabase...\n');

  // Check SQLite database exists
  if (!fs.existsSync(DB_PATH)) {
    log(colors.red, `❌ SQLite database not found: ${DB_PATH}`);
    process.exit(1);
  }

  // Check generated directory exists
  if (!fs.existsSync(GENERATED_DIR)) {
    log(colors.red, `❌ Generated images directory not found: ${GENERATED_DIR}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  try {
    // Step 1: Verify connection and storage bucket
    log(colors.cyan, '📝 Step 1: Verifying Supabase connection...');
    log(colors.blue, `  Using user ID: ${USER_ID}`);
    log(colors.blue, `  Supabase URL: ${SUPABASE_URL}`);

    // Test storage bucket access
    log(colors.blue, '  Testing storage bucket access...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      log(colors.red, `  ❌ Cannot access storage: ${bucketError.message}`);
      log(colors.yellow, '\n  Check your SUPABASE_SERVICE_ROLE_KEY is correct\n');
      process.exit(1);
    }

    const generatedBucket = buckets?.find(b => b.name === 'generated-images');
    if (!generatedBucket) {
      log(colors.red, '  ❌ Storage bucket "generated-images" not found!');
      log(colors.yellow, '\n  Run migrations first to create the bucket:');
      console.log('    yarn migrate\n');
      process.exit(1);
    }

    log(colors.green, '  ✅ Storage bucket "generated-images" found');
    log(colors.green, `  ✅ Connection verified\n`);

    // Step 2: Get data from SQLite
    log(colors.cyan, '📊 Step 2: Reading SQLite database...');

    const rootFolders = db.prepare(`
      SELECT * FROM character_folders
      WHERE parent_id IS NULL
      ORDER BY created_at
    `).all();

    const childFolders = db.prepare(`
      SELECT * FROM character_folders
      WHERE parent_id IS NOT NULL
      ORDER BY created_at
    `).all();

    const images = db.prepare(`
      SELECT * FROM generations
      ORDER BY created_at
    `).all();

    log(colors.blue, `  Found ${rootFolders.length} root folders (→ characters)`);
    log(colors.blue, `  Found ${childFolders.length} child folders (→ folders)`);
    log(colors.blue, `  Found ${images.length} images\n`);

    // Step 3: Import root folders as characters
    log(colors.cyan, '👤 Step 3: Importing characters...');
    const characterMap = {}; // SQLite folder_id → Supabase character_id

    for (const folder of rootFolders) {
      log(colors.blue, `  Creating character: ${folder.name}`);

      const { data, error } = await supabase
        .from('characters')
        .insert({
          name: folder.name,
          description: folder.description,
          user_id: USER_ID,
        })
        .select()
        .single();

      if (error) {
        log(colors.red, `  ❌ Failed: ${error.message}`);
        continue;
      }

      characterMap[folder.id] = data.id;
      log(colors.green, `  ✅ Created: ${folder.name} (${data.id})`);
    }
    console.log('');

    // Step 4: Import child folders
    log(colors.cyan, '📁 Step 4: Importing folders...');
    const folderMap = {}; // SQLite folder_id → Supabase folder_id

    for (const folder of childFolders) {
      const characterId = characterMap[folder.parent_id];

      if (!characterId) {
        log(colors.yellow, `  ⚠️  Skipping ${folder.name} (parent not found)`);
        continue;
      }

      log(colors.blue, `  Creating folder: ${folder.name}`);

      const { data, error } = await supabase
        .from('folders')
        .insert({
          character_id: characterId,
          name: folder.name,
          description: folder.description,
          user_id: USER_ID,
        })
        .select()
        .single();

      if (error) {
        log(colors.red, `  ❌ Failed: ${error.message}`);
        continue;
      }

      folderMap[folder.id] = data.id;
      log(colors.green, `  ✅ Created: ${folder.name} (${data.id})`);
    }
    console.log('');

    // Step 5: Import images
    log(colors.cyan, '🖼️  Step 5: Importing images...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [index, image] of images.entries()) {
      const progress = `[${index + 1}/${images.length}]`;

      // Determine file path (check multiple locations)
      let imagePath = null;
      const possiblePaths = [];

      // Path 1: Root of generated directory
      const rootPath = path.join(GENERATED_DIR, image.filename);
      possiblePaths.push(rootPath);

      // Path 2: In folder directory by folder ID (PRIMARY - this is how files are organized!)
      if (image.folder_id) {
        const folderIdPath = path.join(GENERATED_DIR, image.folder_id, image.filename);
        possiblePaths.push(folderIdPath);
      }

      // Path 3: In folder directory by sanitized folder name (legacy)
      if (image.folder_id) {
        const folderName = rootFolders.find(f => f.id === image.folder_id)?.name ||
                          childFolders.find(f => f.id === image.folder_id)?.name;
        if (folderName) {
          const sanitizedName = folderName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          const folderPath = path.join(GENERATED_DIR, sanitizedName, image.filename);
          possiblePaths.push(folderPath);
        }
      }

      // Path 4: Check if filename already contains a path component
      if (image.filename.includes('/')) {
        const fullPath = path.join(GENERATED_DIR, image.filename);
        possiblePaths.push(fullPath);
      }

      // Find the first path that exists
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          imagePath = testPath;
          break;
        }
      }

      if (!imagePath) {
        if (process.env.DEBUG) {
          log(colors.yellow, `  ${progress} ⚠️  Skipping ${image.filename} (file not found)`);
          console.log(`    Checked paths:`, possiblePaths);
        } else {
          log(colors.yellow, `  ${progress} ⚠️  Skipping ${image.filename} (file not found)`);
        }
        skipCount++;
        continue;
      }

      try {
        // Upload to Supabase Storage
        const storagePath = `${USER_ID}/${image.filename}`;
        const fileBuffer = fs.readFileSync(imagePath);

        log(colors.blue, `  ${progress} Uploading ${image.filename} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

        const { error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(storagePath, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          log(colors.red, `  ${progress} ❌ Upload failed: ${uploadError.message}`);

          // Log more details for debugging
          if (uploadError.message.includes('fetch failed')) {
            log(colors.yellow, `  ${progress}    Connection issue detected. Retrying in 2s...`);

            // Retry once after a delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            const { error: retryError } = await supabase.storage
              .from('generated-images')
              .upload(storagePath, fileBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (retryError) {
              log(colors.red, `  ${progress} ❌ Retry failed: ${retryError.message}`);
              errorCount++;
              continue;
            } else {
              log(colors.green, `  ${progress} ✅ Upload succeeded on retry`);
            }
          } else {
            errorCount++;
            continue;
          }
        }

        // Determine folder_id for Supabase
        let supabaseFolderId = null;
        if (image.folder_id) {
          // Check if it's a child folder or root folder
          supabaseFolderId = folderMap[image.folder_id] || null;
        }

        // Parse loras JSON if exists
        let lorasJson = null;
        if (image.loras) {
          try {
            lorasJson = JSON.parse(image.loras);
          } catch (e) {
            // Invalid JSON, skip
          }
        }

        // Parse info_json if exists
        let infoJson = null;
        if (image.info_json) {
          try {
            infoJson = JSON.parse(image.info_json);
          } catch (e) {
            // Invalid JSON, skip
          }
        }

        // Create image record
        const { error: insertError } = await supabase
          .from('images')
          .insert({
            folder_id: supabaseFolderId,
            filename: image.filename,
            storage_path: storagePath,
            positive_prompt: image.positive_prompt,
            negative_prompt: image.negative_prompt,
            model: image.model,
            orientation: image.orientation,
            width: image.width,
            height: image.height,
            batch_size: image.batch_size,
            sampler_name: image.sampler_name,
            scheduler: image.scheduler,
            steps: image.steps,
            cfg_scale: image.cfg_scale,
            seed: image.seed,
            adetailer_enabled: image.adetailer_enabled === 1,
            adetailer_model: image.adetailer_model,
            info_json: infoJson,
            loras: lorasJson,
            user_id: USER_ID,
          });

        if (insertError) {
          log(colors.red, `  ${progress} ❌ Database insert failed: ${insertError.message}`);
          errorCount++;
          continue;
        }

        successCount++;
        if (successCount % 10 === 0) {
          log(colors.green, `  ${progress} ✅ Imported ${successCount} images so far...`);
        }

      } catch (error) {
        log(colors.red, `  ${progress} ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '━'.repeat(50));
    log(colors.green, '✅ Import completed!');
    console.log(`\nCharacters: ${rootFolders.length} imported`);
    console.log(`Folders:    ${childFolders.length} imported`);
    console.log(`\nImages:`);
    console.log(`  ✅ Imported: ${successCount}`);
    console.log(`  ⚠️  Skipped:  ${skipCount} (files not found)`);
    console.log(`  ❌ Failed:   ${errorCount}`);
    console.log('━'.repeat(50) + '\n');

    if (errorCount > 0) {
      log(colors.yellow, '⚠️  Some images failed to import. Check the errors above.\n');
    }

  } catch (error) {
    log(colors.red, `\n❌ Import failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run import
importData()
  .then(() => {
    log(colors.green, '🎉 Import script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    log(colors.red, '\n❌ Import script failed:');
    console.error(error);
    process.exit(1);
  });
