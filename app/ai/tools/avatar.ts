/**
 * Avatar Agent Tools
 * Specialized tools for avatar generation and image analysis
 */

import { tool, type ToolRuntime } from '@langchain/core/tools';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { generateAvatar } from '@/src/tools/generate_avatar';
import { analyzeImageAppearance as analyzeImage } from '@/src/tools/analyze_image_appearance';

/**
 * Tool context interface
 * Injected at runtime, not visible to the LLM
 */
export interface AvatarToolContext {
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
 * Generate Avatar Tool
 * Creates a character avatar image using AI generation
 */
export const generateAvatarTool = tool(
  async (
    {
      prompt,
      orientation,
    }: {
      prompt: string;
      orientation?: 'portrait' | 'landscape';
    },
    runtime: ToolRuntime<any, typeof contextSchema>
  ) => {
    const { supabase, characterId } = runtime.context!;

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
      // Use defaults if settings not available
    }

    const positivePrefix = (chatImgSettings?.positive_prefix || '').trim();
    const negativePrefix = (chatImgSettings?.negative_prefix || '').trim();

    const finalOrientation: 'portrait' | 'landscape' = orientation === 'landscape' ? 'landscape' : 'portrait';

    const finalPositive = [positivePrefix, prompt].filter(Boolean).join(' ').trim();
    const finalNegative = [negativePrefix].filter(Boolean).join(', ').trim();

    // Call avatar generation API
    const jobId = await generateAvatar(characterId, finalPositive, {
      orientation: finalOrientation,
      negativePrompt: finalNegative,
    });

    // Return structured message with jobId marker for extraction
    return {
        success: true,
        message: `Image generation has been queued!`,
        jobId: jobId,
        pending: true,
    }
  },
  {
    name: 'generate_avatar',
    description:
      'Generate an avatar image for the character. Use Danbooru-style tags with underscores (e.g., "dark_hair, blue_eyes"). Supports portrait or landscape orientation.',
    schema: z.object({
      prompt: z
        .string()
        .min(1)
        .describe('Image generation prompt using Danbooru tags with underscores (e.g., "dark_hair, blue_eyes")'),
      orientation: z
        .enum(['portrait', 'landscape'])
        .optional()
        .describe('Image orientation. Defaults to portrait if not specified.'),
    }),
  }
);

/**
 * Analyze Image Appearance Tool
 * Analyzes an image URL and extracts visible physical appearance
 */
export const analyzeImageAppearanceTool = tool(
  async ({ image }: { image: string }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { characterId } = runtime.context!;

    const { description } = await analyzeImage({
      imageUrl: image,
      characterId,
    });

    return description;
  },
  {
    name: 'analyze_image_appearance',
    description:
      'Analyze an image and return only the visible physical appearance of the character. Supports HTTP(S) URLs or data:image URLs. Does not write to database.',
    schema: z.object({
      image: z
        .string()
        .min(1)
        .describe('Image URL to analyze: either HTTP(S) URL or data:image/*;base64 URL'),
    }),
  }
);

/**
 * Export all avatar tools
 */
export const avatarTools = [generateAvatarTool, analyzeImageAppearanceTool];
