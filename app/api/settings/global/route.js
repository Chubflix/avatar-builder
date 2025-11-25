/**
 * Global Settings API
 * Manages system-wide settings like LoRAs and dimension presets
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// GET global settings
export async function GET(request) {
    try {
        const supabase = createAuthClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        let query = supabase
            .from('global_settings')
            .select('*');

        // Filter by key if provided
        if (key) {
            query = query.eq('key', key).single();
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('[Global Settings] GET error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PUT global settings
export async function PUT(request) {
    try {
        const supabase = createAuthClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await request.json();
        const { key, value, description } = updates;

        if (!key) {
            return NextResponse.json(
                { error: 'Key is required' },
                { status: 400 }
            );
        }

        // Upsert global setting
        const { data: setting, error } = await supabase
            .from('global_settings')
            .upsert({
                key,
                value: value || {},
                description
            }, {
                onConflict: 'key'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(setting);
    } catch (error) {
        console.error('[Global Settings] PUT error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
