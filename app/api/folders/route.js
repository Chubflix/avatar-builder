import { NextResponse } from 'next/server';
import { getDb } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET all folders with image counts
export async function GET() {
    try {
        const db = getDb();

        const folders = db.prepare(`
            SELECT
                f.*,
                COUNT(DISTINCT g.id) as image_count
            FROM character_folders f
            LEFT JOIN generations g ON g.folder_id = f.id
            GROUP BY f.id
            ORDER BY f.name ASC
        `).all();

        return NextResponse.json(folders);
    } catch (error) {
        console.error('Error fetching folders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create new folder
export async function POST(request) {
    try {
        const { name, description, parent_id } = await request.json();

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const db = getDb();
        const id = uuidv4();

        const stmt = db.prepare(`
            INSERT INTO character_folders (id, name, description, parent_id)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(id, name.trim(), description || null, parent_id || null);

        const folder = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);

        return NextResponse.json(folder);
    } catch (error) {
        console.error('Error creating folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
