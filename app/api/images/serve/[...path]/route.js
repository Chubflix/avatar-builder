import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GENERATED_DIR = process.env.GENERATED_DIR || path.join(process.cwd(), 'data', 'generated');

export async function GET(request, { params }) {
    try {
        const { path: filePath } = params;

        // Join the path segments
        const fullPath = path.join(GENERATED_DIR, ...filePath);

        // Security check: ensure the resolved path is within GENERATED_DIR
        const resolvedPath = path.resolve(fullPath);
        const resolvedBaseDir = path.resolve(GENERATED_DIR);

        if (!resolvedPath.startsWith(resolvedBaseDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
        }

        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Read the file
        const fileBuffer = fs.readFileSync(resolvedPath);

        // Determine content type
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        // Return the image
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
