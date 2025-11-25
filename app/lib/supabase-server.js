/**
 * Supabase Server Client
 * For use in API routes and server components
 *
 * IMPORTANT: Uses @supabase/ssr for proper Next.js cookie handling
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getImageUrl } from './s3-server';
import { s3Upload, s3Delete } from './s3-server';
import { getAblyRest } from './ably';

/**
 * Create Supabase client with user session from cookies
 * Respects RLS policies
 *
 * This is the main function to use in API routes
 */
export function createAuthClient() {
    const cookieStore = cookies();

    return createSSRServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                set(name, value, options) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name, options) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

/**
 * Legacy alias for backwards compatibility
 * @deprecated Use createAuthClient instead
 */
export function createServerClient() {
    return createAuthClient();
}

/**
 * Create Supabase service-role client (bypasses RLS)
 * For backend tasks like webhooks. Do NOT expose this to the client.
 */
export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing Supabase service role configuration');
    }
    return createSupabaseClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

/**
 * Get authenticated user from server
 */
export async function getServerUser() {
    const supabase = createAuthClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Error getting server user:', error);
        return null;
    }

    return user;
}

/**
 * Verify user is authenticated (for API routes)
 */
export async function requireAuth() {
    const user = await getServerUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * Get public URL for an image in storage (server-side)
 * @param {string} storagePath - Path in storage
 * @returns {string} - Public URL
 */
// Note: S3 operations moved to app/lib/s3-server.js

/**
 * Persist a generated image to Storage and the images table.
 * This helper centralizes the logic used by /api/images and the SD webhook.
 *
 * Params:
 * - supabase: a Supabase client (auth client for user context, or service client for webhooks)
 * - userId: UUID of the owner user
 * - imageBase64: base64 string, may include data URL prefix
 * - meta: { positivePrompt, negativePrompt, model, orientation, width, height, batchSize,
 *           samplerName, scheduler, steps, cfgScale, seed, adetailerEnabled, adetailerModel,
 *           info, folderId, loras, generationType, parentImageId, maskData, tags }
 *   - generationType: 'txt2img' (default), 'img2img', or 'inpaint'
 *   - parentImageId: UUID of source image for img2img/inpaint (optional)
 *   - maskData: Base64 mask data for inpaint operations (optional)
 *   - tags: Array of tag strings (optional, defaults to [])
 *
 * Returns: the inserted image row with folder joined, same shape as /api/images POST
 */
export async function saveGeneratedImage({ supabase, userId, imageBase64, meta = {} }) {
    if (!supabase) throw new Error('saveGeneratedImage: supabase client is required');
    if (!userId) throw new Error('saveGeneratedImage: userId is required');
    if (!imageBase64) throw new Error('saveGeneratedImage: imageBase64 is required');

    const {
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
        loras,
        generationType = 'txt2img',
        parentImageId = null,
        maskData = null,
        tags = []
    } = meta;

    // Normalize base64 (strip data URL if present)
    const normalized = typeof imageBase64 === 'string'
        ? (imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64)
        : imageBase64;

    const buffer = Buffer.from(normalized, 'base64');
    const id = crypto.randomUUID ? crypto.randomUUID() : (await import('uuid')).v4();
    const filename = `${id}.png`;
    const storagePath = `${userId}/${filename}`;

    // Upload to S3 via s3-server helpers
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error('Missing S3_BUCKET');
    await s3Upload({ bucket, key: storagePath, body: buffer, contentType: 'image/png', cacheControl: '31536000' });

    // Insert DB row
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
            generation_type: generationType,
            parent_image_id: parentImageId,
            mask_data: maskData,
            tags: tags || [],
            user_id: userId
        })
        .select(`
            *,
            folder:folders(id, name, character:characters(id, name))
        `)
        .single();

    if (error) {
        // Cleanup file on failure
        try { await s3Delete({ bucket, key: storagePath }); } catch (_) { /* noop */ }
        throw error;
    }

    const result = {
        ...image,
        url: getImageUrl(image.storage_path),
        folder_id: image.folder_id || null,
        character_id: image.folder?.character?.id || null,
        folder_name: image.folder?.name || null,
        folder_path: image.folder ? `${image.folder.character?.name || 'Unknown'}/${image.folder.name}` : null
    };

    try {
        const ably = getAblyRest();
        if (!ably) throw new Error('Ably REST client not configured');
        const channel = ably.channels.get('images');
        await channel.publish('image_saved', {
            id: result.id,
            user_id: userId,
            storage_path: result.storage_path,
            url: result.url,
            folder_id: result.folder_id,
            character_id: result.character_id,
            created_at: result.created_at,
        });
    } catch (e) {
        // Swallow realtime errors; logging only
        console.warn('[Realtime] Failed to broadcast image_saved via Ably:', e?.message || e);
    }

    return result;
}
