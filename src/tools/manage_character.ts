import {traceable} from 'langsmith/traceable';
import {SupabaseClient} from "@supabase/supabase-js";

export interface Character {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export async function getCharacter(characterId: string, supabase: SupabaseClient): Promise<Character | null> {
    const {data, error} = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Failed to fetch character: ${error.message}`);
    }

    return data;
}

export async function getCharacterBySlug(slug: string, supabase: SupabaseClient): Promise<Character | null> {
    const {data, error} = await supabase
        .from('characters')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Failed to fetch character: ${error.message}`);
    }

    return data;
}

export async function getAllCharacters(
    limit: number = 50,
    offset: number = 0,
    supabase: SupabaseClient
): Promise<Character[]> {
    const {data, error} = await supabase
        .from('characters')
        .select('*')
        .order('created_at', {ascending: false})
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    return data || [];
}

export async function createCharacter(
    name: string,
    metadata: Record<string, any> = {},
    supabase: SupabaseClient
): Promise<Character> {
    // Generate slug from name
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const {data, error} = await supabase
        .from('characters')
        .insert({
            name,
            slug,
            metadata
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create character: ${error.message}`);
    }

    return data;
}

const traceValueSubchain = traceable(async (valueName: string, value: any) => {
    return { tracedValueName: valueName, tracedValue: value };
});

export async function updateCharacter(
    characterId: string,
    updates: {
        name?: string;
        avatar_url?: string;
        metadata?: Record<string, any>;
    },
    supabase: SupabaseClient
): Promise<void> {
    const updateData = {} as any;
    // If name is being updated, regenerate slug
    if (updates.name) {
        updateData.name = updates.name;
        updateData.slug = updates.name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .replace(/"/g, "'");

        updateData.in_chat_name = extractInChatName(updates.name).replace(/"/g, "'");
        updateData.short_name = extractShortName(updates.name).replace(/"/g, "'");
    }

    if (updates.avatar_url) {
        const { data: currentData, error: fetchError } = await supabase
            .from('characters')
            .select('spec_data')
            .eq('id', characterId)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch: ${fetchError.message}`);
        }

        // DEEP CLONE to avoid reference issues
        const specData = JSON.parse(JSON.stringify(currentData?.spec_data || {}));

        specData.chubAI = {
            ...specData.chubAI,
            avatar_url: updates.avatar_url
        };
        updateData.avatar_url = updates.avatar_url;
        updateData.spec_data = specData;
    }

    await traceValueSubchain('updateData', updateData);
    await traceValueSubchain('characterId', characterId);

    const {error} = await supabase
        .from('characters')
        .update(updateData)
        .eq('id', characterId)

    if (error) {
        throw new Error(`Failed to update character: ${error.message}`);
    }
}

function extractInChatName(fullName: string): string {
    // Handle quoted nicknames first: "Nora" or 'Nora'
    const quotedMatch = fullName.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
        return quotedMatch[1] || quotedMatch[2];
    }

    // Handle initials like "N. Vance" (including after dash)
    if (/^[A-Z]\.?\s+\w+(\s+[A-Z]\.)?(?:\s*-\s*.+)?$/.test(fullName.trim())) {
        return fullName.split(' - ')[0].trim();
    }

    // Split into parts and take first name (before any dash description)
    const cleanName = fullName.split(' - ')[0].trim();
    const parts = cleanName.split(/\s+/);
    return parts[0] || cleanName;
}

function extractShortName(fullName: string): string {
    // Remove trailing description after " - "
    const cleanName = fullName.split(' - ')[0].trim();

    // Handle quoted nicknames first: "Nora" or 'Nora' -> keep quoted + last name
    const quotedMatch = cleanName.match(/"([^"]+)"|'([^']+)'/);
    if (quotedMatch) {
        const nickname = quotedMatch[1] || quotedMatch[2];
        // Extract last name (everything after quoted name)
        const afterQuote = cleanName.split(/["']/)[2]?.trim();
        const lastNameMatch = afterQuote?.match(/^\w+/);
        return lastNameMatch ? `${nickname} ${lastNameMatch[0]}` : nickname;
    }

    // Handle initials like "N. Vance"
    if (/^[A-Z]\.?\s+\w+$/.test(cleanName)) {
        return cleanName;
    }

    // Default: first + last name
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
    }

    return cleanName;

}

export async function deleteCharacter(characterId: string, supabase: SupabaseClient): Promise<{ success: boolean }> {
    // Due to CASCADE constraints, this will also delete:
    // - All greetings
    // - All description sections
    // - All documents
    const {error} = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

    if (error) {
        throw new Error(`Failed to delete character: ${error.message}`);
    }

    return {success: true};
}

export async function searchCharacters(
    searchTerm: string,
    limit: number = 20,
    supabase: SupabaseClient
): Promise<Character[]> {
    const {data, error} = await supabase
        .from('characters')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(limit);

    if (error) {
        throw new Error(`Failed to search characters: ${error.message}`);
    }

    return data || [];
}

export async function getCompleteCharacterData(characterId: string, supabase: SupabaseClient) {
    const [character, greetings, descriptions] = await Promise.all([
        getCharacter(characterId, supabase),
        supabase
            .from('character_greetings')
            .select('*')
            .eq('character_id', characterId)
            .order('greeting_order', {ascending: true})
            .then(({data}) => data || []),
        supabase
            .from('character_description_sections')
            .select('*')
            .eq('character_id', characterId)
            .then(({data}) => data || [])
    ]);

    if (!character) {
        throw new Error('Character not found');
    }

    return {
        character,
        greetings,
        descriptions
    };
}
