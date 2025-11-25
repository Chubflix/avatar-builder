/**
 * Admin User Role Management API
 * Allows admins to promote/demote users
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// GET user role
export async function GET(request, { params }) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = params;

        // Get user role
        const { data: roleData, error } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // If no role exists, user has default 'user' role
        const role = roleData?.role || 'user';

        return NextResponse.json({
            user_id: userId,
            role
        });
    } catch (error) {
        console.error('[Admin] GET user role error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PUT/PATCH user role (admin only)
export async function PUT(request, { params }) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if current user is admin
        const { data: isAdminResult } = await supabase.rpc('is_admin');

        if (!isAdminResult) {
            return NextResponse.json(
                { error: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        const { userId } = params;
        const { role } = await request.json();

        // Validate role
        if (!role || !['user', 'admin'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be "user" or "admin"' },
                { status: 400 }
            );
        }

        // Prevent users from demoting themselves
        if (userId === user.id && role === 'user') {
            return NextResponse.json(
                { error: 'Cannot demote yourself from admin' },
                { status: 400 }
            );
        }

        // Upsert user role
        const { data: roleData, error } = await supabase
            .from('user_roles')
            .upsert({
                user_id: userId,
                role
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(roleData);
    } catch (error) {
        console.error('[Admin] PUT user role error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
