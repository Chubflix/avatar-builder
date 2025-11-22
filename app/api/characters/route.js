/**
 * Characters API
 * Manages character CRUD operations
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

// GET all characters for authenticated user
export async function GET() {
    try {
        const supabase = createAuthClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user's characters with folder counts
        const { data: characters, error } = await supabase
            .from('characters')
            .select(`
                *,
                folders:folders(count)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the response to include folder count
        const charactersWithCount = characters.map(char => ({
            ...char,
            folder_count: char.folders[0]?.count || 0,
        }));

        return NextResponse.json(charactersWithCount);
    } catch (error) {
        console.error('Error fetching characters:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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

        return NextResponse.json(character);
    } catch (error) {
        console.error('Error creating character:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
