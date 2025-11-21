import { NextResponse } from 'next/server';
import { getDb, getImagePath, ensureFolderDirectory } from '../../../lib/db';
import fs from 'fs';

// PUT update image (move to folder)
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { folderId } = await request.json();

        const db = getDb();

        // Get current image
        const image = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?').get(id);
        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Ensure target folder directory exists
        ensureFolderDirectory(folderId || null);

        // Move file
        const oldPath = getImagePath(image.folder_id, image.filename);
        const newPath = getImagePath(folderId || null, image.filename);

        if (oldPath !== newPath && fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
        }

        // Update database
        const stmt = db.prepare('UPDATE generations SET folder_id = ?, file_migrated = 1 WHERE id = ?');
        stmt.run(folderId || null, id);

        const updated = db.prepare(`
            SELECT g.*, f.name as folder_name
            FROM generations g
            LEFT JOIN character_folders f ON g.folder_id = f.id
            WHERE g.id = ?
        `).get(id);

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE image
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const db = getDb();

        // Get image info
        const image = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?').get(id);
        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete file
        const filepath = getImagePath(image.folder_id, image.filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        // Delete from database
        const stmt = db.prepare('DELETE FROM generations WHERE id = ?');
        stmt.run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
