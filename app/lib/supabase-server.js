/**
 * Supabase Server Client
 * For use in API routes and server components
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create Supabase client for server-side operations
 * Uses service role key for admin operations (bypasses RLS)
 */
export function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase server environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });
}

/**
 * Create Supabase client with user session from cookies
 * Respects RLS policies
 */
export function createAuthClient() {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name) {
                return cookieStore.get(name)?.value;
            },
        },
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
