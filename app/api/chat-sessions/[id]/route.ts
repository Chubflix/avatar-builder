/**
 * Chat Session Individual Operations API
 * Handles update and delete operations on specific sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { publishRealtimeEvent } from '@/app/lib/ably';

/**
 * PUT /api/chat-sessions/:id
 * Update a chat session (rename or change description)
 *
 * Body:
 * {
 *   name?: string,
 *   description?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    const body = await request.json();
    const { name, description } = body;

    // Verify session belongs to user
    const { data: existingSession, error: sessionError } = await supabase
      .from('character_chat_sessions')
      .select('id, character_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !existingSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update session
    const { data: updated, error: updateError } = await supabase
      .from('character_chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Publish realtime event
    try {
      await publishRealtimeEvent('chat-sessions', 'session_updated', {
        session_id: sessionId,
        character_id: existingSession.character_id,
        user_id: user.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating chat session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update chat session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-sessions/:id
 * Delete a chat session and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

    // Get session info before deleting (for realtime event)
    const { data: session, error: sessionError } = await supabase
      .from('character_chat_sessions')
      .select('id, character_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Delete session (messages will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from('character_chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    // Publish realtime event
    try {
      await publishRealtimeEvent('chat-sessions', 'session_deleted', {
        session_id: sessionId,
        character_id: session.character_id,
        user_id: user.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}
