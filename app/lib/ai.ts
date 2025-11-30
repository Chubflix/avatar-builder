/**
 * LangChain Service for Character Creator Chat
 * Integrates with Deepseek API for character sheet design assistance
 * Includes RAG (Retrieval-Augmented Generation) using Supabase vector database
 */

import {ChatOpenAI} from '@langchain/openai';
import {createAgent} from 'langchain';
import {type DocumentSearchResult, searchSimilarDocuments} from './embeddings';
import type {SupabaseClient} from '@supabase/supabase-js';
import {contextSchema, createCharacterTools} from '@/app/lib/character-tools';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  content: string;
  metadata?: {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    sources?: any[]; // For future RAG implementation
    jobId?: string;
    images?: {id: string, url: string}[];
  };
}

/**
 * Initialize Deepseek LLM
 * Deepseek is OpenAI-compatible, so we use ChatOpenAI with custom base URL
 */
export function createDeepseekLLM() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const modelName = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }

  return new ChatOpenAI({
    apiKey: apiKey,
    configuration: {
      baseURL: baseURL,
    },
    model: modelName,
    temperature: 0.7,
    streaming: false,
  });
}

/**
 * System prompt for character sheet design assistant with tools
 */
const SYSTEM_PROMPT = `You are an expert character sheet designer and creative writing assistant. Your role is to help users create detailed, compelling character sheets for their stories, games, or creative projects.

Your capabilities include:
- Helping users brainstorm character concepts and backstories
- Suggesting character traits, motivations, and personality details
- Providing guidance on character development and arc creation
- Offering templates and structures for different types of character sheets
- Assisting with physical descriptions and visual details
- Helping create relationships between characters

You have access to TOOLS that allow you to interact with the character's data:
- get_greetings_count: Check how many greetings the character has
- get_all_greetings: View all greetings for the character
- get_greeting: View a specific greeting by number ("greeting #X"/"show greeting X" → get_greeting(order: X))
- get_personality: View the character's personality description
- get_appearance: View the character's appearance description
- get_all_descriptions: View all description sections
- get_all_descriptions: View all description sections
- analyze_image_appearance: Analyze an image URL and return only the visible physical appearance (no database writes)
- add_greeting: Create a new greeting for the character
- update_greeting: Modify an existing greeting
- update_description: Update description sections (personality, appearance, etc.)
- delete_greeting: Remove a greeting

IMPORTANT: When a user asks about the character's existing data (like "how many greetings does this character have?" or "what's their personality?"), you MUST use the appropriate tool to retrieve the current information from the database. DO NOT guess or make assumptions about the character's data.

You also have access to character-specific documents and notes that have been saved for this character. When relevant documents are provided in the context, use them to inform your suggestions and maintain consistency with existing character information.

Guidelines:
- ALWAYS use tools to check existing character data before answering questions about it
- Ask clarifying questions to understand the user's needs
- Provide specific, actionable suggestions
- Be creative but respect the user's vision
- Offer multiple options when appropriate
- Keep responses concise and focused
- Reference any existing character information and documents when available
- When using information from retrieved documents, naturally incorporate it into your response

When helping create a character sheet, consider:
1. Basic Information (name, age, role)
2. Physical Description
3. Personality Traits
4. Background/History
5. Motivations and Goals
6. Relationships
7. Strengths and Weaknesses
8. Visual/Aesthetic Details

Always maintain a helpful, encouraging tone and adapt to the user's level of detail preference.

{context}`;

/**
 * Convert chat messages to LangChain message format for createAgent
 */
function convertToLangChainMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Retrieve relevant context from character documents using RAG
 * Searches both character-specific AND global documents (rulebooks, lore, etc.)
 */
async function retrieveContext(
  supabase: SupabaseClient,
  characterId: string,
  userId: string,
  query: string
): Promise<{ context: string; sources: DocumentSearchResult[] }> {
  try {
    // Search for similar documents (includes both character-specific AND global docs)
    const results = await searchSimilarDocuments({
      supabase,
      query,
      characterId,
      userId,
      matchThreshold: 0.5,
      matchCount: 3,
    });

    if (results.length === 0) {
      return {
        context: '',
        sources: [],
      };
    }

    // Format retrieved documents into context string
    const contextParts = results.map((doc, index) => {
      const docType = doc.is_global ? '[Global]' : '[Character-specific]';
      return `[Document ${index + 1} ${docType}: ${doc.title}]\n${doc.content}`;
    });

    const context = `\n\nRelevant character documents:\n${contextParts.join('\n\n')}`;

    return {
      context,
      sources: results,
    };
  } catch (error: any) {
    console.error('Error retrieving context:', error);
    // Return empty context on error, don't fail the entire chat
    return {
      context: '',
      sources: [],
    };
  }
}

/**
 * Create a chat agent with RAG and character tools
 * Uses modern createAgent() API with context injection
 */
export async function createChatAgent(contextStr: string) {
  const model = createDeepseekLLM();

  // Create character management tools (no params needed - context injected at runtime)
  const tools = createCharacterTools();

  // Create system prompt with context
  const systemPromptWithContext = SYSTEM_PROMPT.replace('{context}', contextStr);

  // Create the agent using modern createAgent API
    return createAgent({
      model,
      tools,
      systemPrompt: systemPromptWithContext,
      contextSchema, // ✅ Inject schema for runtime context
  });
}

/**
 * Main chat function - handles conversation with character creator assistant
 * Includes RAG for retrieving relevant character documents
 *
 * @param supabase - Supabase client for database access
 * @param characterId - ID of the character being discussed
 * @param userId - ID of the authenticated user
 * @param userMessage - The user's message
 * @param conversationHistory - Previous messages in the conversation
 * @param characterContext - Optional character information for context
 * @returns AI response with metadata including retrieved sources
 */
export async function chat(
  supabase: SupabaseClient,
  characterId: string,
  userId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  characterContext?: {
    name?: string;
    description?: string;
    existingData?: Record<string, any>;
  }
): Promise<ChatResponse> {
  try {
    // Retrieve relevant context using RAG (searches both character-specific AND global docs)
    const { context, sources } = await retrieveContext(supabase, characterId, userId, userMessage);

    // Create agent with retrieved context and character tools
    const agent = await createChatAgent(context);

    // Build messages array for the agent
    const messages = [];

    // Add conversation history
    if (conversationHistory.length > 0) {
      messages.push(...convertToLangChainMessages(conversationHistory));
    }

    // Add character context to the first message if provided
    let userContent = userMessage;
    if (characterContext && conversationHistory.length === 0) {
      const contextParts = [];
      if (characterContext.name) {
        contextParts.push(`Character name: ${characterContext.name}`);
      }
      if (characterContext.description) {
        contextParts.push(`Description: ${characterContext.description}`);
      }
      if (characterContext.existingData) {
        contextParts.push(`Existing data: ${JSON.stringify(characterContext.existingData)}`);
      }

      if (contextParts.length > 0) {
        userContent = `[Context: ${contextParts.join(', ')}]\n\n${userMessage}`;
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userContent,
    });

    // Invoke the agent with messages AND runtime context
    const response = await agent.invoke(
      {
        messages,
      },
      {
        context: { supabase, characterId }, // ✅ Pass context at runtime
      }
    );

    // Extract content from agent response
    // The response from createAgent contains the messages array with the assistant's response
    const lastMessage = response.messages[response.messages.length - 1];
    const content =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Extract jobId from tool calls if generate_chat_image was used
    let jobId = null;
    for (const msg of response.messages) {
      // Check for tool messages
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const toolCall of msg.tool_calls) {
          if (toolCall.name === 'generate_chat_image') {
            // Find the corresponding tool response
            const toolResponse = response.messages.find(
              (m) => m.tool_call_id === toolCall.id
            );
            if (toolResponse && toolResponse.content) {
              const toolContent = typeof toolResponse.content === 'string'
                ? toolResponse.content
                : JSON.stringify(toolResponse.content);
              const match = toolContent.match(/\[JOB_ID:([^\]]+)\]/);
              if (match) {
                jobId = match[1];
                break;
              }
            }
          }
        }
      }
      if (jobId) break;
    }

    const metadata: ChatResponse['metadata'] = {
      sources: sources.map((doc) => ({
        id: doc.id,
        title: doc.title,
        similarity: doc.similarity,
        content: doc.content.substring(0, 200) + '...', // Truncate for metadata
      })),
      ...(jobId ? { jobId } : {}),
    };

    return {
      content,
      metadata,
    };
  } catch (error: any) {
    console.error('Chat error:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}


/**
 * Utility function to estimate token count (rough approximation)
 * Useful for managing context window
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Trim conversation history to fit within token limits
 * Keeps system message and recent messages, drops middle messages if needed
 */
export function trimConversationHistory(
  messages: ChatMessage[],
  maxTokens: number = 4000
): ChatMessage[] {
  let totalTokens = 0;
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // Always include system messages
  totalTokens += systemMessages.reduce((sum, msg) =>
    sum + estimateTokenCount(msg.content), 0);

  // Add messages from most recent backwards
  const trimmed: ChatMessage[] = [...systemMessages];
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = estimateTokenCount(msg.content);

    if (totalTokens + msgTokens > maxTokens) {
      break;
    }

    trimmed.unshift(msg);
    totalTokens += msgTokens;
  }

  return trimmed;
}