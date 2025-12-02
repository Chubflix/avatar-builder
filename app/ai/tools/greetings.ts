/**
 * Greetings Agent Tools
 * Specialized tools for managing character greetings and story phases
 */

import { tool, type ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getGreetings,
  getGreetingsCount,
  addGreeting,
  updateGreeting,
  deleteGreeting,
  getStoryPhases,
  getStoryPhasesCount,
  addStoryPhase,
  updateStoryPhase,
  reorderStoryPhase,
  deleteStoryPhase,
  deleteStoryPhases,
} from '@/src/tools';

/**
 * Tool context interface
 */
export interface GreetingsToolContext {
  supabase: SupabaseClient;
  characterId: string;
}

/**
 * Context schema for runtime validation
 */
const contextSchema = z.object({
  supabase: z.any(), // SupabaseClient
  characterId: z.string(),
});

/**
 * Get Greetings Count Tool
 */
export const getGreetingsCountTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const count = await getGreetingsCount({ supabase, characterId });
    return `The character currently has ${count} greeting${count === 1 ? '' : 's'}.`;
  },
  {
    name: 'get_greetings_count',
    description:
      'Get the total number of greetings for the current character. Use this to answer "how many greetings?"',
    schema: z.object({}),
  }
);

/**
 * Get All Greetings Tool
 */
export const getAllGreetingsTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const greetings = await getGreetings({ supabase, characterId });
    if (greetings.length === 0) {
      return 'This character has no greetings yet.';
    }

    const greetingsList = greetings
      .map((g, i) => `${i + 1}. "${g.title}" (ID: ${g.id}):\n${g.content.substring(0, 150)}...`)
      .join('\n\n');

    return `The character has ${greetings.length} greetings:\n\n${greetingsList}`;
  },
  {
    name: 'get_all_greetings',
    description: 'Get all greetings for the current character. Returns titles, IDs, and content snippets.',
    schema: z.object({}),
  }
);

/**
 * Get Specific Greeting Tool
 */
export const getGreetingTool = tool(
  async ({ order }: { order: number }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const greetings = await getGreetings({ supabase, characterId, greetingOrder: order });
    if (greetings.length === 0) {
      return `No greeting found at position ${order}.`;
    }

    const greeting = greetings[0];
    return `Greeting #${order} - "${greeting.title}" (ID: ${greeting.id}):\n\n${greeting.content}`;
  },
  {
    name: 'get_greeting',
    description:
      'Get a specific greeting by its order number (1 = initial greeting, 2+ = alternative greetings).',
    schema: z.object({
      order: z.number().int().positive().describe('The greeting order number (1 for initial, 2+ for alternatives)'),
    }),
  }
);

/**
 * Add Greeting Tool
 */
export const addGreetingTool = tool(
  async (
    {
      title,
      content,
      description,
      is_nsfw,
      pov,
      storyPhaseId,
    }: {
      title: string;
      content: string;
      description?: string;
      is_nsfw?: boolean;
      pov?: 'any' | 'male' | 'female';
      storyPhaseId?: string | null;
    },
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { supabase, characterId } = runtime.context!;

    const metadata = {
      description: description || null,
      is_nsfw: is_nsfw || false,
      pov: pov || 'any',
      has_image: false,
      avatar_prompt: null,
    };

    const greeting = await addGreeting(supabase, characterId, title, content, metadata, {
      storyPhaseId: typeof storyPhaseId === 'undefined' ? null : storyPhaseId,
    });

    return `Successfully added greeting "${title}" (ID: ${greeting.id}). The character now has a new greeting at position ${greeting.greeting_order}.`;
  },
  {
    name: 'add_greeting',
    description: 'Add a new greeting to the character. Use when the user asks to create a greeting scenario.',
    schema: z.object({
      title: z.string().describe('The title/name of the greeting (e.g., "Coffee Shop Meeting")'),
      content: z.string().describe('The full greeting text/content'),
      description: z.string().optional().describe('Optional brief description of the scenario'),
      is_nsfw: z.boolean().optional().describe('Whether the greeting contains NSFW content'),
      pov: z.enum(['any', 'male', 'female']).optional().describe('Point of view (any, male, or female)'),
      storyPhaseId: z
        .string()
        .nullable()
        .optional()
        .describe('Optional ID of a story phase this greeting belongs to'),
    }),
  }
);

/**
 * Update Greeting Tool
 */
export const updateGreetingTool = tool(
  async (
    {
      greetingId,
      title,
      content,
      confirmed,
      story_phase_id,
    }: {
      greetingId: string;
      title?: string;
      content?: string;
      confirmed?: boolean;
      story_phase_id?: string | null;
    },
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { supabase } = runtime.context!;

    // Preview mode
    if (!confirmed) {
      const { data: current, error } = await supabase
        .from('character_greetings')
        .select('*')
        .eq('id', greetingId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch current greeting: ${error.message}`);
      }

      const proposed: Record<string, any> = {};
      if (typeof title !== 'undefined') proposed.title = title;
      if (typeof content !== 'undefined') proposed.content = content;
      if (typeof story_phase_id !== 'undefined') proposed.story_phase_id = story_phase_id;

      return JSON.stringify(
        {
          preview: true,
          current: {
            title: current?.title,
            content: current?.content,
          },
          proposed,
          message: "To save, call update_greeting with confirmed=true",
        },
        null,
        2
      );
    }

    // Confirmed: perform the update
    const updates: any = {};
    if (typeof title !== 'undefined') updates.title = title;
    if (typeof content !== 'undefined') updates.content = content;
    if (typeof story_phase_id !== 'undefined') updates.story_phase_id = story_phase_id;

    await updateGreeting(supabase, greetingId, updates);
    return `✅ Saved!`;
  },
  {
    name: 'update_greeting',
    description:
      'Update an existing greeting. First call WITHOUT confirmed to preview, then WITH confirmed=true to save. Requires greeting ID from get_all_greetings.',
    schema: z.object({
      greetingId: z.string().describe('The UUID of the greeting to update'),
      title: z.string().optional().describe('New title for the greeting'),
      content: z.string().optional().describe('New content for the greeting'),
      story_phase_id: z.string().nullable().optional().describe('Set or clear the linked story phase (UUID or null)'),
      confirmed: z.boolean().optional().default(false),
    }),
  }
);

/**
 * Delete Greeting Tool
 */
export const deleteGreetingTool = tool(
  async ({ greetingId }: { greetingId: string }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase } = runtime.context!;

    await deleteGreeting(supabase, greetingId);
    return `Successfully deleted greeting ${greetingId}.`;
  },
  {
    name: 'delete_greeting',
    description: 'Delete a greeting. Requires greeting ID from get_all_greetings.',
    schema: z.object({
      greetingId: z.string().uuid().describe('The UUID of the greeting to delete'),
    }),
  }
);

/**
 * Get Story Phases Count Tool
 */
export const getStoryPhasesCountTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const count = await getStoryPhasesCount({ supabase, characterId });
    return `This character has ${count} story phase${count === 1 ? '' : 's'}.`;
  },
  {
    name: 'get_story_phases_count',
    description: 'Get the total number of story phases for the current character.',
    schema: z.object({}),
  }
);

/**
 * Get All Story Phases Tool
 */
export const getAllStoryPhasesTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const phases = await getStoryPhases({ supabase, characterId });
    if (phases.length === 0) return 'This character has no story phases yet.';

    const lines = phases
      .map((p, i) => `${i + 1}. "${p.name}" (ID: ${p.id}) — ${p.description ?? 'No description'}`)
      .join('\n');

    return `Story phases (ordered):\n${lines}`;
  },
  {
    name: 'get_all_story_phases',
    description: 'List all story phases (ordered) for the current character.',
    schema: z.object({}),
  }
);

/**
 * Get Story Phase Tool
 */
export const getStoryPhaseTool = tool(
  async ({ order }: { order: number }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const phases = await getStoryPhases({ supabase, characterId, phaseOrder: order });
    if (phases.length === 0) return `No story phase found at order ${order}.`;

    const p = phases[0];
    return `Story Phase #${order} — "${p.name}" (ID: ${p.id})\nDescription: ${p.description ?? '—'}`;
  },
  {
    name: 'get_story_phase',
    description: 'Get a specific story phase by its order number.',
    schema: z.object({
      order: z.number().int().positive().describe('The phase order number (1-n)'),
    }),
  }
);

/**
 * Add Story Phase Tool
 */
export const addStoryPhaseTool = tool(
  async ({ name, description }: { name: string; description?: string | null }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const phase = await addStoryPhase(supabase, characterId, name, description ?? null);
    return `Added story phase "${phase.name}" (ID: ${phase.id}) at position ${phase.phase_order}.`;
  },
  {
    name: 'add_story_phase',
    description: 'Create a new story phase for the current character.',
    schema: z.object({
      name: z.string().describe('Name/title of the phase (e.g., Act I, Backstory)'),
      description: z.string().nullable().optional().describe('Optional description for this phase'),
    }),
  }
);

/**
 * Update Story Phase Tool
 */
export const updateStoryPhaseTool = tool(
  async (
    {
      phaseId,
      name,
      description,
      confirmed,
    }: { phaseId: string; name?: string; description?: string | null; confirmed?: boolean },
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { supabase } = runtime.context!;

    if (!confirmed) {
      const { data: current, error } = await supabase
        .from('character_story_phases')
        .select('*')
        .eq('id', phaseId)
        .single();

      if (error) throw new Error(`Failed to fetch current story phase: ${error.message}`);

      const proposed: Record<string, any> = {};
      if (typeof name !== 'undefined') proposed.name = name;
      if (typeof description !== 'undefined') proposed.description = description;

      return JSON.stringify(
        {
          preview: true,
          current: { name: current?.name, description: current?.description },
          proposed,
          message: 'To save, call update_story_phase with confirmed=true',
        },
        null,
        2
      );
    }

    const updates: any = {};
    if (typeof name !== 'undefined') updates.name = name;
    if (typeof description !== 'undefined') updates.description = description;

    await updateStoryPhase(supabase, phaseId, updates);
    return '✅ Saved!';
  },
  {
    name: 'update_story_phase',
    description: 'Update a story phase. First call without confirmed to preview, then with confirmed=true to save.',
    schema: z.object({
      phaseId: z.string().uuid().describe('ID of the phase to update'),
      name: z.string().optional().describe('New name/title'),
      description: z.string().nullable().optional().describe('New description'),
      confirmed: z.boolean().optional().default(false),
    }),
  }
);

/**
 * Reorder Story Phase Tool
 */
export const reorderStoryPhaseTool = tool(
  async ({ phaseId, newOrder }: { phaseId: string; newOrder: number }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase } = runtime.context!;

    const phase = await reorderStoryPhase(supabase, phaseId, newOrder);
    return `Reordered phase to position ${phase.phase_order}.`;
  },
  {
    name: 'reorder_story_phase',
    description: 'Move a story phase to a new order position.',
    schema: z.object({
      phaseId: z.string().uuid().describe('ID of the phase to move'),
      newOrder: z.number().int().positive().describe('New 1-based order index'),
    }),
  }
);

/**
 * Delete Story Phase Tool
 */
export const deleteStoryPhaseTool = tool(
  async ({ phaseId }: { phaseId: string }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase } = runtime.context!;

    await deleteStoryPhase(supabase, phaseId);
    return 'Deleted story phase.';
  },
  {
    name: 'delete_story_phase',
    description: 'Delete a single story phase by ID.',
    schema: z.object({
      phaseId: z.string().uuid().describe('ID of the phase to delete'),
    }),
  }
);

/**
 * Delete Story Phases Tool
 */
export const deleteStoryPhasesTool = tool(
  async ({ phaseIds }: { phaseIds: string[] }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase } = runtime.context!;

    const res = await deleteStoryPhases(supabase, phaseIds);
    return `Deleted ${res.deletedCount} phase${res.deletedCount === 1 ? '' : 's'}.`;
  },
  {
    name: 'delete_story_phases',
    description: 'Delete multiple story phases by their IDs.',
    schema: z.object({
      phaseIds: z.array(z.string()).min(1),
    }),
  }
);

/**
 * Assign Story Phase to Greetings Tool
 */
export const assignStoryPhaseToGreetingsTool = tool(
  async (
    {
      greetingIds,
      story_phase_id,
    }: {
      greetingIds: string[];
      story_phase_id: string | null;
    },
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { supabase } = runtime.context!;

    const { error } = await supabase
      .from('character_greetings')
      .update({ story_phase_id })
      .in('id', greetingIds);

    if (error) throw new Error(`Failed to update greetings: ${error.message}`);

    return `✅ Assigned story phase to ${greetingIds.length} greeting(s)!`;
  },
  {
    name: 'assign_story_phase_to_greetings',
    description:
      'Assign multiple greetings to a story phase. Requires greeting IDs from get_all_greetings and phase ID from get_all_story_phases.',
    schema: z.object({
      greetingIds: z.array(z.string()).min(1).describe('The UUIDs of the greetings to update'),
      story_phase_id: z.string().nullable().describe('Set or clear the linked story phase (UUID or null)'),
    }),
  }
);

/**
 * Export all greetings tools
 */
export const greetingsTools = [
  getGreetingsCountTool,
  getAllGreetingsTool,
  getGreetingTool,
  addGreetingTool,
  updateGreetingTool,
  deleteGreetingTool,
  getStoryPhasesCountTool,
  getAllStoryPhasesTool,
  getStoryPhaseTool,
  addStoryPhaseTool,
  updateStoryPhaseTool,
  reorderStoryPhaseTool,
  deleteStoryPhaseTool,
  deleteStoryPhasesTool,
  assignStoryPhaseToGreetingsTool,
];
