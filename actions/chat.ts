'use server';

/**
 * Chat Server Actions
 * Handles character creator chat conversations using LangChain + Deepseek
 */

import { createAuthClient } from '@/app/lib/supabase-server';
import { chat, trimConversationHistory, ChatMessage, generateSessionTitle } from '@/app/lib/ai';
import { publishRealtimeEvent } from '@/app/lib/ably';
import { parseCharacterSheetFile } from '@/app/tools';
import { s3Upload, getImageUrl } from '@/app/lib/s3-server';

export interface SendChatMessageParams {
  character_id: string;
  message: string;
  session_id?: string | null;
  include_history?: boolean;
  file?: File | null;
}

export interface SendChatMessageResult {
  message: string;
  metadata?: any;
  message_id?: string;
  session_id?: string | null;
  error?: string;
}

export interface GetChatHistoryParams {
  character_id: string;
  session_id?: string | null;
  limit?: number;
}

export interface ChatHistoryMessage {
  id: string;
  role: string;
  content: string;
  metadata: any;
  session_id: string | null;
  created_at: string;
}

export interface ClearChatHistoryParams {
  character_id: string;
  session_id?: string | null;
}

export interface UpdateChatMessageParams {
  message_id: string;
  character_id: string;
  session_id?: string | null;
  content: string;
}

export interface DeleteChatMessageParams {
  message_id: string;
  character_id: string;
  session_id?: string | null;
}

export interface UploadChatImageParams {
  character_id: string;
  file: File;
}

export interface UploadChatImageResult {
  url: string;
  storage_path: string;
  error?: string;
}

/**
 * Helper function to create a safe filename
 */
function safeFileName(name: string): string {
  const base = name.split('\\').pop()?.split('/').pop() || 'image';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return cleaned.toLowerCase();
}

/**
 * Send a message to the character creator assistant
 */
export async function sendChatMessage(params: SendChatMessageParams): Promise<SendChatMessageResult> {
  try {
    const { character_id, message, session_id = null, include_history = true, file = null } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { message: '', error: 'Unauthorized' };
    }

    // Validate input
    if (!character_id) {
      return { message: '', error: 'character_id is required' };
    }
    if (!message?.trim()) {
      return { message: '', error: 'message is required' };
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, description')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return { message: '', error: 'Character not found' };
    }

    // Handle new session creation with auto-generated title
    let currentSessionId = session_id;
    if (session_id === '__NEW_SESSION__') {
      try {
        // Generate session title from the first message
        const sessionTitle = await generateSessionTitle(message.trim());

        // Create the session
        const { data: newSession, error: sessionError } = await supabase
          .from('character_chat_sessions')
          .insert({
            character_id,
            user_id: user.id,
            name: sessionTitle,
            description: null,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Use the newly created session ID
        currentSessionId = newSession.id;

        // Publish realtime event
        try {
          await publishRealtimeEvent('chat-sessions', 'session_created', {
            character_id,
            user_id: user.id,
            session_id: newSession.id,
          });
        } catch (e: any) {
          console.warn('Failed to publish realtime event:', e?.message);
        }
      } catch (error: any) {
        console.error('Error creating session:', error);
        // Continue without session if creation fails
        currentSessionId = null;
      }
    }

    // Verify session belongs to user and character (if provided)
    if (currentSessionId && currentSessionId !== '__NEW_SESSION__') {
      const { data: session, error: sessionError } = await supabase
        .from('character_chat_sessions')
        .select('id, character_id')
        .eq('id', currentSessionId)
        .eq('character_id', character_id)
        .eq('user_id', user.id)
        .single();

      if (sessionError || !session) {
        return { message: '', error: 'Chat session not found' };
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
      if (currentSessionId) {
        query = query.eq('session_id', currentSessionId);
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
        session_id: currentSessionId,
        role: 'user',
        content: message.trim(),
        metadata: {},
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Process uploaded character sheet if present
    let updateSummary = '';
    if (file) {
      try {
        console.log('[Chat Action] Processing uploaded character sheet:', file.name);

        // Parse the character sheet and update the existing character
        const result = await parseCharacterSheetFile(supabase, file, user.id, character_id);

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

        console.log('[Chat Action] Character updated:', updateSummary);
      } catch (error: any) {
        console.error('[Chat Action] Error processing character sheet:', error);
        updateSummary = `\n\n[System: Error processing character sheet: ${error.message}]`;
      }
    }

    // Prepare message for AI (include update summary if file was uploaded)
    const messageForAI = file
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

    // Extract jobId from response content or metadata
    let jobId = response.metadata?.jobId || null;

    // Also try to extract from content if present (fallback)
    if (!jobId) {
      const jobIdMatch = response.content.match(/\[JOB_ID:([^\]]+)\]/);
      jobId = jobIdMatch ? jobIdMatch[1] : null;
    }

    // Remove the jobId marker from the content for cleaner display
    const cleanContent = response.content.replace(/\[JOB_ID:[^\]]+\]/g, '').trim();

    // Add jobId to metadata if present
    const metadata = {
      ...(response.metadata || {}),
      ...(jobId ? { jobId } : {}),
    };

    // Save assistant response to database
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        character_id,
        user_id: user.id,
        session_id: currentSessionId,
        role: 'assistant',
        content: cleanContent,
        metadata,
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

    return {
      message: cleanContent,
      metadata,
      message_id: assistantMsg?.id,
      session_id: currentSessionId, // Return session_id so frontend can update if it was auto-created
    };
  } catch (error: any) {
    console.error('Chat action error:', error);

    // Handle specific errors
    if (error.message?.includes('DEEPSEEK_API_KEY')) {
      return {
        message: '',
        error: 'Chat service not configured. Please set DEEPSEEK_API_KEY.',
      };
    }

    return {
      message: '',
      error: error.message || 'Failed to process chat message',
    };
  }
}

/**
 * Get chat history for a character (optionally filtered by session)
 */
export async function getChatHistory(params: GetChatHistoryParams): Promise<ChatHistoryMessage[] | { error: string }> {
  try {
    const { character_id, session_id = null, limit = 100 } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Unauthorized' };
    }

    if (!character_id) {
      return { error: 'character_id is required' };
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return { error: 'Character not found' };
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

    return (messages || []) as ChatHistoryMessage[];
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return { error: error.message };
  }
}

/**
 * Clear chat history for a character (optionally filtered by session)
 */
export async function clearChatHistory(params: ClearChatHistoryParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { character_id, session_id = null } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!character_id) {
      return { success: false, error: 'character_id is required' };
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return { success: false, error: 'Character not found' };
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

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting chat messages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a chat message content
 */
export async function updateChatMessage(params: UpdateChatMessageParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { message_id, character_id, session_id = null, content } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate input
    if (!character_id) {
      return { success: false, error: 'character_id is required' };
    }
    if (!content?.trim()) {
      return { success: false, error: 'content is required' };
    }

    // Verify message belongs to user and character
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, character_id, user_id, session_id, created_at')
      .eq('id', message_id)
      .eq('user_id', user.id)
      .eq('character_id', character_id)
      .single();

    if (msgError || !message) {
      return { success: false, error: 'Message not found' };
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
      .eq('id', message_id);

    if (updateError) {
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating message:', error);
    return {
      success: false,
      error: error.message || 'Failed to update message',
    };
  }
}

/**
 * Delete a chat message and all following messages
 */
export async function deleteChatMessage(params: DeleteChatMessageParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { message_id, character_id, session_id = null } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate input
    if (!character_id) {
      return { success: false, error: 'character_id is required' };
    }

    // Verify message belongs to user and character
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, character_id, user_id, session_id, created_at')
      .eq('id', message_id)
      .eq('user_id', user.id)
      .eq('character_id', character_id)
      .single();

    if (msgError || !message) {
      return { success: false, error: 'Message not found' };
    }

    // Delete this message and all following messages
    const { error: deleteError } = session_id
      ? await supabase
          .from('chat_messages')
          .delete()
          .eq('character_id', character_id)
          .eq('user_id', user.id)
          .eq('session_id', session_id)
          .gte('created_at', message.created_at)
      : await supabase
          .from('chat_messages')
          .delete()
          .eq('character_id', character_id)
          .eq('user_id', user.id)
          .gte('created_at', message.created_at);

    if (deleteError) {
      throw new Error(`Failed to delete messages: ${deleteError.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete message',
    };
  }
}

/**
 * Upload a chat image to S3 and return public URL
 */
export async function uploadChatImage(params: UploadChatImageParams): Promise<UploadChatImageResult> {
  try {
    const { character_id, file } = params;

    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { url: '', storage_path: '', error: 'Unauthorized' };
    }

    if (!character_id) {
      return { url: '', storage_path: '', error: 'character_id is required' };
    }
    if (!file) {
      return { url: '', storage_path: '', error: 'file is required' };
    }

    // Verify character belongs to user
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', character_id)
      .eq('user_id', user.id)
      .single();

    if (charError || !character) {
      return { url: '', storage_path: '', error: 'Character not found' };
    }

    // Validate image type and size
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    const mime = file.type || '';
    if (!allowed.includes(mime)) {
      return { url: '', storage_path: '', error: 'Invalid image type. Allowed: png, jpg, jpeg, webp' };
    }
    const size = file.size ?? 0;
    if (size > 8 * 1024 * 1024) {
      return { url: '', storage_path: '', error: 'Image too large (max 8MB)' };
    }

    const bucket = process.env.S3_BUCKET as string | undefined;
    if (!bucket) {
      return { url: '', storage_path: '', error: 'S3_BUCKET not configured' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const key = `${user.id}/chat/${character_id}/${timestamp}_${safeFileName(file.name || 'image')}`;

    await s3Upload({ bucket, key, body: buffer, contentType: mime, cacheControl: '31536000' });

    const url = getImageUrl(key);
    if (!url) {
      return { url: '', storage_path: '', error: 'Public image base URL not configured' };
    }

    return { url, storage_path: key };
  } catch (error: any) {
    console.error('Chat image upload error:', error);
    return { url: '', storage_path: '', error: error?.message || 'Upload failed' };
  }
}
