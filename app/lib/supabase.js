/**
 * Supabase Client Configuration
 * Handles database and storage operations
 *
 * IMPORTANT: Uses @supabase/ssr for cookie-based sessions
 * This ensures the middleware can read the session from cookies
 */

import { createBrowserClient } from '@supabase/ssr';
import { getImageUrl as s3GetImageUrl, deleteImage as s3DeleteImage, downloadImage as s3DownloadImage } from './s3';

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create Supabase client (client-side) with cookie storage
// This ensures sessions are stored in cookies that middleware can read
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`
        }
    });
    if (error) throw error;
    return data;
}

/**
 * Sign up with email and password
 */
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

/**
 * Sign out
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Upload image to Supabase Storage
 * @param {File|Blob} file - Image file to upload
 * @param {string} filename - Filename for the image
 * @param {string} userId - User ID for organizing storage
 * @returns {Promise<string>} - Storage path
 */
export async function uploadImage(file, filename, userId) {
    const storagePath = `${userId}/${filename}`;

    const { error } = await supabase.storage
        .from('generated-images')
        .upload(storagePath, file, {
            contentType: 'image/png',
            upsert: false
        });

    if (error) throw error;
    return storagePath;
}

/**
 * Get public URL for an image
 * @param {string} storagePath - Path in storage
 * @returns {string} - Public URL
 */
export const getImageUrl = s3GetImageUrl;

/**
 * Delete image from storage
 * @param {string} storagePath - Path in storage
 */
export const deleteImage = s3DeleteImage;

/**
 * Download image from storage
 * @param {string} storagePath - Path in storage
 * @returns {Promise<Blob>} - Image blob
 */
export const downloadImage = s3DownloadImage;
