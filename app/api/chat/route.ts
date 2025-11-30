/**
 * Chat API Route
 * Handles character creator chat conversations using LangChain + Deepseek
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { chat, trimConversationHistory, ChatMessage } from '@/app/lib/ai';
import { publishRealtimeEvent } from '@/app/lib/ably';
import { parseCharacterSheetFile } from '@/src/tools';

/**
 * POST /api/chat
 * Send a message to the character creator assistant
 *
 * Body:
 * {
 *   character_id: string,
 *   message: string,
 *   session_id?: string (optional, for multiple chat sessions),
 *   include_history?: boolean (default: true)
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

    // Handle multipart/form-data (file upload) or JSON
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let uploadedFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        character_id: formData.get('character_id'),
        message: formData.get('message'),
        session_id: formData.get('session_id'),
        include_history: formData.get('include_history') === 'true',
      };
      uploadedFile = formData.get('file') as File | null;
    } else {
      body = await request.json();
    }

    const { character_id, message, session_id = null, include_history = true } = body;

    // Validate input
    if (!character_id) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, description')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Verify session belongs to user and character (if provided)
    if (session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('character_chat_sessions')
        .select('id, character_id')
        .eq('id', session_id)
        .eq('character_id', character_id)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
      }
    }

    // Get conversation history if requested
    let conversationHistory: ChatMessage[] = [];
    if (include_history) {
      let query = supabase
        .from('chat_messages')
        .select('role, content, metadata, created_at')
        .eq('character_id', character_id)
        .eq('user_id', user.id);

      // Filter by session if provided
      if (session_id) {
        query = query.eq('session_id', session_id);
      } else {
        // If no session_id, get messages without a session (legacy behavior)
        query = query.is('session_id', null);
      }

      const { data: messages, error: msgError } = await query
        .order('created_at', { ascending: true })
        .limit(50); // Limit to last 50 messages

      if (!msgError && messages) {
        conversationHistory = messages.map((msg: any) => ({
          role: msg.role as ChatMessage['role'],
          content: msg.content,
          metadata: msg.metadata || {},
        }));

        // Trim to fit token limits
        conversationHistory = trimConversationHistory(conversationHistory);
      }
    }

    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        character_id,
        user_id: user.id,
        session_id,
        role: 'user',
        content: message.trim(),
        metadata: {},
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Process uploaded character sheet if present
    let updateSummary = '';
    if (uploadedFile) {
      try {
        console.log('[Chat API] Processing uploaded character sheet:', uploadedFile.name);

        // Parse the character sheet and update the existing character
        const result = await parseCharacterSheetFile(supabase, uploadedFile, user.id, character_id);

        // Generate summary of what was updated
        const updates: string[] = [];
        if (result.greetingsCount > 0) {
          updates.push(`${result.greetingsCount} greetings`);
        }
        if (result.descriptionsCount > 0) {
          updates.push(`${result.descriptionsCount} description sections`);
        }
        updates.push('character metadata');

        updateSummary = updates.length > 0
          ? `\n\n[System: Successfully updated character from uploaded sheet: ${updates.join(', ')}]`
          : '\n\n[System: Character sheet processed]';

        console.log('[Chat API] Character updated:', updateSummary);
      } catch (error: any) {
        console.error('[Chat API] Error processing character sheet:', error);
        updateSummary = `\n\n[System: Error processing character sheet: ${error.message}]`;
      }
    }

    // Prepare message for AI (include update summary if file was uploaded)
    const messageForAI = uploadedFile
      ? `${message.trim()}${updateSummary}`
      : message.trim();

    // Get AI response with RAG (searches both character-specific AND global docs)
    const response = await chat(
      supabase,
      character_id,
      user.id,
      messageForAI,
      conversationHistory,
      {
        name: character.name,
        description: character.description,
      }
    );

    // Save assistant response to database
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        character_id,
        user_id: user.id,
        session_id,
        role: 'assistant',
        content: response.content,
        metadata: response.metadata || {},
      })
      .select()
      .single();

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError);
    }

    // Publish realtime event
    try {
      await publishRealtimeEvent('chat', 'message_received', {
        character_id,
        user_id: user.id,
        role: 'assistant',
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json({
      message: response.content,
      metadata: response.metadata,
      message_id: assistantMsg?.id,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle specific errors
    if (error.message?.includes('DEEPSEEK_API_KEY')) {
      return NextResponse.json(
        { error: 'Chat service not configured. Please set DEEPSEEK_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat?character_id=xxx&session_id=xxx
 * Get chat history for a character (optionally filtered by session)
 *
 * Query params:
 * - character_id: string (required)
 * - session_id: string (optional, filter by session)
 * - limit: number (optional, default 100)
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
    const session_id = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '100');

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

    // Build query
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, metadata, session_id, created_at')
      .eq('character_id', character_id)
      .eq('user_id', user.id);

    // Filter by session if provided
    if (session_id) {
      query = query.eq('session_id', session_id);
    } else {
      // If no session_id, get messages without a session (legacy behavior)
      query = query.is('session_id', null);
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json(messages || []);
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat?character_id=xxx&session_id=xxx
 * Clear chat history for a character (optionally filtered by session)
 *
 * Query params:
 * - character_id: string (required)
 * - session_id: string (optional, delete only messages from this session)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const character_id = searchParams.get('character_id');
    const session_id = searchParams.get('session_id');

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

    // Build delete query
    let query = supabase
      .from('chat_messages')
      .delete()
      .eq('character_id', character_id)
      .eq('user_id', user.id);

    // Filter by session if provided
    if (session_id) {
      query = query.eq('session_id', session_id);
    } else {
      // If no session_id, delete messages without a session (legacy behavior)
      query = query.is('session_id', null);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting chat messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
