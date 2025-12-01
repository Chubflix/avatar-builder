/**
 * LangChain Tool Wrappers for Character Management
 * Uses modern LangChain tool() function with context injection
 */

import {tool} from '@langchain/core/tools';
import {z} from 'zod';
import {
    addGreeting,
    analyzeImageAppearance,
    deleteGreeting,
    generateAvatar,
    getAllDescriptions,
    getAppearance,
    getGreetings,
    getGreetingsCount,
    getPersonality,
    updateDescription,
    updateGreeting,
    updateCharacter,
    // Story Phases
    getStoryPhases,
    getStoryPhasesCount,
    addStoryPhase,
    updateStoryPhase,
    reorderStoryPhase,
    deleteStoryPhase,
    deleteStoryPhases,
} from '@/app/tools';

/**
 * Context schema for tool runtime
 */
export const contextSchema = z.object({
  supabase: z.any(), // SupabaseClient (any for complex objects)
  characterId: z.string().uuid(),
});

/**
 * Create character management tools for LangChain
 * Tools receive context (supabase, characterId) at runtime via context injection
 * @returns Array of LangChain tools
 */
export function createCharacterTools() {
  // Get greetings count
  const getGreetingsCountTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const count = await getGreetingsCount({ supabase, characterId });
      return `The character currently has ${count} greeting${count === 1 ? '' : 's'}.`;
    },
    {
      name: 'get_greetings_count',
      description:
        'Get the total number of greetings for the current character. Use this to answer questions like "how many greetings does this character have?"',
      schema: z.object({}),
    }
  );

  // Get all greetings
  const getAllGreetingsTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const greetings = await getGreetings({ supabase, characterId });
      if (greetings.length === 0) {
        return 'This character has no greetings yet.';
      }
      const greetingsList = greetings
        .map(
          (g, i) =>
            `${i + 1}. "${g.title}" (ID: ${g.id}):\n${g.content.substring(0, 150)}...`
        )
        .join('\n\n');
      return `The character has ${greetings.length} greetings:\n\n${greetingsList}`;
    },
    {
      name: 'get_all_greetings',
      description:
        'Get all greetings for the current character. Returns a list of greeting titles, IDs, and their content.',
      schema: z.object({}),
    }
  );

  // Get specific greeting
  const getGreetingTool = tool(
    async ({ order }: { order: number }, { context }: any) => {
      const { supabase, characterId } = context;
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
        order: z
          .number()
          .int()
          .positive()
          .describe('The greeting order number (1 for initial, 2+ for alternatives)'),
      }),
    }
  );

  // Get personality
  const getPersonalityTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const personality = await getPersonality(supabase, characterId);
      if (!personality) {
        return 'This character does not have a personality description yet.';
      }
      return `Personality:\n\n${personality.content}`;
    },
    {
      name: 'get_personality',
      description: 'Get the personality description for the current character.',
      schema: z.object({}),
    }
  );

  // Get appearance
  const getAppearanceTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const appearance = await getAppearance(supabase, characterId);
      if (!appearance) {
        return 'This character does not have an appearance description yet.';
      }
      return `Appearance:\n\n${appearance.content}`;
    },
    {
      name: 'get_appearance',
      description: 'Get the appearance/physical description for the current character.',
      schema: z.object({}),
    }
  );

  // Get all description sections
  const getAllDescriptionsTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const descriptions = await getAllDescriptions(supabase, characterId);
      if (descriptions.length === 0) {
        return 'This character has no description sections yet.';
      }
      const sections = descriptions
        .map((d) => {
          // Handle JSON sections (rundown, traits_and_quirks)
          if (d.section === 'rundown' || d.section === 'traits_and_quirks') {
            try {
              const parsed = JSON.parse(d.content);
              return `**${d.section}**:\n${JSON.stringify(parsed, null, 2)}`;
            } catch {
              return `**${d.section}**:\n${d.content}`;
            }
          }
          return `**${d.section}**:\n${d.content}`;
        })
        .join('\n\n');
      return `Character description sections:\n\n${sections}`;
    },
    {
      name: 'get_all_descriptions',
      description:
        'Get all description sections for the current character (personality, appearance, background, etc.).',
      schema: z.object({}),
    }
  );

  // Add greeting
  const addGreetingTool = tool(
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
      { context }: any
    ) => {
      const { supabase, characterId } = context;
      const metadata = {
        description: description || null,
        is_nsfw: is_nsfw || false,
        pov: pov || 'any',
        has_image: false,
        avatar_prompt: null,
      };
      const greeting = await addGreeting(
        supabase,
        characterId,
        title,
        content,
        metadata,
        { storyPhaseId: typeof storyPhaseId === 'undefined' ? null : storyPhaseId }
      );
      return `Successfully added greeting "${title}" (ID: ${greeting.id}). The character now has a new greeting at position ${greeting.greeting_order}.`;
    },
    {
      name: 'add_greeting',
      description:
        'Add a new greeting to the character. Use this when the user asks to create or add a new greeting scenario.',
      schema: z.object({
        title: z.string().describe('The title/name of the greeting (e.g., "Coffee Shop Meeting")'),
        content: z.string().describe('The full greeting text/content'),
        description: z
          .string()
          .optional()
          .describe('Optional brief description of the scenario'),
        is_nsfw: z.boolean().optional().describe('Whether the greeting contains NSFW content'),
        pov: z
          .enum(['any', 'male', 'female'])
          .optional()
          .describe('Point of view (any, male, or female)'),
        storyPhaseId: z
          .string()
          .nullable()
          .optional()
          .describe('Optional ID of a story phase this greeting belongs to'),
      }),
    }
  );

  // Update greeting
  const updateGreetingTool = tool(
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
      { context }: any
    ) => {
      const { supabase } = context;

      // If not confirmed, return a preview of the changes without saving
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
            message:
              "To save, respond with 'confirm' or call update_greeting with confirmed=true",
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
        'Update an existing greeting. First call WITHOUT confirmed to preview, then WITH confirmed=true to save. Requires the greeting ID which you can get from get_all_greetings.',
      schema: z.object({
        greetingId: z.string().describe('The UUID of the greeting to update'),
        title: z.string().optional().describe('New title for the greeting'),
        content: z.string().optional().describe('New content for the greeting'),
        story_phase_id: z.string().nullable().optional().describe('Set or clear the linked story phase (UUID or null)'),
        confirmed: z.boolean().optional().default(false),
      }),
    }
  );

  // Story Phases: count
  const getStoryPhasesCountTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
      const count = await getStoryPhasesCount({ supabase, characterId });
      return `This character has ${count} story phase${count === 1 ? '' : 's'}.`;
    },
    {
      name: 'get_story_phases_count',
      description: 'Get the total number of story phases for the current character.',
      schema: z.object({}),
    }
  );

  // Story Phases: list all
  const getAllStoryPhasesTool = tool(
    async (_, { context }: any) => {
      const { supabase, characterId } = context;
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

  // Story Phases: get by order
  const getStoryPhaseTool = tool(
    async ({ order }: { order: number }, { context }: any) => {
      const { supabase, characterId } = context;
      const phases = await getStoryPhases({ supabase, characterId, phaseOrder: order });
      if (phases.length === 0) return `No story phase found at order ${order}.`;
      const p = phases[0];
      return `Story Phase #${order} — "${p.name}" (ID: ${p.id})\nDescription: ${p.description ?? '—'}`;
    },
    {
      name: 'get_story_phase',
      description: 'Get a specific story phase by its order number.',
      schema: z.object({ order: z.number().int().positive().describe('The phase order number (1-n)') }),
    }
  );

  // Story Phases: add one
  const addStoryPhaseTool = tool(
    async (
      { name, description }: { name: string; description?: string | null },
      { context }: any
    ) => {
      const { supabase, characterId } = context;
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

  // Story Phases: update
  const updateStoryPhaseTool = tool(
    async (
      {
        phaseId,
        name,
        description,
        confirmed,
      }: { phaseId: string; name?: string; description?: string | null; confirmed?: boolean },
      { context }: any
    ) => {
      const { supabase } = context;

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
            message: "To save, call update_story_phase with confirmed=true",
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
      description:
        'Update a story phase. First call without confirmed to preview changes, then with confirmed=true to save.',
      schema: z.object({
        phaseId: z.string().uuid().describe('ID of the phase to update'),
        name: z.string().optional().describe('New name/title'),
        description: z.string().nullable().optional().describe('New description'),
        confirmed: z.boolean().optional().default(false),
      }),
    }
  );

  // Story Phases: reorder
  const reorderStoryPhaseTool = tool(
    async ({ phaseId, newOrder }: { phaseId: string; newOrder: number }, { context }: any) => {
      const { supabase } = context;
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

  // Story Phases: delete one
  const deleteStoryPhaseTool = tool(
    async ({ phaseId }: { phaseId: string }, { context }: any) => {
      const { supabase } = context;
      await deleteStoryPhase(supabase, phaseId);
      return 'Deleted story phase.';
    },
    {
      name: 'delete_story_phase',
      description: 'Delete a single story phase by ID.',
      schema: z.object({ phaseId: z.string().uuid().describe('ID of the phase to delete') }),
    }
  );

  // Story Phases: delete many
  const deleteStoryPhasesTool = tool(
    async ({ phaseIds }: { phaseIds: string[] }, { context }: any) => {
      const { supabase } = context;
      const res = await deleteStoryPhases(supabase, phaseIds);
      return `Deleted ${res.deletedCount} phase${res.deletedCount === 1 ? '' : 's'}.`;
    },
    {
      name: 'delete_story_phases',
      description: 'Delete multiple story phases by their IDs.',
      schema: z.object({ phaseIds: z.array(z.string().uuid()).min(1) }),
    }
  );

  // Update description section
  const updateDescriptionTool = tool(
    async ({ section, content }: { section: string; content: string }, { context }: any) => {
      const { supabase, characterId } = context;
      await updateDescription(supabase, characterId, section, content);
      return `Successfully updated the "${section}" section.`;
    },
    {
      name: 'update_description',
      description:
        'Update or create a description section for the character (personality, appearance, background, profession, etc.).',
      schema: z.object({
        section: z
          .string()
          .describe(
            'The section name (e.g., "personality", "appearance", "background", "profession", "relation_to_user")'
          ),
        content: z.string().describe('The new content for this section'),
      }),
    }
  );

  // Delete greeting
  const deleteGreetingTool = tool(
    async ({ greetingId }: { greetingId: string }, { context }: any) => {
      const { supabase } = context;
      await deleteGreeting(supabase, greetingId);
      return `Successfully deleted greeting ${greetingId}.`;
    },
    {
      name: 'delete_greeting',
      description:
        'Delete a greeting. Requires the greeting ID which you can get from get_all_greetings.',
      schema: z.object({
        greetingId: z.string().uuid().describe('The UUID of the greeting to delete'),
      }),
    }
  );

  // Analyze image appearance (Vision)
  const analyzeImageAppearanceTool = tool(
    async (
      { image }: { image: string },
      { context }: any
    ) => {
      const { characterId } = context;
      const { description } = await analyzeImageAppearance({ imageUrl: image, characterId });
      return description;
    },
    {
      name: 'analyze_image_appearance',
      description:
        'Analyze an image and return only the visible physical appearance of the character. Supports HTTP(S) URLs or data:image/*;base64 URLs. Do not write anything to the database.',
      schema: z.object({
        image: z
          .string()
          .min(1)
          .describe('Image reference to analyze: either a direct HTTP(S) URL or a data:image/*;base64 URL'),
      }),
    }
  );

  // Generate chat image with confirmation flow
  const generateChatImageTool = tool(
    async (
      {
        prompt,
        orientation,
      }: {
        prompt: string;
        orientation?: 'portrait' | 'landscape';
      },
      { context }: any
    ) => {
      const { supabase, characterId } = context;

      // Load user chat image settings
      let chatImgSettings: any = {};
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (userId) {
          const { data } = await supabase
            .from('user_settings')
            .select('chat_img_settings')
            .eq('user_id', userId)
            .single();
          chatImgSettings = data?.chat_img_settings || {};
        }
      } catch (_) {
        // ignore and use defaults
      }

      const positivePrefix = (chatImgSettings?.positive_prefix || '').trim();
      const negativePrefix = (chatImgSettings?.negative_prefix || '').trim();
      const model = (chatImgSettings?.model || '').trim();

      const finalOrientation: 'portrait' | 'landscape' =
        orientation === 'landscape' ? 'landscape' : 'portrait';

      const finalPositive = [positivePrefix, prompt]
        .filter(Boolean)
        .join(' ')
        .trim();
      const finalNegative = [negativePrefix]
        .filter(Boolean)
        .join(', ')
        .trim();

      // Commit mode - call avatar generation API
      const jobId = await generateAvatar(characterId, finalPositive, {
          orientation: finalOrientation,
          negativePrompt: finalNegative,
      });

      // Return structured message with jobId marker for extraction
      return `Image generation has been queued! [JOB_ID:${jobId}]`;
    },
    {
      name: 'generate_chat_image',
      description:
        'Generate an image from the chat. Supports orientation portrait or landscape.',
      schema: z.object({
        prompt: z.string().min(1).describe('The prompt to generate the image from'),
        orientation: z
          .enum(['portrait', 'landscape'])
          .optional()
          .describe('Desired image orientation. Default is portrait.'),
      }),
    }
  );

  // Update character (name, avatar_url, metadata)
  const updateCharacterTool = tool(
    async (
      {
        name,
        avatar_url,
        metadata,
      }: {
        name?: string;
        avatar_url?: string;
        metadata?: Record<string, any>;
      },
      { context }: any
    ) => {
      const { characterId, supabase } = context;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (metadata !== undefined) updates.metadata = metadata;

      if (Object.keys(updates).length === 0) {
        return 'No updates provided. Please specify at least one field to update (name, avatar_url, or metadata).';
      }

      await updateCharacter(characterId, updates, supabase);

      const updatedFields = Object.keys(updates).join(', ');
      return `Successfully updated character: ${updatedFields}`;
    },
    {
      name: 'update_character',
      description:
        'Update the character\'s basic information (name, avatar URL, or metadata). Use update_description for personality/appearance/background sections.',
      schema: z.object({
        name: z.string().optional().describe('New name for the character'),
        avatar_url: z.string().optional().describe('New avatar image URL'),
        metadata: z
          .record(z.string(), z.any())
          .optional()
          .describe('Additional metadata for the character'),
      }),
    }
  );

  return [
    getGreetingsCountTool,
    getAllGreetingsTool,
    getGreetingTool,
    // Story phase tools
    getStoryPhasesCountTool,
    getAllStoryPhasesTool,
    getStoryPhaseTool,
    addStoryPhaseTool,
    updateStoryPhaseTool,
    reorderStoryPhaseTool,
    deleteStoryPhaseTool,
    deleteStoryPhasesTool,
    getPersonalityTool,
    getAppearanceTool,
    getAllDescriptionsTool,
    addGreetingTool,
    updateGreetingTool,
    updateDescriptionTool,
    deleteGreetingTool,
    analyzeImageAppearanceTool,
    generateChatImageTool,
    updateCharacterTool,
  ];
}
