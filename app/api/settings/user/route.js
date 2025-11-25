/**
 * User Settings API
 * Manages user-specific settings and generation defaults
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// GET user settings
export async function GET(request) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get or create user settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // If no settings exist, create default settings
        if (error && error.code === 'PGRST116') {
            const { data: newSettings, error: insertError } = await supabase
                .from('user_settings')
                .insert({
                    user_id: user.id,
                    generation_settings: {},
                    adetailer_settings: {}
                })
                .select()
                .single();

            if (insertError) throw insertError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('[User Settings] GET error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PUT/PATCH user settings (upsert)
export async function PUT(request) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await request.json();

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.user_id;
        delete updates.created_at;
        delete updates.updated_at;

        // Note: ui_preferences removed - keep those in localStorage only

        // Upsert settings
        const { data: settings, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                ...updates
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(settings);
    } catch (error) {
        console.error('[User Settings] PUT error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PATCH user settings (partial update)
export async function PATCH(request) {
    try {
        const supabase = createAuthClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updates = await request.json();

        // Get existing settings
        const { data: existing } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Merge JSONB fields if they exist
        const mergedSettings = { ...updates };

        if (updates.generation_settings && existing?.generation_settings) {
            mergedSettings.generation_settings = {
                ...existing.generation_settings,
                ...updates.generation_settings
            };
        }

        if (updates.adetailer_settings && existing?.adetailer_settings) {
            mergedSettings.adetailer_settings = {
                ...existing.adetailer_settings,
                ...updates.adetailer_settings
            };
        }

        // Upsert with merged settings
        const { data: settings, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                ...mergedSettings
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(settings);
    } catch (error) {
        console.error('[User Settings] PATCH error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
