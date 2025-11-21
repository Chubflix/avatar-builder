import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Paths - configurable via environment variables
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const GENERATED_DIR = process.env.GENERATED_DIR || path.join(DATA_DIR, 'generated');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'avatar-builder.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Initialize SQLite database (singleton)
let db = null;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        runMigrations();
    }
    return db;
}

// ==================== MIGRATION SYSTEM ====================

function runMigrations() {
    const database = db || new Database(DB_PATH);

    // Create migrations table if it doesn't exist
    database.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Get list of applied migrations
    const appliedMigrations = database.prepare('SELECT name FROM migrations').all().map(m => m.name);

    // Get all migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.log('Migrations directory not found, skipping migrations');
        return;
    }

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    // Run pending migrations
    for (const file of migrationFiles) {
        const migrationName = file.replace('.sql', '');

        if (!appliedMigrations.includes(migrationName)) {
            console.log(`Running migration: ${migrationName}`);

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

            // Split by semicolon and run each statement
            const statements = sql.split(';').filter(s => s.trim());

            const transaction = database.transaction(() => {
                for (const statement of statements) {
                    if (statement.trim()) {
                        database.exec(statement);
                    }
                }
                database.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
            });

            transaction();
            console.log(`Migration ${migrationName} completed`);
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

export function getImagePath(folderId, filename) {
    if (folderId) {
        const folderPath = path.join(GENERATED_DIR, folderId);
        return path.join(folderPath, filename);
    }
    return path.join(GENERATED_DIR, filename);
}

export function ensureFolderDirectory(folderId) {
    if (!folderId) return GENERATED_DIR;

    const folderPath = path.join(GENERATED_DIR, folderId);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderPath;
}

export function getImageUrl(folderId, filename) {
    if (folderId) {
        return `/generated/${folderId}/${filename}`;
    }
    return `/generated/${filename}`;
}

export function getDescendantFolderIds(database, folderId) {
    const descendants = [];
    const queue = [folderId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = database.prepare('SELECT id FROM character_folders WHERE parent_id = ?').all(currentId);

        for (const child of children) {
            descendants.push(child.id);
            queue.push(child.id);
        }
    }

    return descendants;
}

export function getFolderPath(database, folderId) {
    if (!folderId) return null;

    const parts = [];
    let currentId = folderId;

    while (currentId) {
        const folder = database.prepare('SELECT name, parent_id FROM character_folders WHERE id = ?').get(currentId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentId = folder.parent_id;
    }

    return parts.join(' / ');
}

export { getDb, DATA_DIR, GENERATED_DIR, DB_PATH };
