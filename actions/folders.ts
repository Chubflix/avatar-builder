'use server'

import {createAuthClient} from '@/app/lib/supabase-server';
import {HttpError} from "@/app/errors/HttpError";
import Unauthorized from "@/app/errors/Http/Unauthorized";
import BadRequest from "@/app/errors/Http/BadRequest";
import NotFound from "@/app/errors/Http/NotFound";

/**
 * List folders for the authenticated user. Optionally filter by character_id.
 */
export async function getFolders({characterId = null}: { characterId: string | null }) {
    const supabase = createAuthClient();

    const {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Unauthorized();
    }

    let query = supabase
        .from('folders')
        .select(`
      *,
      character:characters(id, name),
      images:images(count)
    `)
        .eq('user_id', user.id)
        .order('name', {ascending: true});

    if (characterId) {
        query = query.eq('character_id', characterId);
    }

    const {data: folders, error} = await query;
    if (error) throw error;

    return (folders || []).map((folder) => ({
        ...folder,
        image_count: folder.images?.[0]?.count || 0,
    }));
}

/**
 * Create a folder for a character owned by the authenticated user.
 */
export async function createFolder({name, description = null, character_id}: {
    name: string,
    description?: string | null,
    character_id: string
}) {
    const supabase = createAuthClient();

    const {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Unauthorized();
    }

    if (!name?.trim()) {
        throw new BadRequest('Folder name is required');
    }
    if (!character_id) {
        throw new BadRequest('Character ID is required');
    }

    // Verify character ownership
    const {data: character, error: charError} = await supabase
        .from('characters')
        .select('id')
        .eq('id', character_id)
        .eq('user_id', user.id)
        .single();

    if (charError || !character) {
        throw new NotFound('Character not found');
    }

    const {data: folder, error} = await supabase
        .from('folders')
        .insert({
            name: name.trim(),
            description: description?.trim() || null,
            character_id,
            user_id: user.id,
        })
        .select(`*, character:characters(id, name)`)
        .single();

    if (error) throw error;
    return folder;
}
