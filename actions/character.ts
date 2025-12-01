'use server'

import {createAuthClient} from "@/app/lib/supabase-server";
import Unauthorized from "@/app/errors/Http/Unauthorized";

export async function getAllCharacters() {
    const supabase = createAuthClient();

    // Select only public-safe fields; rely on RLS to restrict visibility if configured
    const { data, error } = await supabase
        .from('characters')
        .select('id, slug, name, title, subtitle, tags, avatar_url, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map tags to array if they come back as null
    return (data || []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        title: c.title,
        subtitle: c.subtitle,
        tags: Array.isArray(c.tags) ? c.tags : [],
        avatar_url: c.avatar_url,
        created_at: c.created_at,
    }));
}

export async function getAllCharactersWithFolderCount() {
    const supabase = createAuthClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Unauthorized();
    }

    // Fetch user's characters with folder counts
    const { data: characters, error } = await supabase
        .from('characters')
        .select(`
                *,
                folders:folders(count)
            `)
        .eq('user_id', user.id)
        .order('name', { ascending: false });

    if (error) throw error;

    // Transform the response to include folder count
    return characters.map(char => ({
        ...char,
        folder_count: char.folders[0]?.count || 0,
    }));
}

export async function getCharacter(uuid: string) {
    const supabase = createAuthClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Unauthorized();
    }

    // Fetch user's characters with folder counts
    const { data: character, error } = await supabase
        .from('characters')
        .select(`*`)
        .eq('user_id', user.id)
        .eq('id', uuid)
        .single()

    if (error) throw error;

    return character;
}