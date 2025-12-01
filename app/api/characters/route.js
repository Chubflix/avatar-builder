/**
 * Characters API
 * Manages character CRUD operations
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { publishRealtimeEvent } from '@/app/lib/ably';
import {getAllCharactersWithFolderCount} from "@/actions/character";
import {handleError} from "@/app/errors/ErrorHandler";

// GET all characters for authenticated user
export async function GET() {
    try {
        const charactersWithCount = await getAllCharactersWithFolderCount();

        return NextResponse.json(charactersWithCount);
    } catch (error) {
        return handleError(error)
    }
}

// POST create new character
export async function POST(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const { data: character, error } = await supabase
            .from('characters')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        // Publish realtime event
        await publishRealtimeEvent('characters', 'character_created', {
            id: character.id,
            user_id: user.id,
            name: character.name
        });

        return NextResponse.json(character);
    } catch (error) {
        console.error('Error creating character:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
