/**
 * Chat Image Upload API
 * Uploads a local image file to S3 under chat/ namespace and returns a public URL.
 * Auth required; verifies character ownership. No DB writes otherwise.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { s3Upload, getImageUrl } from '@/app/lib/s3-server';

function safeFileName(name: string) {
  const base = name.split('\\').pop()?.split('/').pop() || 'image';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return cleaned.toLowerCase();
}

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
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 });
    }

    const formData = await request.formData();
    const character_id = (formData.get('character_id') as string) || '';
    const file = formData.get('file') as File | null;

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Validate image type and size
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const mime = (file as any).type || '';
    if (!allowed.includes(mime)) {
      return NextResponse.json({ error: 'Invalid image type. Allowed: png, jpg, jpeg, webp' }, { status: 400 });
    }
    const size = (file as any).size ?? 0;
    if (size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 400 });
    }

    const bucket = process.env.S3_BUCKET as string | undefined;
    if (!bucket) {
      return NextResponse.json({ error: 'S3_BUCKET not configured' }, { status: 500 });
    }

    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const key = `${user.id}/chat/${character_id}/${timestamp}_${safeFileName((file as any).name || 'image')}`;

    await s3Upload({ bucket, key, body: buffer, contentType: mime, cacheControl: '31536000' });

    const url = getImageUrl(key);
    if (!url) {
      return NextResponse.json({ error: 'Public image base URL not configured' }, { status: 500 });
    }

    return NextResponse.json({ url, storage_path: key });
  } catch (error: any) {
    console.error('Chat image upload error:', error);
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
  }
}
