/**
 * Public Characters API
 * Returns a public list of characters intended for the Browse page.
 * No authentication required. Only non-sensitive fields are returned.
 */

import { NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createAuthClient();

    // Select only public-safe fields; rely on RLS to restrict visibility if configured
    const { data, error } = await supabase
      .from('characters')
      .select('id, slug, name, title, subtitle, tags, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map tags to array if they come back as null
    const result = (data || []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      title: c.title,
      subtitle: c.subtitle,
      tags: Array.isArray(c.tags) ? c.tags : [],
      avatar_url: c.avatar_url,
      created_at: c.created_at,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching public characters:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch characters' }, { status: 500 });
  }
}
