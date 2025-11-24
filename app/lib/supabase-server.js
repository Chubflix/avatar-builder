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
