import { NextResponse } from 'next/server';
import { getDb, ensureFolderDirectory } from '../../../lib/db';

// PUT update folder
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { name, description, parent_id } = await request.json();

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        const db = getDb();

        // Check if folder exists
        const existing = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);
        if (!existing) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Prevent circular parent relationships
        if (parent_id) {
            let currentParentId = parent_id;
            while (currentParentId) {
                if (currentParentId === id) {
                    return NextResponse.json({ error: 'Cannot set folder as its own parent' }, { status: 400 });
                }
                const parent = db.prepare('SELECT parent_id FROM character_folders WHERE id = ?').get(currentParentId);
                currentParentId = parent?.parent_id;
            }
        }

        // Update folder
        const stmt = db.prepare(`
            UPDATE character_folders
            SET name = ?, description = ?, parent_id = ?
            WHERE id = ?
        `);

        stmt.run(name.trim(), description || null, parent_id || null, id);

        // Ensure directory exists with folder ID
        ensureFolderDirectory(id);

        const folder = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);

        return NextResponse.json(folder);
    } catch (error) {
        console.error('Error updating folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE folder
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const db = getDb();

        // Check if folder exists
        const folder = db.prepare('SELECT * FROM character_folders WHERE id = ?').get(id);
        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Get all descendant folder IDs (recursive)
        function getDescendants(folderId) {
            const descendants = [];
            const queue = [folderId];

            while (queue.length > 0) {
                const currentId = queue.shift();
                const children = db.prepare('SELECT id FROM character_folders WHERE parent_id = ?').all(currentId);

                for (const child of children) {
                    descendants.push(child.id);
                    queue.push(child.id);
                }
            }

            return descendants;
        }

        const allFolderIds = [id, ...getDescendants(id)];

        // Start transaction
        const transaction = db.transaction(() => {
            // Move images to parent folder (or null if no parent)
            const updateStmt = db.prepare('UPDATE generations SET folder_id = ? WHERE folder_id = ?');
            for (const folderId of allFolderIds) {
                updateStmt.run(folder.parent_id || null, folderId);
            }

            // Delete all folders (children first due to foreign key)
            const deleteStmt = db.prepare('DELETE FROM character_folders WHERE id = ?');
            // Delete in reverse order (deepest first)
            for (let i = allFolderIds.length - 1; i >= 0; i--) {
                deleteStmt.run(allFolderIds[i]);
            }
        });

        transaction();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
