/**
 * Character Sheet Upload API
 * Handles uploading and parsing character.spec.yaml files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { parseAndStoreCharacterSheet } from '@/src/tools/parse_character_sheet';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const characterId = formData.get('characterId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .yaml or .yml files are supported.' },
        { status: 400 }
      );
    }

    // Read file content
    const yamlContent = await file.text();

    // Parse and store the character sheet
    const result = await parseAndStoreCharacterSheet(
      supabase,
      yamlContent,
      user.id,
      characterId || undefined
    );

    return NextResponse.json({
      success: true,
      character: result,
      message: characterId
        ? 'Character updated successfully'
        : 'Character created successfully'
    });

  } catch (error) {
    console.error('Error uploading character sheet:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload character sheet',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
