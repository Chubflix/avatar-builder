/**
 * Character Document Individual Operations API
 * Handles update and delete operations on specific documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/app/lib/supabase-server';
import { updateDocument, deleteDocument } from '@/app/lib/embeddings';
import { publishRealtimeEvent } from '@/app/lib/ably';

/**
 * PUT /api/documents/:id
 * Update a document (and regenerate embedding if content changes)
 *
 * Body:
 * {
 *   title?: string,
 *   content?: string,
 *   metadata?: object
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

    const documentId = params.id;
    const body = await request.json();
    const { title, content, metadata } = body;

    // Verify document belongs to user
    const { data: existingDoc, error: docError } = await supabase
      .from('character_documents')
      .select('id, character_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update document
    const updated = await updateDocument({
      supabase,
      documentId,
      userId: user.id,
      title,
      content,
      metadata,
    });

    // Publish realtime event
    try {
      await publishRealtimeEvent('documents', 'document_updated', {
        document_id: documentId,
        character_id: existingDoc.character_id,
        user_id: user.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating document:', error);

    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'Embeddings service not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/:id
 * Delete a document
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

    const documentId = params.id;

    // Get document info before deleting (for realtime event)
    const { data: doc, error: docError } = await supabase
      .from('character_documents')
      .select('id, character_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete document
    await deleteDocument({
      supabase,
      documentId,
      userId: user.id,
    });

    // Publish realtime event
    try {
      await publishRealtimeEvent('documents', 'document_deleted', {
        document_id: documentId,
        character_id: doc.character_id,
        user_id: user.id,
      });
    } catch (e: any) {
      console.warn('Failed to publish realtime event:', e?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
