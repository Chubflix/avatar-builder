import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Delete a single story phase and compact subsequent phase_order values
 */
export async function deleteStoryPhase(
  supabase: SupabaseClient,
  phaseId: string
): Promise<{ success: boolean }> {
  // Fetch the phase to get character_id and phase_order
  const { data: phase, error: fetchErr } = await supabase
    .from('character_story_phases')
    .select('character_id, phase_order')
    .eq('id', phaseId)
    .single();

  if (fetchErr) {
    throw new Error(`Failed to fetch story phase: ${fetchErr.message}`);
  }

  const characterId = (phase as any).character_id as string;
  const order = (phase as any).phase_order as number;

  // Delete the phase
  const { error: delErr } = await supabase
    .from('character_story_phases')
    .delete()
    .eq('id', phaseId);

  if (delErr) {
    throw new Error(`Failed to delete story phase: ${delErr.message}`);
  }

  // Shift following phases up by one to close the gap
  try {
    const { data: toShift, error: shiftFetchErr } = await supabase
      .from('character_story_phases')
      .select('id, phase_order')
      .eq('character_id', characterId)
      .gt('phase_order', order)
      .order('phase_order', { ascending: true });

    if (!shiftFetchErr && Array.isArray(toShift) && toShift.length > 0) {
      await Promise.all(
        toShift.map((row) =>
          supabase
            .from('character_story_phases')
            .update({ phase_order: (row as any).phase_order - 1 })
            .eq('id', (row as any).id)
        )
      );
    }
  } catch (err) {
    console.error('Failed to compact phase order after deletion:', err);
  }

  return { success: true };
}

/**
 * Delete multiple story phases by IDs
 */
export async function deleteStoryPhases(
  supabase: SupabaseClient,
  phaseIds: string[]
): Promise<{ success: boolean; deletedCount: number }> {
  const { error, count } = await supabase
    .from('character_story_phases')
    .delete({ count: 'exact' })
    .in('id', phaseIds);

  if (error) {
    throw new Error(`Failed to delete story phases: ${error.message}`);
  }

  return { success: true, deletedCount: count || 0 };
}
