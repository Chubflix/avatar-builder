import type { SupabaseClient } from '@supabase/supabase-js';
import { Greeting } from './get_greetings';

/**
 * Update an existing greeting
 * @param supabase - Authenticated Supabase client
 * @param greetingId - The UUID of the greeting to update
 * @param updates - Object containing fields to update (title, content, metadata)
 * @returns The updated greeting
 */
export async function updateGreeting(
  supabase: SupabaseClient,
  greetingId: string,
  updates: {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
  }
): Promise<Greeting> {
  const { data, error } = await supabase
    .from('character_greetings')
    .update(updates)
    .eq('id', greetingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update greeting: ${error.message}`);
  }

  return data;
}

/**
 * Reorder a greeting to a new position
 * @param supabase - Authenticated Supabase client
 * @param greetingId - The UUID of the greeting to reorder
 * @param newOrder - The new greeting_order value
 * @returns The updated greeting
 */
export async function reorderGreeting(
  supabase: SupabaseClient,
  greetingId: string,
  newOrder: number
): Promise<Greeting> {
  // Get the current greeting
  const { data: currentGreeting, error: fetchError } = await supabase
    .from('character_greetings')
    .select('*')
    .eq('id', greetingId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch greeting: ${fetchError.message}`);
  }

  const oldOrder = currentGreeting.greeting_order;
  const characterId = currentGreeting.character_id;

  // Shift other greetings to make room
  if (newOrder < oldOrder) {
    // Moving up: increment orders between newOrder and oldOrder
    await supabase
      .from('character_greetings')
      .update({ greeting_order: supabase.rpc('increment_order', {}) })
      .eq('character_id', characterId)
      .gte('greeting_order', newOrder)
      .lt('greeting_order', oldOrder);
  } else if (newOrder > oldOrder) {
    // Moving down: decrement orders between oldOrder and newOrder
    await supabase
      .from('character_greetings')
      .update({ greeting_order: supabase.rpc('decrement_order', {}) })
      .eq('character_id', characterId)
      .gt('greeting_order', oldOrder)
      .lte('greeting_order', newOrder);
  }

  // Update the greeting's order
  const { data, error } = await supabase
    .from('character_greetings')
    .update({ greeting_order: newOrder })
    .eq('id', greetingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reorder greeting: ${error.message}`);
  }

  return data;
}
