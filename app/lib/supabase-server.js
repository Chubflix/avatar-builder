/**
 * Supabase Server Client
 * For use in API routes and server components
 *
 * IMPORTANT: Uses @supabase/ssr for proper Next.js cookie handling
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
export function getImageUrl(storagePath) {
    if (!storagePath) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/generated-images/${storagePath}`;
}

/**
 * Upload image to Supabase Storage (server-side)
 * @param {Buffer|Blob} file - Image file to upload
 * @param {string} storagePath - Path where file should be stored
 * @returns {Promise<void>}
 */
export async function uploadImage(file, storagePath) {
    const supabase = createAuthClient();

    const { error } = await supabase.storage
        .from('generated-images')
        .upload(storagePath, file, {
            contentType: 'image/png',
            upsert: false
        });

    if (error) throw error;
}

/**
 * Upload image using service client (bypasses RLS). For webhooks.
 */
export async function uploadImageWithService(file, storagePath) {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
        .from('generated-images')
        .upload(storagePath, file, {
            contentType: 'image/png',
            upsert: false
        });
    if (error) throw error;
}

/**
 * Delete image from storage (server-side)
 * @param {string} storagePath - Path in storage
 */
export async function deleteImageFromStorage(storagePath) {
    const supabase = createAuthClient();

    const { error } = await supabase.storage
        .from('generated-images')
        .remove([storagePath]);

    if (error) throw error;
}

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
 *           info, folderId, loras }
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
        loras
    } = meta;

    // Normalize base64 (strip data URL if present)
    const normalized = typeof imageBase64 === 'string'
        ? (imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64)
        : imageBase64;

    const buffer = Buffer.from(normalized, 'base64');
    const id = crypto.randomUUID ? crypto.randomUUID() : (await import('uuid')).v4();
    const filename = `${id}.png`;
    const storagePath = `${userId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(storagePath, new Blob([buffer], { type: 'image/png' }), {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
        });
    if (uploadError) throw uploadError;

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
            user_id: userId
        })
        .select(`
            *,
            folder:folders(id, name, character:characters(id, name))
        `)
        .single();

    if (error) {
        // Cleanup file on failure
        await supabase.storage.from('generated-images').remove([storagePath]);
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

    // Best-effort realtime broadcast that a new image was saved.
    // This allows clients to subscribe to a user-scoped channel and react immediately.
    // Do not block the request if Realtime is unavailable.
    try {
        const channelName = `images`;
        // Create a temporary channel and send a broadcast event.
        const channel = supabase.channel(channelName, {
            config: { broadcast: { self: true }, private: true }
        });

        // Send minimal payload containing identifiers and URL for quick UI updates
        // Do not await to avoid blocking on websocket connection establishment
        channel.send({
            type: 'broadcast',
            event: 'image_saved',
            payload: {
                id: result.id,
                user_id: userId,
                storage_path: result.storage_path,
                url: result.url,
                folder_id: result.folder_id,
                created_at: result.created_at,
            }
        });

        // Cleanup the channel shortly after to avoid leaking sockets on the server
        setTimeout(() => {
            try { channel.unsubscribe(); } catch (_) { /* noop */ }
        }, 1000);
    } catch (e) {
        // Swallow realtime errors; logging only
        console.warn('[Realtime] Failed to broadcast image_saved:', e?.message || e);
    }

    return result;
}
