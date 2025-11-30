import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, searchSimilarDocuments } from '@/app/lib/embeddings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface DocumentChunk {
  id: string;
  character_id: string | null;
  content: string;
  metadata: Record<string, any>;
  similarity?: number;
}

/**
 * Search world rules and lore documents using semantic similarity
 * This uses the RAG (Retrieval Augmented Generation) approach with embeddings
 * @param query - The search query
 * @param characterId - Optional character ID to search character-specific + global docs
 * @param userId - User ID for authorization
 * @param limit - Maximum number of results to return (default: 5)
 * @param threshold - Minimum similarity threshold (0-1, default: 0.5)
 * @returns Array of matching document chunks
 */
export async function searchWorldRules(
  query: string,
  characterId: string,
  userId: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<DocumentChunk[]> {
  try {
    const results = await searchSimilarDocuments({
      supabase,
      query,
      characterId,
      userId,
      matchThreshold: threshold,
      matchCount: limit
    });

    return results.map(doc => ({
      id: doc.id,
      character_id: doc.character_id,
      content: doc.content,
      metadata: doc.metadata || {},
      similarity: doc.similarity
    }));
  } catch (error) {
    throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search world rules by keyword (non-semantic search)
 * @param keyword - The keyword to search for
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of matching document chunks
 */
export async function searchWorldRulesByKeyword(
  keyword: string,
  limit: number = 10
): Promise<DocumentChunk[]> {
  const { data, error } = await supabase
    .from('character_documents')
    .select('id, character_id, content, metadata')
    .textSearch('content', keyword, {
      type: 'websearch',
      config: 'english'
    })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all world rules and lore for a specific character
 * @param characterId - The UUID of the character
 * @returns Array of document chunks for the character
 */
export async function getCharacterWorldRules(characterId: string): Promise<DocumentChunk[]> {
  const { data, error } = await supabase
    .from('character_documents')
    .select('id, character_id, content, metadata')
    .eq('character_id', characterId);

  if (error) {
    throw new Error(`Failed to fetch character documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Add a world rule or lore document for a character
 * @param characterId - The UUID of the character (or null for global rules)
 * @param userId - User ID for authorization
 * @param title - Document title
 * @param content - The document content
 * @param metadata - Additional metadata (e.g., {type: 'rule', tags: ['magic', 'combat']})
 * @param isGlobal - Whether this is a global document (default: false)
 * @returns The created document
 */
export async function addWorldRule(
  characterId: string | null,
  userId: string,
  title: string,
  content: string,
  metadata: Record<string, any> = {},
  isGlobal: boolean = false
): Promise<DocumentChunk> {
  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(content);

    // Store document with embedding
    const { data, error } = await supabase
      .from('character_documents')
      .insert({
        character_id: characterId,
        user_id: userId,
        title,
        content,
        metadata,
        is_global: isGlobal,
        embedding
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add document: ${error.message}`);
    }

    return {
      id: data.id,
      character_id: data.character_id,
      content: data.content,
      metadata: data.metadata || {}
    };
  } catch (error) {
    throw new Error(`Failed to add document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a world rule or lore document
 * @param documentId - The UUID of the document to delete
 * @returns Success status
 */
export async function deleteWorldRule(documentId: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('character_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }

  return { success: true };
}
