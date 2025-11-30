export interface Greeting {
  id: string;
  character_id: string;
  greeting_order: number;
  title: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Get all greetings for a character, ordered by greeting_order
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param greetingOrder - Optional specific greeting order to fetch (1 = initial, 2-13 = alternatives)
 * @returns Array of greetings or a single greeting if greetingOrder is specified
 */
export async function getGreetings({
  supabase,
  characterId,
  greetingOrder,
}: {
  supabase: any;
  characterId: string;
  greetingOrder?: number;
}): Promise<Greeting[]> {
  let query = supabase
    .from('character_greetings')
    .select('*')
    .eq('character_id', characterId)
    .order('greeting_order', { ascending: true });

  if (greetingOrder !== undefined) {
    query = query.eq('greeting_order', greetingOrder);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch greetings: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the count of greetings for a character
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @returns Number of greetings
 */
export async function getGreetingsCount({
  supabase,
  characterId,
}: {
  supabase: any;
  characterId: string;
}): Promise<number> {
  const { count, error } = await supabase
    .from('character_greetings')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId);

  if (error) {
    throw new Error(`Failed to count greetings: ${error.message}`);
  }

  return count || 0;
}
