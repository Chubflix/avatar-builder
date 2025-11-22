/**
 * Supabase Server Client
 * For use in API routes and server components
 *
 * IMPORTANT: Uses @supabase/ssr for proper Next.js cookie handling
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
