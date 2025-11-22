/**
 * Bulk Delete Images API
 * Deletes multiple images from storage and database
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

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

        // Delete from storage
        if (images && images.length > 0) {
            const storagePaths = images.map(img => img.storage_path);
            const { error: storageError } = await supabase.storage
                .from('generated-images')
                .remove(storagePaths);

            if (storageError) {
                console.error('Error deleting from storage:', storageError);
                // Continue anyway - database deletion is more important
            }
        }

        // Delete from database
        const { error } = await supabase
            .from('images')
            .delete()
            .in('id', imageIds)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, count: imageIds.length });
    } catch (error) {
        console.error('Error bulk deleting images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
