/**
 * Supabase Client Configuration
 * Handles database and storage operations
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create Supabase client (client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

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
export function getImageUrl(storagePath) {
    const { data } = supabase.storage
        .from('generated-images')
        .getPublicUrl(storagePath);

    return data.publicUrl;
}

/**
 * Delete image from storage
 * @param {string} storagePath - Path in storage
 */
export async function deleteImage(storagePath) {
    const { error } = await supabase.storage
        .from('generated-images')
        .remove([storagePath]);

    if (error) throw error;
}

/**
 * Download image from storage
 * @param {string} storagePath - Path in storage
 * @returns {Promise<Blob>} - Image blob
 */
export async function downloadImage(storagePath) {
    const { data, error } = await supabase.storage
        .from('generated-images')
        .download(storagePath);

    if (error) throw error;
    return data;
}
