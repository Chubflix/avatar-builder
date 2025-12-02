/**
 * Character Agent Tools
 * Specialized tools for character description and metadata management
 */

import { tool, type ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getPersonality,
  getAppearance,
  getAllDescriptions,
  updateDescription,
  updateCharacter,
} from '@/src/tools';

/**
 * Tool context interface
 */
export interface CharacterToolContext {
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
 * Get Personality Tool
 */
export const getPersonalityTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

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

/**
 * Get Appearance Tool
 */
export const getAppearanceTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const appearance = await getAppearance(supabase, characterId);
    if (!appearance) {
      return 'This character does not have an appearance description yet.';
    }

    return `Appearance:\n\n${appearance.content}`;
  },
  {
    name: 'get_appearance',
    description: 'Get the physical appearance description for the current character.',
    schema: z.object({}),
  }
);

/**
 * Get All Descriptions Tool
 */
export const getAllDescriptionsTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    const descriptions = await getAllDescriptions(supabase, characterId);
    if (descriptions.length === 0) {
      return 'This character has no description sections yet.';
    }

    const sections = descriptions
      .map((d) => {
        // Handle JSON sections
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

/**
 * Update Description Tool
 */
export const updateDescriptionTool = tool(
  async ({ section, content }: { section: string; content: string }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;

    await updateDescription(supabase, characterId, section, content);

    return `Successfully updated the "${section}" section.`;
  },
  {
    name: 'update_description',
    description:
      'Update or create a description section for the character (personality, appearance, background, profession, relation_to_user, etc.).',
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

/**
 * Update Character Tool
 */
export const updateCharacterTool = tool(
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
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { characterId, supabase } = runtime.context!;

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
      "Update the character's basic information (name, avatar URL, or metadata). Use update_description for personality/appearance/background sections.",
    schema: z.object({
      name: z.string().optional().describe('New name for the character'),
      avatar_url: z.string().optional().describe('New avatar image URL'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata for the character'),
    }),
  }
);

/**
 * Export all character tools
 */
export const characterTools = [
  getPersonalityTool,
  getAppearanceTool,
  getAllDescriptionsTool,
  updateDescriptionTool,
  updateCharacterTool,
];
