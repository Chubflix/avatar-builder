import { parse } from 'yaml';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addGreetings } from './add_greeting';
import { updateDescriptions } from './update_description';

/**
 * Character Sheet YAML Structure (v1.1)
 * Matches character.spec.yaml format
 */
export interface CharacterSheetYAML {
  meta: {
    format_version: string;
    created_at: string;
    last_modified: string;
  };
  changelog?: Array<{
    date: string;
    version: string;
    changes: string[];
  }>;
  character: {
    title: string;
    short_name?: string;
    subtitle?: string;
    in_chat_name?: string;
    tagline?: string;
    tags?: string[];
    description: {
      rundown: {
        name: string;
        age?: string;
        gender?: string;
        species?: string;
        hair?: string;
        eyes?: string;
        ethnicity?: string;
        style?: string;
        build?: string;
        setting?: string;
        [key: string]: string | undefined;
      };
      appearance?: string;
      profession?: string;
      relation_to_user?: string;
      personality?: string;
      traits_and_quirks?: string[];
      background?: string;
    };
    avatars?: Array<{
      prompt: string;
      tags?: string[];
    }>;
    example_dialogs?: string[];
    scenario?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    characters_note?: {
      prompt: string;
      depth: number;
    };
    initial_greeting: {
      title: string;
      description?: string;
      is_nsfw?: boolean;
      pov?: string;
      has_image?: boolean;
      avatar_prompt?: string | null;
      content: string;
    };
    alternative_greetings?: Array<{
      title: string;
      description?: string;
      is_nsfw?: boolean;
      pov?: string;
      has_image?: boolean;
      avatar_prompt?: string | null;
      content: string;
    }>;
  };
  chubAI?: {
    character_id?: string;
    character_url?: string;
    avatar_url?: string;
    avatar_wide_url?: string;
    last_synced?: string;
    sync_status?: string;
  };
}

export interface ParsedCharacter {
  characterId: string;
  name: string;
  slug: string;
  greetingsCount: number;
  descriptionsCount: number;
}

/**
 * Parse a character.spec.yaml file and store it in the database
 * @param supabase - Authenticated Supabase client
 * @param yamlContent - The YAML content as a string
 * @param userId - The user ID who owns this character
 * @param characterId - Optional existing character ID to update
 * @returns Information about the parsed and stored character
 */
export async function parseAndStoreCharacterSheet(
  supabase: SupabaseClient,
  yamlContent: string,
  userId: string,
  characterId?: string
): Promise<ParsedCharacter> {
  // Parse YAML
  const yaml: CharacterSheetYAML = parse(yamlContent);

  if (!yaml.character) {
    throw new Error('Invalid character sheet: missing "character" root object');
  }

  const { character, meta, changelog, chubAI } = yaml;

  // Extract name from rundown
  const name = character.description.rundown.name;
  if (!name) {
    throw new Error('Invalid character sheet: missing character name in description.rundown.name');
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Create or update character
  let finalCharacterId = characterId;

  const characterData = {
    name,
    slug,
    title: character.title,
    short_name: character.short_name || null,
    subtitle: character.subtitle || null,
    in_chat_name: character.in_chat_name || name,
    tagline: character.tagline || null,
    tags: character.tags || [],
    avatar_url: chubAI?.avatar_url || null,
    meta: meta || {},
    spec_data: {
      changelog: changelog || [],
      avatars: character.avatars || [],
      example_dialogs: character.example_dialogs || [],
      scenario: character.scenario || null,
      system_prompt: character.system_prompt || null,
      post_history_instructions: character.post_history_instructions || null,
      characters_note: character.characters_note || null,
      chubAI: chubAI || null
    },
    user_id: userId
  };

  if (characterId) {
    // Update existing character
    const { error } = await supabase
      .from('characters')
      .update(characterData)
      .eq('id', characterId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update character: ${error.message}`);
    }
  } else {
    // Create new character
    const { data, error } = await supabase
      .from('characters')
      .insert(characterData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create character: ${error.message}`);
    }

    finalCharacterId = data.id;
  }

  // Ensure we have a definite character ID (TypeScript narrowing and runtime safety)
  if (!finalCharacterId) {
    // As a fallback, try to resolve by slug + user_id (should rarely happen)
    const { data: resolved } = await supabase
      .from('characters')
      .select('id')
      .eq('slug', slug)
      .eq('user_id', userId)
      .single();
    if (resolved?.id) {
      finalCharacterId = resolved.id as string;
    } else {
      throw new Error('Failed to resolve character ID after create/update');
    }
  }

  const finalCharacterIdStr: string = finalCharacterId as string;

  // Store description sections
  const descriptionSections = [];

  if (character.description.appearance) {
    descriptionSections.push({ section: 'appearance', content: character.description.appearance });
  }
  if (character.description.personality) {
    descriptionSections.push({ section: 'personality', content: character.description.personality });
  }
  if (character.description.background) {
    descriptionSections.push({ section: 'background', content: character.description.background });
  }
  if (character.description.profession) {
    descriptionSections.push({ section: 'profession', content: character.description.profession });
  }
  if (character.description.relation_to_user) {
    descriptionSections.push({ section: 'relation_to_user', content: character.description.relation_to_user });
  }

  // Store rundown as JSON
  descriptionSections.push({
    section: 'rundown',
    content: JSON.stringify(character.description.rundown)
  });

  // Store traits_and_quirks as JSON array
  if (character.description.traits_and_quirks && character.description.traits_and_quirks.length > 0) {
    descriptionSections.push({
      section: 'traits_and_quirks',
      content: JSON.stringify(character.description.traits_and_quirks)
    });
  }

  const descriptions = await updateDescriptions(supabase, finalCharacterIdStr, descriptionSections);

  // Store greetings (initial + alternatives)
  const greetings = [
    {
      title: character.initial_greeting.title || 'Initial Greeting',
      content: character.initial_greeting.content,
      metadata: {
        description: character.initial_greeting.description || null,
        is_nsfw: character.initial_greeting.is_nsfw || false,
        pov: character.initial_greeting.pov || 'any',
        has_image: character.initial_greeting.has_image || false,
        avatar_prompt: character.initial_greeting.avatar_prompt || null
      }
    }
  ];

  if (character.alternative_greetings && character.alternative_greetings.length > 0) {
    greetings.push(
      ...character.alternative_greetings.map((g, i) => ({
        title: g.title || `Alternative Greeting ${i + 1}`,
        content: g.content,
        metadata: {
          description: g.description || null,
          is_nsfw: g.is_nsfw || false,
          pov: g.pov || 'any',
          has_image: g.has_image || false,
          avatar_prompt: g.avatar_prompt || null
        }
      }))
    );
  }

  const storedGreetings = await addGreetings(supabase, finalCharacterIdStr, greetings);

  return {
    characterId: finalCharacterIdStr,
    name,
    slug,
    greetingsCount: storedGreetings.length,
    descriptionsCount: descriptions.length
  };
}

/**
 * Parse a character.spec.yaml file from a File object
 * @param supabase - Authenticated Supabase client
 * @param file - The file object containing YAML content
 * @param userId - The user ID who owns this character
 * @param characterId - Optional existing character ID to update
 * @returns Information about the parsed and stored character
 */
export async function parseCharacterSheetFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  characterId?: string
): Promise<ParsedCharacter> {
  const text = await file.text();
  return parseAndStoreCharacterSheet(supabase, text, userId, characterId);
}

/**
 * Export a character to character.spec.yaml format
 * @param supabase - Authenticated Supabase client
 * @param characterId - The UUID of the character
 * @param userId - The user ID for authorization
 * @returns YAML string representation of the character
 */
export async function exportCharacterToYAML(supabase: SupabaseClient, characterId: string, userId: string): Promise<string> {
  // Fetch character
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single();

  if (charError) {
    throw new Error(`Failed to fetch character: ${charError.message}`);
  }

  // Fetch greetings
  const { data: greetings, error: greetingsError } = await supabase
    .from('character_greetings')
    .select('*')
    .eq('character_id', characterId)
    .order('greeting_order', { ascending: true });

  if (greetingsError) {
    throw new Error(`Failed to fetch greetings: ${greetingsError.message}`);
  }

  // Fetch descriptions
  const { data: descriptions, error: descriptionsError } = await supabase
    .from('character_description_sections')
    .select('*')
    .eq('character_id', characterId);

  if (descriptionsError) {
    throw new Error(`Failed to fetch descriptions: ${descriptionsError.message}`);
  }

  // Build description object
  const descriptionObj: any = {
    rundown: {}
  };

  descriptions?.forEach((desc) => {
    if (desc.section === 'rundown') {
      try {
        descriptionObj.rundown = JSON.parse(desc.content);
      } catch {
        descriptionObj.rundown = { name: character.name };
      }
    } else if (desc.section === 'traits_and_quirks') {
      try {
        descriptionObj.traits_and_quirks = JSON.parse(desc.content);
      } catch {
        descriptionObj.traits_and_quirks = [];
      }
    } else {
      descriptionObj[desc.section] = desc.content;
    }
  });

  // Ensure rundown has at least a name
  if (!descriptionObj.rundown.name) {
    descriptionObj.rundown.name = character.name;
  }

  // Build YAML object
  const yamlObj: CharacterSheetYAML = {
    meta: character.meta || {
      format_version: '1.1',
      created_at: character.created_at,
      last_modified: character.updated_at
    },
    changelog: character.spec_data?.changelog || [],
    character: {
      title: character.title || character.name,
      short_name: character.short_name || undefined,
      subtitle: character.subtitle || undefined,
      in_chat_name: character.in_chat_name || character.name,
      tagline: character.tagline || undefined,
      tags: character.tags || [],
      description: descriptionObj,
      avatars: character.spec_data?.avatars || [],
      example_dialogs: character.spec_data?.example_dialogs || [],
      scenario: character.spec_data?.scenario || undefined,
      system_prompt: character.spec_data?.system_prompt || undefined,
      post_history_instructions: character.spec_data?.post_history_instructions || undefined,
      characters_note: character.spec_data?.characters_note || undefined,
      initial_greeting: {
        title: greetings?.[0]?.title || 'Initial Greeting',
        description: greetings?.[0]?.metadata?.description || undefined,
        is_nsfw: greetings?.[0]?.metadata?.is_nsfw || false,
        pov: greetings?.[0]?.metadata?.pov || 'any',
        has_image: greetings?.[0]?.metadata?.has_image || false,
        avatar_prompt: greetings?.[0]?.metadata?.avatar_prompt || null,
        content: greetings?.[0]?.content || ''
      },
      alternative_greetings: greetings?.slice(1).map((g) => ({
        title: g.title,
        description: g.metadata?.description || undefined,
        is_nsfw: g.metadata?.is_nsfw || false,
        pov: g.metadata?.pov || 'any',
        has_image: g.metadata?.has_image || false,
        avatar_prompt: g.metadata?.avatar_prompt || null,
        content: g.content
      }))
    },
    chubAI: character.spec_data?.chubAI || undefined
  };

  // Convert to YAML string
  const yaml = require('yaml');
  return yaml.stringify(yamlObj);
}
