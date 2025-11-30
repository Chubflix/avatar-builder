/**
 * Embeddings Service for Character Documents
 * Handles vector embeddings generation and similarity search using Supabase pgvector
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { createAuthClient } from './supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CharacterDocument {
  id: string;
  character_id: string | null;  // NULL for global documents
  user_id: string;
  title: string;
  content: string;
  filename?: string | null;  // Original filename if uploaded from file
  file_type?: string | null;  // MIME type or extension
  is_global?: boolean;  // True for global documents (rulebooks, lore)
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentSearchResult extends CharacterDocument {
  similarity: number;
}

/**
 * Initialize OpenAI Embeddings
 * Uses the same API that powers text-embedding-ada-002
 */
export function createEmbeddingsModel() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    modelName: 'text-embedding-ada-002',
    stripNewLines: true,
  });
}

/**
 * Generate embedding vector for a text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddings = createEmbeddingsModel();
    const vector = await embeddings.embedQuery(text);
    return vector;
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = createEmbeddingsModel();
    const vectors = await embeddings.embedDocuments(texts);
    return vectors;
  } catch (error: any) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error.message}`);
  }
}

/**
 * Store a document with its embedding in Supabase
 * Supports both character-specific and global documents
 */
export async function storeDocument({
  supabase,
  characterId,
  userId,
  title,
  content,
  filename,
  fileType,
  isGlobal = false,
  metadata = {},
}: {
  supabase: SupabaseClient;
  characterId: string | null;  // NULL for global documents
  userId: string;
  title: string;
  content: string;
  filename?: string | null;
  fileType?: string | null;
  isGlobal?: boolean;
  metadata?: Record<string, any>;
}): Promise<CharacterDocument> {
  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(content);

    // Insert document with embedding
    const { data, error } = await supabase
      .from('character_documents')
      .insert({
        character_id: characterId,
        user_id: userId,
        title,
        content,
        filename: filename || null,
        file_type: fileType || null,
        is_global: isGlobal,
        embedding,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    return data as CharacterDocument;
  } catch (error: any) {
    console.error('Error storing document:', error);
    throw new Error(`Failed to store document: ${error.message}`);
  }
}

/**
 * Update a document and regenerate its embedding
 */
export async function updateDocument({
  supabase,
  documentId,
  userId,
  title,
  content,
  metadata,
}: {
  supabase: SupabaseClient;
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
}): Promise<CharacterDocument> {
  try {
    const updates: any = {};

    if (title !== undefined) updates.title = title;
    if (metadata !== undefined) updates.metadata = metadata;

    // If content is updated, regenerate embedding
    if (content !== undefined) {
      updates.content = content;
      updates.embedding = await generateEmbedding(content);
    }

    const { data, error } = await supabase
      .from('character_documents')
      .update(updates)
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data as CharacterDocument;
  } catch (error: any) {
    console.error('Error updating document:', error);
    throw new Error(`Failed to update document: ${error.message}`);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument({
  supabase,
  documentId,
  userId,
}: {
  supabase: SupabaseClient;
  documentId: string;
  userId: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('character_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting document:', error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Retrieve documents for a character
 */
export async function getDocuments({
  supabase,
  characterId,
  userId,
}: {
  supabase: SupabaseClient;
  characterId: string;
  userId: string;
}): Promise<CharacterDocument[]> {
  try {
    const { data, error } = await supabase
      .from('character_documents')
      .select('id, character_id, user_id, title, content, metadata, created_at, updated_at')
      .eq('character_id', characterId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as CharacterDocument[];
  } catch (error: any) {
    console.error('Error retrieving documents:', error);
    throw new Error(`Failed to retrieve documents: ${error.message}`);
  }
}

/**
 * Search for similar documents using vector similarity
 * This is the core RAG retrieval function
 * Searches both character-specific AND global documents
 */
export async function searchSimilarDocuments({
  supabase,
  query,
  characterId,
  userId,
  matchThreshold = 0.5,
  matchCount = 5,
}: {
  supabase: SupabaseClient;
  query: string;
  characterId: string;
  userId: string;
  matchThreshold?: number;
  matchCount?: number;
}): Promise<DocumentSearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Call Supabase function for similarity search
    // Includes both character-specific docs AND global docs (rulebooks, lore)
    const { data, error } = await supabase.rpc('match_character_documents', {
      query_embedding: queryEmbedding,
      match_character_id: characterId,
      match_user_id: userId,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) throw error;

    return (data || []) as DocumentSearchResult[];
  } catch (error: any) {
    console.error('Error searching documents:', error);
    throw new Error(`Failed to search documents: ${error.message}`);
  }
}

/**
 * Chunk large text into smaller pieces for better embedding
 * Splits on paragraphs and ensures chunks don't exceed max tokens
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 100
): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Add overlap from the end of current chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
        currentChunk = overlapWords + ' ' + paragraph;
      } else {
        // Paragraph is too long, split by sentences
        const sentences = paragraph.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              // Sentence is still too long, force split
              chunks.push(sentence.substring(0, maxChunkSize));
              currentChunk = sentence.substring(maxChunkSize);
            }
          } else {
            currentChunk += sentence + '.';
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Store a large document by chunking it first
 * Returns all created chunk documents
 */
export async function storeDocumentWithChunking({
  supabase,
  characterId,
  userId,
  title,
  content,
  filename,
  fileType,
  isGlobal = false,
  metadata = {},
  chunkSize = 1000,
}: {
  supabase: SupabaseClient;
  characterId: string | null;  // NULL for global documents
  userId: string;
  title: string;
  content: string;
  filename?: string | null;
  fileType?: string | null;
  isGlobal?: boolean;
  metadata?: Record<string, any>;
  chunkSize?: number;
}): Promise<CharacterDocument[]> {
  try {
    const chunks = chunkText(content, chunkSize);

    const documents: CharacterDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkTitle = chunks.length > 1 ? `${title} (Part ${i + 1}/${chunks.length})` : title;

      const doc = await storeDocument({
        supabase,
        characterId,
        userId,
        title: chunkTitle,
        content: chunks[i],
        filename,
        fileType,
        isGlobal,
        metadata: {
          ...metadata,
          chunk_index: i,
          total_chunks: chunks.length,
          original_title: title,
        },
      });

      documents.push(doc);
    }

    return documents;
  } catch (error: any) {
    console.error('Error storing chunked document:', error);
    throw new Error(`Failed to store chunked document: ${error.message}`);
  }
}
