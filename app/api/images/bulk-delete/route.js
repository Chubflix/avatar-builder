import { NextResponse } from 'next/server';
import { getDb, getImagePath } from '../../../lib/db';
import fs from 'fs';

export async function POST(request) {
    try {
        const { imageIds } = await request.json();

        if (!imageIds || !Array.isArray(imageIds)) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

        const db = getDb();

        const stmt = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?');
        const deleteStmt = db.prepare('DELETE FROM generations WHERE id = ?');

        const transaction = db.transaction(() => {
            for (const id of imageIds) {
                const image = stmt.get(id);
                if (image) {
                    // Delete file
                    const filepath = getImagePath(image.folder_id, image.filename);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }

                    // Delete from database
                    deleteStmt.run(id);
                }
            }
        });

        transaction();

        return NextResponse.json({ success: true, count: imageIds.length });
    } catch (error) {
        console.error('Error bulk deleting images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
