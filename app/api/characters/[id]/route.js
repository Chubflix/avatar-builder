/**
 * Character Detail API
 * Manages individual character operations
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { publishRealtimeEvent } from '@/app/lib/ably';

// PUT update character
export async function PUT(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Update character (RLS ensures user can only update their own)
        const { data: character, error } = await supabase
            .from('characters')
            .update({
                name: name.trim(),
                description: description?.trim() || null,
            })
            .eq('id', id)
            .eq('user_id', user.id) // Extra safety check
            .select()
            .single();

        if (error) throw error;

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // Publish realtime event
        await publishRealtimeEvent('characters', 'character_updated', {
            id: character.id,
            user_id: user.id,
            name: character.name
        });

        return NextResponse.json(character);
    } catch (error) {
        console.error('Error updating character:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE character
export async function DELETE(request, { params }) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Delete character (cascade will delete folders and images)
        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Extra safety check

        if (error) throw error;

        // Publish realtime event
        await publishRealtimeEvent('characters', 'character_deleted', {
            id,
            user_id: user.id
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting character:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
