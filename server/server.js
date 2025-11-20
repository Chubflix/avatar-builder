const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Paths - configurable via environment variables for Docker
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const GENERATED_DIR = process.env.GENERATED_DIR || path.join(DATA_DIR, 'generated');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'avatar-builder.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);

// ==================== HELPER FUNCTIONS ====================

// Get the file path for an image
function getImagePath(folderId, filename) {
    if (folderId) {
        const folder = db.prepare('SELECT name FROM character_folders WHERE id = ?').get(folderId);
        if (folder) {
            // Sanitize folder name for filesystem
            const sanitizedName = folder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const folderPath = path.join(GENERATED_DIR, sanitizedName);
            return path.join(folderPath, filename);
        }
    }
    // Default to root generated directory
    return path.join(GENERATED_DIR, filename);
}

// Ensure folder directory exists
function ensureFolderDirectory(folderId) {
    if (!folderId) return GENERATED_DIR;
    
    const folder = db.prepare('SELECT name FROM character_folders WHERE id = ?').get(folderId);
    if (folder) {
        const sanitizedName = folder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const folderPath = path.join(GENERATED_DIR, sanitizedName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        return folderPath;
    }
    return GENERATED_DIR;
}

// Get URL path for an image
function getImageUrl(folderId, filename) {
    if (folderId) {
        const folder = db.prepare('SELECT name FROM character_folders WHERE id = ?').get(folderId);
        if (folder) {
            const sanitizedName = folder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            return `/generated/${sanitizedName}/${filename}`;
        }
    }
    return `/generated/${filename}`;
}

// ==================== MIGRATION SYSTEM ====================

function runMigrations() {
    // Create migrations table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Get list of applied migrations
    const appliedMigrations = db.prepare('SELECT name FROM migrations').all().map(m => m.name);

    // Get all migration files
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
            
            const transaction = db.transaction(() => {
                for (const statement of statements) {
                    if (statement.trim()) {
                        try {
                            db.exec(statement);
                        } catch (err) {
                            // Ignore "duplicate column" errors for ALTER TABLE
                            if (!err.message.includes('duplicate column name')) {
                                throw err;
                            }
                        }
                    }
                }
                
                // Record migration as applied
                db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
            });
            
            transaction();
            console.log(`Migration ${migrationName} applied successfully`);
        }
    }
    
    // After migrations, organize existing files into folders
    organizeExistingFiles();
}

// Organize existing files into character folders
function organizeExistingFiles() {
    try {
        // Get all images that need to be migrated
        const images = db.prepare(`
            SELECT id, filename, folder_id, file_migrated
            FROM generations
            WHERE folder_id IS NOT NULL AND (file_migrated IS NULL OR file_migrated = 0)
        `).all();
        
        if (images.length === 0) return;
        
        console.log(`Organizing ${images.length} existing files into folders...`);
        
        for (const image of images) {
            const oldPath = path.join(GENERATED_DIR, image.filename);
            const newPath = getImagePath(image.folder_id, image.filename);
            
            // Only move if file exists at old location and not at new location
            if (fs.existsSync(oldPath) && oldPath !== newPath) {
                try {
                    // Ensure directory exists
                    ensureFolderDirectory(image.folder_id);
                    
                    // Move the file
                    fs.renameSync(oldPath, newPath);
                    
                    // Mark as migrated
                    db.prepare('UPDATE generations SET file_migrated = 1 WHERE id = ?').run(image.id);
                    
                    console.log(`Moved ${image.filename} to folder`);
                } catch (err) {
                    console.error(`Failed to move ${image.filename}:`, err.message);
                }
            } else if (fs.existsSync(newPath)) {
                // File already at correct location, just mark as migrated
                db.prepare('UPDATE generations SET file_migrated = 1 WHERE id = ?').run(image.id);
            }
        }
        
        console.log('File organization complete');
    } catch (err) {
        console.error('Error organizing files:', err);
    }
}

// Run migrations on startup
runMigrations();

// Serve generated images with folder support
app.use('/generated', express.static(GENERATED_DIR));

// ==================== FOLDER ENDPOINTS ====================

// Get all folders
app.get('/api/folders', (req, res) => {
    try {
        const folders = db.prepare(`
            SELECT 
                f.*,
                COUNT(g.id) as image_count
            FROM character_folders f
            LEFT JOIN generations g ON g.folder_id = f.id
            GROUP BY f.id
            ORDER BY f.name ASC
        `).all();
        
        res.json(folders);
    } catch (err) {
        console.error('Error fetching folders:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new folder
app.post('/api/folders', (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        
        const id = uuidv4();
        
        db.prepare(`
            INSERT INTO character_folders (id, name, description)
            VALUES (?, ?, ?)
        `).run(id, name.trim(), description || null);
        
        // Create the folder directory
        ensureFolderDirectory(id);
        
        const folder = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);
        
        res.json(folder);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A folder with this name already exists' });
        }
        console.error('Error creating folder:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update a folder
app.put('/api/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        
        // Get old folder info
        const oldFolder = db.prepare('SELECT name FROM character_folders WHERE id = ?').get(id);
        
        if (!oldFolder) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        // Update database
        db.prepare(`
            UPDATE character_folders 
            SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name.trim(), description || null, id);
        
        // If name changed, rename the directory
        if (oldFolder.name !== name.trim()) {
            const oldSanitized = oldFolder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const newSanitized = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const oldPath = path.join(GENERATED_DIR, oldSanitized);
            const newPath = path.join(GENERATED_DIR, newSanitized);
            
            if (fs.existsSync(oldPath) && oldPath !== newPath) {
                fs.renameSync(oldPath, newPath);
            }
        }
        
        const folder = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);
        
        res.json(folder);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A folder with this name already exists' });
        }
        console.error('Error updating folder:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete a folder (images will have folder_id set to NULL)
app.delete('/api/folders/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get folder info
        const folder = db.prepare('SELECT name FROM character_folders WHERE id = ?').get(id);
        
        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }
        
        // Get all images in this folder
        const images = db.prepare('SELECT filename FROM generations WHERE folder_id = ?').all(id);
        
        // Move images back to root
        const sanitizedName = folder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const folderPath = path.join(GENERATED_DIR, sanitizedName);
        
        for (const image of images) {
            const oldPath = path.join(folderPath, image.filename);
            const newPath = path.join(GENERATED_DIR, image.filename);
            
            if (fs.existsSync(oldPath)) {
                try {
                    fs.renameSync(oldPath, newPath);
                } catch (err) {
                    console.error(`Failed to move ${image.filename}:`, err.message);
                }
            }
        }
        
        // Update database to remove folder references
        db.prepare('UPDATE generations SET folder_id = NULL, file_migrated = 0 WHERE folder_id = ?').run(id);
        
        // Delete folder from database
        db.prepare('DELETE FROM character_folders WHERE id = ?').run(id);
        
        // Remove directory if empty
        if (fs.existsSync(folderPath)) {
            try {
                fs.rmdirSync(folderPath);
            } catch (err) {
                // Directory might not be empty, that's okay
                console.log(`Folder directory not empty, keeping: ${folderPath}`);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting folder:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== IMAGE ENDPOINTS ====================

// Get images with pagination and optional folder filter
app.get('/api/images', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const folderId = req.query.folder_id || null;
        
        let whereClause = '';
        let params = [limit, offset];
        
        if (folderId === 'null' || folderId === 'unfiled') {
            whereClause = 'WHERE g.folder_id IS NULL';
        } else if (folderId) {
            whereClause = 'WHERE g.folder_id = ?';
            params = [folderId, limit, offset];
        }
        
        const images = db.prepare(`
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
            ${whereClause}
            ORDER BY g.created_at DESC 
            LIMIT ? OFFSET ?
        `).all(...params);
        
        // Add image URLs
        const imagesWithUrls = images.map(img => ({
            ...img,
            url: getImageUrl(img.folder_id, img.filename)
        }));
        
        let countParams = [];
        if (folderId === 'null' || folderId === 'unfiled') {
            countParams = [];
        } else if (folderId) {
            countParams = [folderId];
        }
        
        const total = db.prepare(`
            SELECT COUNT(*) as count 
            FROM generations g
            ${whereClause}
        `).get(...countParams);
        
        res.json({
            images: imagesWithUrls,
            total: total.count,
            hasMore: offset + images.length < total.count
        });
    } catch (err) {
        console.error('Error fetching images:', err);
        res.status(500).json({ error: err.message });
    }
});

// Save a new image
app.post('/api/images', (req, res) => {
    try {
        const {
            imageData,
            positivePrompt,
            negativePrompt,
            model,
            orientation,
            width,
            height,
            batchSize,
            samplerName,
            scheduler,
            steps,
            cfgScale,
            seed,
            adetailerEnabled,
            adetailerModel,
            info,
            folderId
        } = req.body;
        
        const id = uuidv4();
        const filename = `${id}.png`;
        
        // Ensure folder directory exists
        const targetDir = ensureFolderDirectory(folderId || null);
        const filepath = path.join(targetDir, filename);
        
        // Save image to file
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filepath, base64Data, 'base64');
        
        // Save to database
        const stmt = db.prepare(`
            INSERT INTO generations (
                id, filename, positive_prompt, negative_prompt, model,
                orientation, width, height, batch_size, sampler_name,
                scheduler, steps, cfg_scale, seed, adetailer_enabled,
                adetailer_model, info_json, folder_id, file_migrated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            id,
            filename,
            positivePrompt,
            negativePrompt,
            model,
            orientation,
            width,
            height,
            batchSize,
            samplerName,
            scheduler,
            steps,
            cfgScale,
            seed,
            adetailerEnabled ? 1 : 0,
            adetailerModel,
            JSON.stringify(info || {}),
            folderId || null,
            1 // Already in correct location
        );
        
        const saved = db.prepare(`
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
            WHERE g.id = ?
        `).get(id);
        
        res.json({
            ...saved,
            url: getImageUrl(saved.folder_id, saved.filename)
        });
    } catch (err) {
        console.error('Error saving image:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update image (move to folder)
app.put('/api/images/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { folderId } = req.body;
        
        // Get current image info
        const image = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?').get(id);
        
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // Move file if folder changed
        if (image.folder_id !== folderId) {
            const oldPath = getImagePath(image.folder_id, image.filename);
            const newPath = getImagePath(folderId || null, image.filename);
            
            if (oldPath !== newPath && fs.existsSync(oldPath)) {
                // Ensure target directory exists
                ensureFolderDirectory(folderId || null);
                
                // Move the file
                fs.renameSync(oldPath, newPath);
            }
        }
        
        // Update database
        db.prepare(`
            UPDATE generations 
            SET folder_id = ?, file_migrated = 1
            WHERE id = ?
        `).run(folderId || null, id);
        
        const updated = db.prepare(`
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
            WHERE g.id = ?
        `).get(id);
        
        res.json({
            ...updated,
            url: getImageUrl(updated.folder_id, updated.filename)
        });
    } catch (err) {
        console.error('Error updating image:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete an image
app.delete('/api/images/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Get image info
        const image = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?').get(id);
        
        if (image) {
            // Delete file
            const filepath = getImagePath(image.folder_id, image.filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            
            // Delete from database
            db.prepare('DELETE FROM generations WHERE id = ?').run(id);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting image:', err);
        res.status(500).json({ error: err.message });
    }
});

// Bulk move images to folder
app.post('/api/images/bulk-move', (req, res) => {
    try {
        const { imageIds, folderId } = req.body;
        
        if (!imageIds || !Array.isArray(imageIds)) {
            return res.status(400).json({ error: 'imageIds array is required' });
        }
        
        // Ensure target folder directory exists
        ensureFolderDirectory(folderId || null);
        
        const stmt = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?');
        const updateStmt = db.prepare('UPDATE generations SET folder_id = ?, file_migrated = 1 WHERE id = ?');
        
        const transaction = db.transaction(() => {
            for (const id of imageIds) {
                const image = stmt.get(id);
                if (image) {
                    // Move file
                    const oldPath = getImagePath(image.folder_id, image.filename);
                    const newPath = getImagePath(folderId || null, image.filename);
                    
                    if (oldPath !== newPath && fs.existsSync(oldPath)) {
                        fs.renameSync(oldPath, newPath);
                    }
                    
                    // Update database
                    updateStmt.run(folderId || null, id);
                }
            }
        });
        
        transaction();
        
        res.json({ success: true, count: imageIds.length });
    } catch (err) {
        console.error('Error bulk moving images:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Avatar Builder server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Generated images: ${GENERATED_DIR}`);
    console.log(`Database: ${DB_PATH}`);
});
