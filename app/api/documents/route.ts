/**
 * Character Documents API Routes
 * Manages character-specific documents for RAG
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { storeDocument, storeDocumentWithChunking, getDocuments } from '@/app/lib/embeddings';
import { publishRealtimeEvent } from '@/app/lib/ably';

/**
 * GET /api/documents?character_id=xxx&is_global=true
 * Get all documents for a character OR global documents
 *
 * Query params:
 * - character_id: string (optional, omit for global docs only)
 * - is_global: boolean (optional, set to true to fetch only global docs)
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
    const is_global = searchParams.get('is_global') === 'true';

    // If fetching global documents
    if (is_global) {
      const { data: documents, error } = await supabase
        .from('character_documents')
        .select('id, character_id, user_id, title, content, filename, file_type, is_global, metadata, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('is_global', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json(documents || []);
    }

    // If fetching character-specific documents
    if (!character_id) {
      return NextResponse.json({
        error: 'character_id is required unless is_global=true'
      }, { status: 400 });
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

    // Get character-specific documents
    const documents = await getDocuments({
      supabase,
      characterId: character_id,
      userId: user.id,
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Create a new document with embedding
 *
 * Supports both JSON and FormData:
 *
 * JSON Body:
 * {
 *   character_id: string | null (null for global docs),
 *   title: string,
 *   content: string,
 *   is_global?: boolean,
 *   metadata?: object,
 *   use_chunking?: boolean
 * }
 *
 * FormData (for file uploads):
 * - character_id: string | null (null for global docs)
 * - title: string
 * - file: File
 * - is_global?: boolean
 * - use_chunking?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let character_id: string | null = null;
    let title: string = '';
    let content: string = '';
    let filename: string | null = null;
    let fileType: string | null = null;
    let isGlobal: boolean = false;
    let metadata: Record<string, any> = {};
    let use_chunking: boolean = false;

    // Handle FormData (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      character_id = formData.get('character_id') as string | null;
      title = formData.get('title') as string || '';
      isGlobal = formData.get('is_global') === 'true';
      use_chunking = formData.get('use_chunking') === 'true';

      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'file is required for file uploads' }, { status: 400 });
      }

      // Extract file info
      filename = file.name;
      fileType = file.type || 'text/plain';

      // Read file content
      content = await file.text();

      // If no title provided, use filename
      if (!title.trim()) {
        title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
      }
    } else {
      // Handle JSON
      const body = await request.json();
      character_id = body.character_id;
      title = body.title;
      content = body.content;
      isGlobal = body.is_global || false;
      metadata = body.metadata || {};
      use_chunking = body.use_chunking || false;
    }

    // Validate input
    if (!isGlobal && !character_id) {
      return NextResponse.json({
        error: 'character_id is required for character-specific documents. Use is_global=true for global documents.'
      }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Verify character belongs to user (if not global)
    if (!isGlobal && character_id) {
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('id, name')
        .eq('id', character_id)
        .eq('user_id', user.id)
        .single();

      if (charError || !character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
      }
    }

    // Store document with or without chunking
    let result;
    if (use_chunking || content.length > 1000) {
      result = await storeDocumentWithChunking({
        supabase,
        characterId: character_id,
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
        filename,
        fileType,
        isGlobal,
        metadata,
      });
    } else {
      result = await storeDocument({
        supabase,
        characterId: character_id,
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
        filename,
        fileType,
        isGlobal,
        metadata,
      });
    }

    // Publish realtime event
    try {
      await publishRealtimeEvent('documents', 'document_created', {
        character_id,
        user_id: user.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating document:', error);

    // Handle specific errors
    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'Embeddings service not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}
