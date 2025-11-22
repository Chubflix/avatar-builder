/**
 * Folders API
 * Manages folder CRUD operations (folders belong to characters)
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// GET all folders for authenticated user (optionally filtered by character)
export async function GET(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const characterId = searchParams.get('character_id');

        // Build query
        let query = supabase
            .from('folders')
            .select(`
                *,
                character:characters(id, name),
                images:images(count)
            `)
            .eq('user_id', user.id);

        // Filter by character if specified
        if (characterId) {
            query = query.eq('character_id', characterId);
        }

        query = query.order('name', { ascending: true });

        const { data: folders, error } = await query;

        if (error) throw error;

        // Transform the response to include image count
        const foldersWithCount = folders.map(folder => ({
            ...folder,
            image_count: folder.images[0]?.count || 0,
        }));

        return NextResponse.json(foldersWithCount);
    } catch (error) {
        console.error('Error fetching folders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create new folder
export async function POST(request) {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, character_id } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        if (!character_id) {
            return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
        }

        // Verify character belongs to user
        const { data: character, error: charError } = await supabase
            .from('characters')
            .select('id')
            .eq('id', character_id)
            .eq('user_id', user.id)
            .single();

        if (charError || !character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // Create folder
        const { data: folder, error } = await supabase
            .from('folders')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                character_id,
                user_id: user.id
            })
            .select(`
                *,
                character:characters(id, name)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json(folder);
    } catch (error) {
        console.error('Error creating folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
