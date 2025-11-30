/**
 * Generate Avatar API
 * Integrates with existing Stable Diffusion generation system
 * to create avatars for characters
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      characterId,
      description,
      orientation = 'portrait',
      batchSize = 1,
      enhanceFace = true,
      negativePrompt = ''
    } = body;

    if (!characterId || !description) {
      return NextResponse.json(
        { error: 'characterId and description are required' },
        { status: 400 }
      );
    }

    // Get character to find associated folder
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, folder:folders!characters_folder_id_fkey(id, name)')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Get the character's folder (or create one if it doesn't exist)
    let folderId = (character.folder as any)?.id;

    if (!folderId) {
      // Create a folder for this character
      const { data: newFolder, error: folderError } = await supabase
        .from('folders')
        .insert({
          name: character.name,
          character_id: characterId,
          user_id: user.id
        })
        .select()
        .single();

      if (folderError) {
        console.error('Failed to create folder:', folderError);
        // Continue without folder
      } else {
        folderId = newFolder.id;

        // Update character with folder_id
        await supabase
          .from('characters')
          .update({ folder_id: folderId })
          .eq('id', characterId);
      }
    }

    // Load config from file system or default
    const configResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/config`);
    const config = await configResponse.json();

    // Build generation payload
    const dims = config.dimensions[orientation];

    // Note: This creates a job specification, but actual generation
    // is handled by the existing SD queue system. In a production setup,
    // you would submit this to the queue and return job details.

    // For now, return a success response with job details
    // The actual implementation would integrate with the queue system
    const jobDetails = {
      id: crypto.randomUUID(),
      characterId,
      folderId,
      prompt: description,
      negativePrompt: negativePrompt || config.defaults.negativePrompt,
      orientation,
      batchSize: Math.min(batchSize, 10),
      width: dims.width,
      height: dims.height,
      enhanceFace,
      status: 'queued'
    };

    return NextResponse.json({
      success: true,
      job: jobDetails,
      message: 'Avatar generation job created. Implement queue integration for actual generation.'
    });

  } catch (error) {
    console.error('Error in generate-avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
