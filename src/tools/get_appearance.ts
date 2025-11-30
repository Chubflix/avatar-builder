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
 * Get the appearance description for a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @returns The appearance description section or null if not found
 */
export async function getAppearance(
  supabase: SupabaseClient,
  characterId: string
): Promise<DescriptionSection | null> {
  const { data, error } = await supabase
    .from('character_description_sections')
    .select('*')
    .eq('character_id', characterId)
    .eq('section', 'appearance')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch appearance: ${error.message}`);
  }

  return data;
}
