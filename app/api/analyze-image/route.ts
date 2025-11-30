/**
 * Analyze Image API Route
 * Accepts an image file upload or an image URL and returns a description of the character's appearance.
 * IMPORTANT: This endpoint DOES NOT write to the database. It only returns a description.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { analyzeImageAppearance } from '@/src/tools/analyze_image_appearance';

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// MIME detection moved into shared tool

/**
 * POST /api/analyze-image
 * Body: multipart/form-data with file OR JSON { imageUrl: string, character_id: string }
 * Auth required. Verifies character ownership. Returns { description }.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let character_id: string | null = null;
    let imageUrl: string | null = null;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      character_id = (formData.get('character_id') as string) || null;
      file = (formData.get('file') as File) || null;
    } else {
      const body = await request.json();
      character_id = body?.character_id || null;
      imageUrl = body?.imageUrl || null;
    }

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }

    // Verify character belongs to user (no writes performed)
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Ensure we have either an image URL or a file
    if (!file && !isHttpUrl(imageUrl)) {
      return NextResponse.json({ error: 'Provide an image file or a valid imageUrl' }, { status: 400 });
    }

    // Delegate analysis to shared tool
    const { description } = await analyzeImageAppearance({
      imageUrl: imageUrl || undefined,
      file: file || undefined,
      characterId: character_id,
    });

    // Return description only; no DB writes
    return NextResponse.json({ description });
  } catch (error: any) {
    if (error?.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'Image analysis not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }
    console.error('Analyze Image API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
