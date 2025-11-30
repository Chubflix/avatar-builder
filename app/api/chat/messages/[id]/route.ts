/**
 * Chat Message Operations API Route
 * Handles individual message operations (update, delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';

/**
 * PUT /api/chat/messages/:id
 * Update a message content
 *
 * Body:
 * {
 *   character_id: string,
 *   session_id?: string,
 *   content: string
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

    const messageId = params.id;
    const body = await request.json();
    const { character_id, session_id = null, content } = body;

    // Validate input
    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Verify message belongs to user and character
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, character_id, user_id, session_id, created_at')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .eq('character_id', character_id)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Delete all messages after this one (including AI responses)
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('character_id', character_id)
      .eq('user_id', user.id)
      .eq('session_id', session_id || null)
      .gt('created_at', message.created_at);

    if (deleteError) {
      console.error('Error deleting subsequent messages:', deleteError);
      // Continue anyway - we still want to update the message
    }

    // Update the message
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ content: content.trim() })
      .eq('id', messageId);

    if (updateError) {
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/messages/:id
 * Delete a message and all following messages
 *
 * Body:
 * {
 *   character_id: string,
 *   session_id?: string
 * }
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

    const messageId = params.id;
    const body = await request.json();
    const { character_id, session_id = null } = body;

    // Validate input
    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }

    // Verify message belongs to user and character
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, character_id, user_id, session_id, created_at')
      .eq('id', messageId)
      .eq('user_id', user.id)
      .eq('character_id', character_id)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Delete this message and all following messages
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('character_id', character_id)
      .eq('user_id', user.id)
      .eq('session_id', session_id || null)
      .gte('created_at', message.created_at);

    if (deleteError) {
      throw new Error(`Failed to delete messages: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
