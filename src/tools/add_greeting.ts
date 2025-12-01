import type { SupabaseClient } from '@supabase/supabase-js';
import { Greeting } from './get_greetings';

/**
 * Add a new greeting to a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param title - The title/name of the greeting (e.g., "Alt Greeting 5")
 * @param content - The full greeting text
 * @param metadata - Optional metadata (e.g., {is_nsfw: false, pov: 'any'})
 * @param options
 * @returns The created greeting
 */
export async function addGreeting(
  supabase: SupabaseClient,
  characterId: string,
  title: string,
  content: string,
  metadata: Record<string, any> = {},
  options?: { storyPhaseId?: string | null }
): Promise<Greeting> {
  // Get the current max greeting_order to determine the next order
  const { data: maxData, error: maxError } = await supabase
    .from('character_greetings')
    .select('greeting_order')
    .eq('character_id', characterId)
    .order('greeting_order', { ascending: false })
    .limit(1);

  if (maxError) {
    throw new Error(`Failed to fetch max greeting order: ${maxError.message}`);
  }

  const nextOrder = maxData && maxData.length > 0 ? maxData[0].greeting_order + 1 : 1;

  // Insert the new greeting
  const { data, error } = await supabase
    .from('character_greetings')
    .insert({
      character_id: characterId,
      greeting_order: nextOrder,
      title,
      content,
      metadata,
      story_phase_id: options?.storyPhaseId ?? null
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add greeting: ${error.message}`);
  }

  return data;
}

/**
 * Add multiple greetings to a character at once
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param greetings - Array of greeting objects with title, content, and optional metadata
 * @returns Array of created greetings
 */
export async function addGreetings(
  supabase: SupabaseClient,
  characterId: string,
  greetings: Array<{ title: string; content: string; metadata?: Record<string, any> }>
): Promise<Greeting[]> {
  // Get the current max greeting_order
  const { data: maxData, error: maxError } = await supabase
    .from('character_greetings')
    .select('greeting_order')
    .eq('character_id', characterId)
    .order('greeting_order', { ascending: false })
    .limit(1);

  if (maxError) {
    throw new Error(`Failed to fetch max greeting order: ${maxError.message}`);
  }

  let nextOrder = maxData && maxData.length > 0 ? maxData[0].greeting_order + 1 : 1;

  // Prepare the inserts with sequential order
  const inserts = greetings.map((greeting) => ({
    character_id: characterId,
    greeting_order: nextOrder++,
    title: greeting.title,
    content: greeting.content,
    metadata: greeting.metadata || {}
  }));

  // Insert all greetings
  const { data, error } = await supabase
    .from('character_greetings')
    .insert(inserts)
    .select();

  if (error) {
    throw new Error(`Failed to add greetings: ${error.message}`);
  }

  return data || [];
}
