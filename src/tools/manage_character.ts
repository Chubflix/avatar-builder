import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Character {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get a character by ID
 * @param characterId - The UUID of the character
 * @returns The character or null if not found
 */
export async function getCharacter(characterId: string): Promise<Character | null> {
  const { data, error } = await supabase
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

/**
 * Get a character by slug
 * @param slug - The character's slug
 * @returns The character or null if not found
 */
export async function getCharacterBySlug(slug: string): Promise<Character | null> {
  const { data, error } = await supabase
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

/**
 * Get all characters
 * @param limit - Maximum number of characters to return (default: 50)
 * @param offset - Number of characters to skip (default: 0)
 * @returns Array of characters
 */
export async function getAllCharacters(
  limit: number = 50,
  offset: number = 0
): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch characters: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new character
 * @param name - The character's name
 * @param metadata - Optional metadata
 * @returns The created character
 */
export async function createCharacter(
  name: string,
  metadata: Record<string, any> = {}
): Promise<Character> {
  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const { data, error } = await supabase
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

/**
 * Update a character
 * @param characterId - The UUID of the character
 * @param updates - Object containing fields to update
 * @returns The updated character
 */
export async function updateCharacter(
  characterId: string,
  updates: {
    name?: string;
    avatar_url?: string;
    metadata?: Record<string, any>;
  }
): Promise<Character> {
  // If name is being updated, regenerate slug
  if (updates.name) {
    const slug = updates.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    (updates as any).slug = slug;
  }

  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', characterId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update character: ${error.message}`);
  }

  return data;
}

/**
 * Delete a character and all associated data
 * @param characterId - The UUID of the character
 * @returns Success status
 */
export async function deleteCharacter(characterId: string): Promise<{ success: boolean }> {
  // Due to CASCADE constraints, this will also delete:
  // - All greetings
  // - All description sections
  // - All documents
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', characterId);

  if (error) {
    throw new Error(`Failed to delete character: ${error.message}`);
  }

  return { success: true };
}

/**
 * Search characters by name
 * @param searchTerm - The search term
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching characters
 */
export async function searchCharacters(
  searchTerm: string,
  limit: number = 20
): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search characters: ${error.message}`);
  }

  return data || [];
}

/**
 * Get complete character data (character + greetings + descriptions)
 * @param characterId - The UUID of the character
 * @returns Complete character data
 */
export async function getCompleteCharacterData(characterId: string) {
  const [character, greetings, descriptions] = await Promise.all([
    getCharacter(characterId),
    supabase
      .from('character_greetings')
      .select('*')
      .eq('character_id', characterId)
      .order('greeting_order', { ascending: true })
      .then(({ data }) => data || []),
    supabase
      .from('character_description_sections')
      .select('*')
      .eq('character_id', characterId)
      .then(({ data }) => data || [])
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
