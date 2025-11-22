/**
 * Images API
 * Manages image CRUD operations with Supabase Storage
 */

import { NextResponse } from 'next/server';
import { createAuthClient, getImageUrl, uploadImage, deleteImageFromStorage } from '@/app/lib/supabase-server';
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
                // No folders for this character, return empty
                query = query.eq('folder_id', 'no-match');
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

        const {
            imageData,
            positivePrompt,
            negativePrompt,
            model,
            orientation,
            width,
            height,
            batchSize,
            samplerName,
            scheduler,
            steps,
            cfgScale,
            seed,
            adetailerEnabled,
            adetailerModel,
            info,
            folderId,
            loras
        } = await request.json();

        const id = uuidv4();
        const filename = `${id}.png`;

        // Convert base64 to blob
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });

        // Upload to Supabase Storage
        const storagePath = `${user.id}/${filename}`;
        const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(storagePath, blob, {
                contentType: 'image/png',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { data: image, error } = await supabase
            .from('images')
            .insert({
                id,
                filename,
                storage_path: storagePath,
                positive_prompt: positivePrompt,
                negative_prompt: negativePrompt,
                model,
                orientation,
                width,
                height,
                batch_size: batchSize,
                sampler_name: samplerName,
                scheduler,
                steps,
                cfg_scale: cfgScale,
                seed,
                adetailer_enabled: adetailerEnabled,
                adetailer_model: adetailerModel,
                info_json: info || {},
                folder_id: folderId || null,
                loras: loras || null,
                user_id: user.id
            })
            .select(`
                *,
                folder:folders(id, name, character:characters(id, name))
            `)
            .single();

        if (error) {
            // Cleanup: delete uploaded file if database insert fails
            await supabase.storage.from('generated-images').remove([storagePath]);
            throw error;
        }

        return NextResponse.json({
            ...image,
            url: getImageUrl(image.storage_path),
            folder_id: image.folder_id || null,
            character_id: image.folder?.character?.id || null,
            folder_name: image.folder?.name || null,
            folder_path: image.folder ? `${image.folder.character?.name || 'Unknown'}/${image.folder.name}` : null
        });
    } catch (error) {
        console.error('Error saving image:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
