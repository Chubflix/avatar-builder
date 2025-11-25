/**
 * Admin Check API
 * Returns whether the current user is an admin
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

export async function GET(request) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('is_admin');

        return NextResponse.json({
            user_id: user.id,
            is_admin: Boolean(isAdmin)
        });
    } catch (error) {
        console.error('[Admin] Check error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
