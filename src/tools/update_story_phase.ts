import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryPhase } from './get_story_phases';

/**
 * Update an existing story phase (name, description, metadata)
 */
export async function updateStoryPhase(
  supabase: SupabaseClient,
  phaseId: string,
  updates: {
    name?: string;
    description?: string | null;
    metadata?: Record<string, any>;
  }
): Promise<StoryPhase> {
  const { data, error } = await supabase
    .from('character_story_phases')
    .update(updates)
    .eq('id', phaseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update story phase: ${error.message}`);
  }

  return data as StoryPhase;
}

/**
 * Reorder a story phase to a new position
 */
export async function reorderStoryPhase(
  supabase: SupabaseClient,
  phaseId: string,
  newOrder: number
): Promise<StoryPhase> {
  // Get current phase
  const { data: current, error: fetchErr } = await supabase
    .from('character_story_phases')
    .select('id, character_id, phase_order')
    .eq('id', phaseId)
    .single();

  if (fetchErr) {
    throw new Error(`Failed to fetch story phase: ${fetchErr.message}`);
  }

  const oldOrder: number = (current as any).phase_order;
  const characterId: string = (current as any).character_id;

  if (newOrder === oldOrder) {
    // Nothing to do
    const { data, error } = await supabase
      .from('character_story_phases')
      .select('*')
      .eq('id', phaseId)
      .single();
    if (error) throw new Error(`Failed to fetch story phase: ${error.message}`);
    return data as StoryPhase;
  }

  if (newOrder < oldOrder) {
    // Moving up: increment orders between newOrder and oldOrder - 1
    const { data: toShift, error: shiftErr } = await supabase
      .from('character_story_phases')
      .select('id, phase_order')
      .eq('character_id', characterId)
      .gte('phase_order', newOrder)
      .lt('phase_order', oldOrder)
      .order('phase_order', { ascending: true });
    if (shiftErr) {
      throw new Error(`Failed to fetch phases to shift: ${shiftErr.message}`);
    }
    if (Array.isArray(toShift)) {
      await Promise.all(
        toShift.map((row) =>
          supabase
            .from('character_story_phases')
            .update({ phase_order: (row as any).phase_order + 1 })
            .eq('id', (row as any).id)
        )
      );
    }
  } else {
    // Moving down: decrement orders between oldOrder + 1 and newOrder
    const { data: toShift, error: shiftErr } = await supabase
      .from('character_story_phases')
      .select('id, phase_order')
      .eq('character_id', characterId)
      .gt('phase_order', oldOrder)
      .lte('phase_order', newOrder)
      .order('phase_order', { ascending: true });
    if (shiftErr) {
      throw new Error(`Failed to fetch phases to shift: ${shiftErr.message}`);
    }
    if (Array.isArray(toShift)) {
      await Promise.all(
        toShift.map((row) =>
          supabase
            .from('character_story_phases')
            .update({ phase_order: (row as any).phase_order - 1 })
            .eq('id', (row as any).id)
        )
      );
    }
  }

  // Update this phase's order
  const { data, error } = await supabase
    .from('character_story_phases')
    .update({ phase_order: newOrder })
    .eq('id', phaseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reorder story phase: ${error.message}`);
  }

  return data as StoryPhase;
}
