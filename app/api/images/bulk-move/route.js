/**
 * Bulk Move Images API
 * Moves multiple images to a different folder
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

        const { imageIds, folderId } = await request.json();

        if (!imageIds || !Array.isArray(imageIds)) {
            return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 });
        }

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

        // Update images (RLS ensures user can only update their own)
        const { error } = await supabase
            .from('images')
            .update({ folder_id: folderId || null })
            .in('id', imageIds)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, count: imageIds.length });
    } catch (error) {
        console.error('Error bulk moving images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
