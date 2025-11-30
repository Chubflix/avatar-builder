import type { SupabaseClient } from '@supabase/supabase-js';
import { DescriptionSection } from './get_personality';

/**
 * Update or create a description section for a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param section - The section name (e.g., 'personality', 'appearance', 'backstory')
 * @param content - The description content
 * @returns The updated or created description section
 */
export async function updateDescription(
  supabase: SupabaseClient,
  characterId: string,
  section: string,
  content: string
): Promise<DescriptionSection> {
  // Use upsert to handle both insert and update cases
  const { data, error } = await supabase
    .from('character_description_sections')
    .upsert(
      {
        character_id: characterId,
        section,
        content
      },
      {
        onConflict: 'character_id,section'
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update description: ${error.message}`);
  }

  return data;
}

/**
 * Update multiple description sections at once
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param sections - Array of section objects with section name and content
 * @returns Array of updated/created description sections
 */
export async function updateDescriptions(
  supabase: SupabaseClient,
  characterId: string,
  sections: Array<{ section: string; content: string }>
): Promise<DescriptionSection[]> {
  const upserts = sections.map((s) => ({
    character_id: characterId,
    section: s.section,
    content: s.content
  }));

  const { data, error } = await supabase
    .from('character_description_sections')
    .upsert(upserts, {
      onConflict: 'character_id,section'
    })
    .select();

  if (error) {
    throw new Error(`Failed to update descriptions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all description sections for a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @returns Array of all description sections
 */
export async function getAllDescriptions(
  supabase: SupabaseClient,
  characterId: string
): Promise<DescriptionSection[]> {
  const { data, error } = await supabase
    .from('character_description_sections')
    .select('*')
    .eq('character_id', characterId);

  if (error) {
    throw new Error(`Failed to fetch descriptions: ${error.message}`);
  }

  return data || [];
}
