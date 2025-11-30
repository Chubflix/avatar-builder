/**
 * Embeddings API
 * Generates embeddings for text using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/app/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text parameter is required and must be a string' },
        { status: 400 }
      );
    }

    const embedding = await generateEmbedding(text);

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate embedding',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
