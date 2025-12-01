import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryPhase } from './get_story_phases';

/**
 * Create a new story phase for a character
 */
export async function addStoryPhase(
  supabase: SupabaseClient,
  characterId: string,
  name: string,
  description: string | null = null,
  metadata: Record<string, any> = {}
): Promise<StoryPhase> {
  // Determine next phase_order
  const { data: maxData, error: maxError } = await supabase
    .from('character_story_phases')
    .select('phase_order')
    .eq('character_id', characterId)
    .order('phase_order', { ascending: false })
    .limit(1);

  if (maxError) {
    throw new Error(`Failed to fetch max phase order: ${maxError.message}`);
  }

  const nextOrder = maxData && maxData.length > 0 ? (maxData[0] as any).phase_order + 1 : 1;

  const { data, error } = await supabase
    .from('character_story_phases')
    .insert({
      character_id: characterId,
      phase_order: nextOrder,
      name,
      description,
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add story phase: ${error.message}`);
  }

  return data as StoryPhase;
}

/**
 * Create multiple story phases for a character at once
 */
export async function addStoryPhases(
  supabase: SupabaseClient,
  characterId: string,
  phases: Array<{ name: string; description?: string | null; metadata?: Record<string, any> }>
): Promise<StoryPhase[]> {
  const { data: maxData, error: maxError } = await supabase
    .from('character_story_phases')
    .select('phase_order')
    .eq('character_id', characterId)
    .order('phase_order', { ascending: false })
    .limit(1);

  if (maxError) {
    throw new Error(`Failed to fetch max phase order: ${maxError.message}`);
  }

  let nextOrder = maxData && maxData.length > 0 ? (maxData[0] as any).phase_order + 1 : 1;

  const inserts = phases.map((p) => ({
    character_id: characterId,
    phase_order: nextOrder++,
    name: p.name,
    description: p.description ?? null,
    metadata: p.metadata ?? {},
  }));

  const { data, error } = await supabase
    .from('character_story_phases')
    .insert(inserts)
    .select();

  if (error) {
    throw new Error(`Failed to add story phases: ${error.message}`);
  }

  return (data || []) as StoryPhase[];
}
