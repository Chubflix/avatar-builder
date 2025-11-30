import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { createHash } from 'crypto';

/**
 * GET /api/me
 * Returns basic info about the current authenticated user needed by the client UI.
 * Currently used to provide a Gravatar URL for the user's chat avatar.
 */
export async function GET() {
  try {
    const supabase = createAuthClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = (user.email || '').trim().toLowerCase();
    let gravatarUrl: string | null = null;
    if (email) {
      const hash = createHash('md5').update(email).digest('hex');
      gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=80&d=identicon&r=g`;
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      gravatar: gravatarUrl,
    });
  } catch (e: any) {
    console.error('[API /api/me] Failed:', e?.message || e);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
