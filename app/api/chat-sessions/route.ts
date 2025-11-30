/**
 * Chat Sessions API Routes
 * Manages multiple chat sessions per character
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { publishRealtimeEvent } from '@/app/lib/ably';

/**
 * GET /api/chat-sessions?character_id=xxx
 * Get all chat sessions for a character
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const character_id = searchParams.get('character_id');

    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
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

    // Get all sessions for this character
    const { data: sessions, error } = await supabase
      .from('character_chat_sessions')
      .select('id, character_id, user_id, name, description, created_at, updated_at, last_message_at')
      .eq('character_id', character_id)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(sessions || []);
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/chat-sessions
 * Create a new chat session
 *
 * Body:
 * {
 *   character_id: string,
 *   name: string,
 *   description?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { character_id, name, description = null } = body;

    // Validate input
    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Create session
    const { data: session, error } = await supabase
      .from('character_chat_sessions')
      .insert({
        character_id,
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Publish realtime event
    try {
      await publishRealtimeEvent('chat-sessions', 'session_created', {
        character_id,
        user_id: user.id,
        session_id: session.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create chat session' },
      { status: 500 }
    );
  }
}
