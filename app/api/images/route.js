/**
 * Images API
 * Manages image CRUD operations with Supabase Storage
 */

import { NextResponse } from 'next/server';
import { createAuthClient, saveGeneratedImage } from '@/app/lib/supabase-server';
import { getImageUrl } from '@/app/lib/s3-server';
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
        const id = searchParams.get('id');

        // If a specific image id is requested, return that image only
        if (id) {
            let singleQuery = supabase
                .from('images')
                .select(`
                    *,
                    folder:folders(id, name, character:characters(id, name))
                `)
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .eq('id', id)
                .limit(1);

            const { data: one, error: oneErr } = await singleQuery;
            if (oneErr) throw oneErr;

            const img = one && one[0];
            if (!img) {
                return NextResponse.json({ images: [], total: 0, hasMore: false });
            }

            const imgWithUrl = {
                ...img,
                url: getImageUrl(img.storage_path),
                folder_id: img.folder_id || null,
                character_id: img.folder?.character?.id || null,
                folder_name: img.folder?.name || null,
                folder_path: img.folder ? `${img.folder.character?.name || 'Unknown'}/${img.folder.name}` : null
            };

            return NextResponse.json({ images: [imgWithUrl], total: 1, hasMore: false });
        }

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
            // Don't process character filter if we're looking for unfiled images
            // Unfiled images don't have character associations
        } else if (folderId) {
            query = query.eq('folder_id', folderId);
        } else if (characterId) {
            // Filter by character (get images from all folders under this character)
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
