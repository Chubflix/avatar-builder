import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Delete a greeting
 * @param supabase - Authenticated Supabase client
 * @param greetingId - The UUID of the greeting to delete
 * @returns Success status
 */
export async function deleteGreeting(supabase: SupabaseClient, greetingId: string): Promise<{ success: boolean }> {
  // First get the greeting to know its character_id and order
  const { data: greeting, error: fetchError } = await supabase
    .from('character_greetings')
    .select('character_id, greeting_order')
    .eq('id', greetingId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch greeting: ${fetchError.message}`);
  }

  // Delete the greeting
  const { error } = await supabase
    .from('character_greetings')
    .delete()
    .eq('id', greetingId);

  if (error) {
    throw new Error(`Failed to delete greeting: ${error.message}`);
  }

  // Reorder remaining greetings to fill the gap
  const { error: reorderError } = await supabase
    .from('character_greetings')
    .update({
      greeting_order: supabase.sql`greeting_order - 1`
    })
    .eq('character_id', greeting.character_id)
    .gt('greeting_order', greeting.greeting_order);

  if (reorderError) {
    // Non-critical error, log it but don't fail
    console.error('Failed to reorder greetings after deletion:', reorderError);
  }

  return { success: true };
}

/**
 * Delete multiple greetings
 * @param supabase - Authenticated Supabase client
 * @param greetingIds - Array of greeting UUIDs to delete
 * @returns Success status with count of deleted greetings
 */
export async function deleteGreetings(
  supabase: SupabaseClient,
  greetingIds: string[]
): Promise<{ success: boolean; deletedCount: number }> {
  const { error, count } = await supabase
    .from('character_greetings')
    .delete({ count: 'exact' })
    .in('id', greetingIds);

  if (error) {
    throw new Error(`Failed to delete greetings: ${error.message}`);
  }

  return { success: true, deletedCount: count || 0 };
}
