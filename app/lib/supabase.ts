/**
 * Supabase Client Configuration (Client-side)
 * Handles auth and light client operations. Uses @supabase/ssr to keep
 * sessions in cookies for middleware compatibility.
 */

import { createBrowserClient } from '@supabase/ssr';
// Re-export common domain types so consumers can import from one place
export type { Mask } from '@/types/mask';

// Re-export serverless S3 helpers (typed via their own modules)
import {
  getImageUrl as s3GetImageUrl,
  deleteImage as s3DeleteImage,
} from './s3';

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client (client-side) with cookie storage
// This ensures sessions are stored in cookies that middleware can read
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string) {
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
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Get public URL for an image
 */
export const getImageUrl = s3GetImageUrl;

/**
 * Delete image from storage
 */
export const deleteImage = s3DeleteImage;
