/**
 * Analyze Image API Route
 * Accepts an image file upload or an image URL and returns a description of the character's appearance.
 * IMPORTANT: This endpoint DOES NOT write to the database. It only returns a description.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

async function callOpenAIVision({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const body = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.4,
  } as any;

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Failed to parse OpenAI response');
  }
  return text;
}

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getMimeTypeFromFilename(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

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

    // Build prompt for appearance-only description
    const prompt = `Describe only the character's physical appearance visible in the image. Focus on:
- approximate age range, body type, height impression
- face (shape, features), eyes (shape/color), hair (style/color/length)
- skin tone, notable marks (scars, tattoos), accessories
- clothing style, colors, textures, and overall aesthetic
Do not speculate about personality, backstory, or things not visible. Keep it concise (120-180 words).`;

    let description: string;

    if (file) {
      // Basic size and type validation
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const mime = file.type || getMimeTypeFromFilename(file.name || '');
      if (!allowedTypes.includes(mime)) {
        return NextResponse.json({ error: 'Invalid image type. Allowed: png, jpg, jpeg, webp' }, { status: 400 });
      }
      if ((file as any).size && (file as any).size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      description = await callOpenAIVision({ imageUrl: dataUrl, prompt });
    } else {
      description = await callOpenAIVision({ imageUrl: imageUrl as string, prompt });
    }

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
