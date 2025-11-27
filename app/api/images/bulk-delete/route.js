/**
 * Bulk Delete Images API
 * Deletes multiple images from storage and database
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { deleteImageFromStorage } from '@/app/lib/s3-server';
import {publishRealtimeEvent} from "@/app/lib/ably";

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

        // Get storage paths for all images
        const { data: images, error: fetchError } = await supabase
            .from('images')
            .select('storage_path')
            .in('id', imageIds)
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Delete from database
        const { data: deletedImages, error } = await supabase
            .from('images')
            .delete()
            .in('id', imageIds)
            .eq('user_id', user.id)
            .select(`
                id, folder_id,
                folder:folders(id, character:characters(id))
            `);

        // Delete from S3 storage (best-effort per object)
        if (images && images.length > 0) {
            const deletes = images.map(img => deleteImageFromStorage(img.storage_path).catch(e => {
                console.error('Error deleting from storage:', e);
            }));
            await Promise.allSettled(deletes);
        }

        if (error) throw error;

        for (const image of deletedImages) {
            // Publish realtime event
            await publishRealtimeEvent('images', 'image_deleted', {
                id: image.id,
                user_id: user.id,
                folder_id: image.folder?.id,
                character_id: image.folder?.character?.id || null
            });
        }

        return NextResponse.json({ success: true, count: imageIds.length });
    } catch (error) {
        console.error('Error bulk deleting images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
