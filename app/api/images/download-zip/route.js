/**
 * Download ZIP API
 * Creates a ZIP archive of selected images from Supabase Storage
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import archiver from 'archiver';

export async function POST(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageIds } = await request.json();

        if (!imageIds || !Array.isArray(imageIds)) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

        // Get image metadata
        const { data: images, error: fetchError } = await supabase
            .from('images')
            .select('filename, storage_path')
            .in('id', imageIds)
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        if (!images || images.length === 0) {
            return NextResponse.json({ error: 'No images found' }, { status: 404 });
        }

        // Create archive
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

        // Download and add each image to archive
        const downloadPromises = images.map(async (image) => {
            try {
                // Download from Supabase Storage
                const { data: blob, error } = await supabase.storage
                    .from('generated-images')
                    .download(image.storage_path);

                if (error) {
                    console.error(`Error downloading ${image.filename}:`, error);
                    return;
                }

                // Convert blob to buffer
                const buffer = Buffer.from(await blob.arrayBuffer());

                // Add to archive
                archive.append(buffer, { name: image.filename });
            } catch (err) {
                console.error(`Error processing ${image.filename}:`, err);
            }
        });

        // Wait for all downloads to complete
        await Promise.all(downloadPromises);

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
