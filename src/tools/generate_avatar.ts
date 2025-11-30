/**
 * Generate an avatar for a character using the Avatar Builder API
 * This tool integrates with the existing Next.js Avatar Builder application
 */

export interface AvatarGenerationOptions {
  description: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  batchSize?: number;
  enhanceFace?: boolean;
  negativePrompt?: string;
}

export interface GeneratedAvatar {
  id: string;
  filename: string;
  url: string;
  folderId?: string;
  metadata: {
    prompt: string;
    negativePrompt: string;
    settings: Record<string, any>;
  };
}

/**
 * Generate an avatar image for a character
 * @param characterId - The UUID of the character
 * @param description - Description for the avatar generation prompt
 * @param options - Additional generation options
 * @returns The generated avatar information
 */
export async function generateAvatar(
  characterId: string,
  description: string,
  options: Partial<AvatarGenerationOptions> = {}
): Promise<GeneratedAvatar> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const payload = {
    characterId,
    description,
    orientation: options.orientation || 'portrait',
    batchSize: options.batchSize || 1,
    enhanceFace: options.enhanceFace !== false,
    negativePrompt: options.negativePrompt || ''
  };

  const response = await fetch(`${baseUrl}/api/generate-avatar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to generate avatar: ${error.message}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Generate multiple avatar variations for a character
 * @param characterId - The UUID of the character
 * @param description - Description for the avatar generation prompt
 * @param count - Number of variations to generate
 * @param options - Additional generation options
 * @returns Array of generated avatars
 */
export async function generateAvatarVariations(
  characterId: string,
  description: string,
  count: number = 4,
  options: Partial<AvatarGenerationOptions> = {}
): Promise<GeneratedAvatar[]> {
  const batchOptions = {
    ...options,
    batchSize: Math.min(count, 10) // Limit to 10 per batch
  };

  return generateAvatar(characterId, description, batchOptions) as any;
}
