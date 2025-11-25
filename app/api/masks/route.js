import { NextResponse } from 'next/server';
import { createAuthClient, saveMask } from '@/app/lib/supabase-server';
import { getImageUrl } from '@/app/lib/s3-server';

// POST /api/masks
// Creates or updates a mask. If id is missing, generate one and upload base64 to S3 under {userId}/masks/{id}.png
export async function POST(request) {
  try {
    const supabase = createAuthClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { id, base64 = null, width = null, height = null, info_json = {} } = body || {};

    if (!id) {
      // Generate UUID per requirement
      id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : (await import('uuid')).v4();
    }

    const savedId = await saveMask({
      supabase,
      userId: user.id,
      mask: { id, base64, width, height, info_json }
    });

    // Fetch storage path by constructing it deterministically
    const storage_path = `${user.id}/masks/${savedId}.png`;

    return NextResponse.json({ id: savedId, storage_path, url: getImageUrl(storage_path) });
  } catch (error) {
    console.error('Error saving mask:', error);
    return NextResponse.json({ error: error.message || 'Failed to save mask' }, { status: 500 });
  }
}
