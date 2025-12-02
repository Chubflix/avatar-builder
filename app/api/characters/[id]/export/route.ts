import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

/**
 * Export a character in chara_card_v2 JSON format (similar to character-creator-spec/character.json)
 * GET /api/characters/[id]/export
 * Note: The dynamic segment [id] accepts either a slug or a UUID. We'll look up by slug unless it matches UUID format.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ident = params?.id;
  if (!ident) {
    return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ident);

  const supabase = createAuthClient();
  let query = supabase
    .from('characters')
    .select(
      [
        'id',
        'slug',
        'name',
        'title',
        'subtitle',
        'tagline',
        'tags',
        'avatar_url',
        'spec_data',
      ].join(', ')
    );

  query = isUuid ? query.eq('id', ident) : query.eq('slug', ident);

  const { data: character, error } = await query.single<{
    id: string;
    slug: string;
    name: string | null;
    title: string | null;
    subtitle: string | null;
    tagline: string | null;
    tags: string[] | null;
    avatar_url: string | null;
    spec_data: any;
  }>();

  if (error || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  // Fetch greetings (include content)
  const { data: greetings } = await supabase
    .from('character_greetings')
    .select('greeting_order, content')
    .eq('character_id', character.id)
    .order('greeting_order', { ascending: true });

  // Fetch description sections
  const { data: descriptions } = await supabase
    .from('character_description_sections')
    .select('section, content')
    .eq('character_id', character.id);

  // Helpers to get sections safely
  const getSection = (key: string) => (descriptions || []).find((s: any) => s.section === key)?.content || '';

  const name: string = character.name || character.title || character.slug;
  const avatar: string = character.avatar_url || '';
  const tags: string[] = Array.isArray(character.tags) ? character.tags : [];

  // Description: prefer a rich description if present, otherwise compose from sections
  const personality = getSection('personality');
  const appearance = getSection('appearance');
  const background = getSection('background');
  const relationToUser = getSection('relation_to_user');
  const profession = getSection('profession');
  const rundown = getSection('rundown');

  const composedDescriptionParts = [rundown, appearance, profession, relationToUser, personality, background].filter(
    Boolean
  );

  const description: string = composedDescriptionParts.length ? composedDescriptionParts.join('\n\n') : character.tagline || '';

  // first message and examples from greetings
  const firstGreeting = (greetings || []).find((g: any) => g.greeting_order === 1);
  const first_mes: string = firstGreeting?.content || '';

  const altGreetings = (greetings || []).filter((g: any) => g.greeting_order && g.greeting_order > 1);
  const mes_example: string = altGreetings.map((g: any) => `\n<START>\n${g.content || ''}`).join('\n');

  // scenario/system/post-history may exist in spec_data.character
  const specCharacter: any = character?.spec_data?.character || {};
  const scenario: string = specCharacter?.scenario || getSection('scenario') || '';
  const system_prompt: string = specCharacter?.system_prompt || getSection('system_prompt') || '';
  const post_history_instructions: string = specCharacter?.post_history_instructions || '';

  // Build v2 card structure
  const payload = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name,
      description,
      personality: personality || '',
      first_mes,
      avatar,
      mes_example,
      scenario,
      creator_notes: '', // per instruction: leave empty for now
      system_prompt,
      post_history_instructions,
      alternate_greetings: altGreetings.map((g: any) => g.content || ''),
      tags,
      creator: '',
      character_version: '1.1',
      extensions: {},
      character_book: null,
    },
  } as const;

  const filenameBase = character.slug || character.id;
  const json = JSON.stringify(payload, null, 2);
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filenameBase}-character.json"`,
  });

  return new NextResponse(json, { status: 200, headers });
}
