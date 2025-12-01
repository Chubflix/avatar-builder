export interface StoryPhase {
  id: string;
  character_id: string;
  phase_order: number;
  name: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get all story phases for a character, ordered by phase_order
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 */
export async function getStoryPhases({
  supabase,
  characterId,
  phaseOrder,
}: {
  supabase: any;
  characterId: string;
  phaseOrder?: number;
}): Promise<StoryPhase[]> {
  let query = supabase
    .from('character_story_phases')
    .select('*')
    .eq('character_id', characterId)
    .order('phase_order', { ascending: true });

  if (phaseOrder !== undefined) {
    query = query.eq('phase_order', phaseOrder);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch story phases: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the count of story phases for a character
 */
export async function getStoryPhasesCount({
  supabase,
  characterId,
}: {
  supabase: any;
  characterId: string;
}): Promise<number> {
  const { count, error } = await supabase
    .from('character_story_phases')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId);

  if (error) {
    throw new Error(`Failed to count story phases: ${error.message}`);
  }

  return count || 0;
}
