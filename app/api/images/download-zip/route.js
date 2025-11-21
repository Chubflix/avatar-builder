import { NextResponse } from 'next/server';
import { getDb, getImagePath } from '../../../lib/db';
import archiver from 'archiver';
import fs from 'fs';
import { Readable } from 'stream';

export async function POST(request) {
    try {
        const { imageIds } = await request.json();

        if (!imageIds || !Array.isArray(imageIds)) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

        const db = getDb();
        const archive = archiver('zip', { zlib: { level: 9 } });

        // Create a readable stream for Next.js response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Pipe archive to writer
        archive.on('data', (chunk) => {
            writer.write(chunk);
        });

        archive.on('end', () => {
            writer.close();
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            writer.abort(err);
        });

        // Add images to archive
        const stmt = db.prepare('SELECT filename, folder_id FROM generations WHERE id = ?');

        for (const id of imageIds) {
            const image = stmt.get(id);
            if (image) {
                const filepath = getImagePath(image.folder_id, image.filename);
                if (fs.existsSync(filepath)) {
                    archive.file(filepath, { name: image.filename });
                }
            }
        }

        // Finalize the archive
        archive.finalize();

        // Return the stream as a response
        return new NextResponse(readable, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="images-${Date.now()}.zip"`
            }
        });
    } catch (error) {
        console.error('Error creating zip:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
