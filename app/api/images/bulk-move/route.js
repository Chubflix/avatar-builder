import { NextResponse } from 'next/server';
import { getDb, getImagePath, ensureFolderDirectory } from '../../../lib/db';
import fs from 'fs';

export async function POST(request) {
    try {
        const { imageIds, folderId } = await request.json();

        if (!imageIds || !Array.isArray(imageIds)) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

        const db = getDb();

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

        return NextResponse.json({ success: true, count: imageIds.length });
    } catch (error) {
        console.error('Error bulk moving images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
