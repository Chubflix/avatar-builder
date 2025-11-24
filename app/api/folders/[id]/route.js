/**
 * Folder Detail API
 * Manages individual folder operations
 */

import { NextResponse } from 'next/server';
import { createAuthClient, deleteImageFromStorage } from '@/app/lib/supabase-server';

// PUT update folder
export async function PUT(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Update folder (RLS ensures user can only update their own)
        const { data: folder, error } = await supabase
            .from('folders')
            .update({
                name: name.trim(),
                description: description?.trim() || null,
            })
            .eq('id', id)
            .eq('user_id', user.id) // Extra safety check
            .select(`
                *,
                character:characters(id, name)
            `)
            .single();

        if (error) throw error;

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json(folder);
    } catch (error) {
        console.error('Error updating folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE folder
export async function DELETE(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Get images in this folder to delete from storage
        const { data: images, error: imagesError } = await supabase
            .from('images')
            .select('storage_path')
            .eq('folder_id', id)
            .eq('user_id', user.id);

        if (imagesError) throw imagesError;

        // Delete images from S3 storage (best-effort)
        if (images && images.length > 0) {
            await Promise.allSettled(
                images.map(img => deleteImageFromStorage(img.storage_path))
            );
        }

        // Delete folder (will set folder_id to NULL on images due to ON DELETE SET NULL)
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Extra safety check

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
