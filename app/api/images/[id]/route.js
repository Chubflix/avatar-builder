/**
 * Image Detail API
 * Manages individual image operations
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// PUT update image (move to folder)
export async function PUT(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { folderId } = await request.json();

        // Verify folder belongs to user if specified
        if (folderId) {
            const { data: folder, error: folderError } = await supabase
                .from('folders')
                .select('id')
                .eq('id', folderId)
                .eq('user_id', user.id)
                .single();

            if (folderError || !folder) {
                return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            }
        }

        // Update image (RLS ensures user can only update their own)
        const { data: image, error } = await supabase
            .from('images')
            .update({ folder_id: folderId || null })
            .eq('id', id)
            .eq('user_id', user.id)
            .select(`
                *,
                folder:folders(id, name, character:characters(id, name))
            `)
            .single();

        if (error) throw error;

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...image,
            folder_id: image.folder_id || null,
            character_id: image.folder?.character?.id || null
        });
    } catch (error) {
        console.error('Error updating image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE image
export async function DELETE(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Get image info
        const { data: image, error: fetchError } = await supabase
            .from('images')
            .select('storage_path')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('generated-images')
            .remove([image.storage_path]);

        if (storageError) {
            console.error('Error deleting from storage:', storageError);
            // Continue anyway - database deletion is more important
        }

        // Delete from database
        const { error } = await supabase
            .from('images')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
