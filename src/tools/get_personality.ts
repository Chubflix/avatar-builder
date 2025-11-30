import type { SupabaseClient } from '@supabase/supabase-js';

export interface DescriptionSection {
  id: string;
  character_id: string;
  section: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the personality description for a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @returns The personality description section or null if not found
 */
export async function getPersonality(
  supabase: SupabaseClient,
  characterId: string
): Promise<DescriptionSection | null> {
  const { data, error } = await supabase
    .from('character_description_sections')
    .select('*')
    .eq('character_id', characterId)
    .eq('section', 'personality')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch personality: ${error.message}`);
  }

  return data;
}
