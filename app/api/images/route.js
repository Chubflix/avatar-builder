/**
 * Images API
 * Manages image CRUD operations with Supabase Storage
 */

import { NextResponse } from 'next/server';
import { createAuthClient, getImageUrl, uploadImage, deleteImageFromStorage, saveGeneratedImage } from '@/app/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

// GET images with pagination and optional folder filter
export async function GET(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;
        const folderId = searchParams.get('folder_id');
        const characterId = searchParams.get('character_id');

        // Build query
        let query = supabase
            .from('images')
            .select(`
                *,
                folder:folders(id, name, character:characters(id, name))
            `, { count: 'exact' })
            .eq('user_id', user.id);

        // Filter by folder
        if (folderId === 'null' || folderId === 'unfiled') {
            query = query.is('folder_id', null);
        } else if (folderId) {
            query = query.eq('folder_id', folderId);
        }

        // Filter by character (get images from all folders under this character)
        if (characterId && !folderId) {
            // Get all folders for this character
            const { data: characterFolders } = await supabase
                .from('folders')
                .select('id')
                .eq('character_id', characterId)
                .eq('user_id', user.id);

            if (characterFolders && characterFolders.length > 0) {
                const folderIds = characterFolders.map(f => f.id);
                query = query.in('folder_id', folderIds);
            } else {
                // No folders found for this character, return empty result
                return NextResponse.json({
                    images: [],
                    total: 0,
                    hasMore: false
                });
            }
        }

        // Pagination
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: images, error, count } = await query;

        if (error) throw error;

        // Add image URLs and ensure character_id and folder_id are present
        const imagesWithUrls = images.map(img => ({
            ...img,
            url: getImageUrl(img.storage_path),
            folder_id: img.folder_id || null,
            character_id: img.folder?.character?.id || null,
            folder_name: img.folder?.name || null,
            folder_path: img.folder ? `${img.folder.character?.name || 'Unknown'}/${img.folder.name}` : null
        }));

        const hasMore = offset + images.length < count;

        return NextResponse.json({
            images: imagesWithUrls,
            total: count,
            hasMore
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST save new image
export async function POST(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const saved = await saveGeneratedImage({
            supabase,
            userId: user.id,
            imageBase64: body.imageData,
            meta: {
                positivePrompt: body.positivePrompt,
                negativePrompt: body.negativePrompt,
                model: body.model,
                orientation: body.orientation,
                width: body.width,
                height: body.height,
                batchSize: body.batchSize,
                samplerName: body.samplerName,
                scheduler: body.scheduler,
                steps: body.steps,
                cfgScale: body.cfgScale,
                seed: body.seed,
                adetailerEnabled: body.adetailerEnabled,
                adetailerModel: body.adetailerModel,
                info: body.info,
                folderId: body.folderId,
                loras: body.loras
            }
        });

        return NextResponse.json(saved);
    } catch (error) {
        console.error('Error saving image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
