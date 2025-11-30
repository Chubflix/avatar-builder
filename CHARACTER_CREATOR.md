# Character Creator with RAG

The Character Creator is an AI-powered assistant for designing detailed character sheets. It features a two-column interface with character management on the left, a collapsible document manager, and a ChatGPT-like chat interface powered by **RAG (Retrieval-Augmented Generation)**.

## Features

- **Character Management**: Create and manage multiple characters
- **AI Chat Assistant**: Deepseek-powered conversational AI to help design character sheets
- **RAG with Vector Search**: Store character-specific markdown documents and retrieve them contextually during chat
- **Document Manager**: Upload, edit, and manage character documents (notes, backstories, templates)
- **Semantic Search**: Uses OpenAI embeddings and Supabase pgvector for similarity search
- **Source Attribution**: Chat responses show which documents were referenced
- **Persistent Chat History**: Conversations are saved per character in Supabase
- **Real-time Updates**: Uses Ably for real-time event broadcasting

## Architecture

### Two-Column Layout with Document Manager

- **Left Sidebar (280px)**: Character list with create/select functionality
- **Right Main Area**:
  - **Document Manager (collapsible)**: Manage character-specific documents for RAG
  - **Chat Interface**: ChatGPT-like interface with AI assistance

### Technology Stack

- **Frontend**: React components with custom CSS
- **Backend**: Next.js API Routes
- **LLM**: Deepseek via LangChain (OpenAI-compatible API)
- **Embeddings**: OpenAI text-embedding-ada-002
- **Vector Database**: Supabase pgvector extension
- **Database**: Supabase (PostgreSQL)
- **Chat Storage**: Supabase `chat_messages` table
- **Document Storage**: Supabase `character_documents` table with vector embeddings
- **Real-time**: Ably

## Setup

### 1. Database Migrations

The character creator requires two Supabase database migrations:

Run all migrations:

```bash
npm run migrate:cli
```

**Migrations:**
1. `20251130003100_add_chat_messages_table.sql` - Creates chat_messages table
2. `20251130005850_add_character_documents_with_vectors.sql` - Creates character_documents table with pgvector support

### 2. Environment Variables

Add the following to your `.env.local` file:

```env
# Deepseek LLM Configuration (for Chat)
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# OpenAI API Key (for Embeddings - RAG)
OPENAI_API_KEY=your-openai-api-key-here
```

**Getting API Keys:**

**Deepseek (for chat responses):**
1. Sign up at [https://platform.deepseek.com](https://platform.deepseek.com)
2. Generate an API key from your dashboard
3. Add it to your `.env.local` file

**OpenAI (for embeddings/RAG):**
1. Sign up at [https://platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add it to your `.env.local` file
4. Note: This is only used for generating embeddings (text-embedding-ada-002), not for chat

### 3. Dependencies

The following packages are required (already installed):

```json
{
  "langchain": "latest",
  "@langchain/openai": "latest",
  "@langchain/core": "latest",
  "@langchain/community": "latest"
}
```

## File Structure

```
app/
├── character-creator/
│   ├── page.js                      # Main page component
│   └── character-creator.css        # Page layout styles
├── components/
│   ├── CharacterList.js             # Character sidebar component
│   ├── CharacterList.css
│   ├── DocumentManager.js           # Document management component
│   ├── DocumentManager.css
│   ├── ChatInterface.js             # Chat UI component (with source display)
│   └── ChatInterface.css
├── api/
│   ├── chat/route.ts                # Chat API endpoint (with RAG)
│   ├── documents/
│   │   ├── route.ts                 # Document CRUD endpoints
│   │   └── [id]/route.ts            # Individual document operations
│   └── characters/route.js          # Character CRUD endpoints (existing)
└── lib/
    ├── langchain.ts                 # LangChain service with RAG
    └── embeddings.ts                # Embeddings and vector search service

supabase/
└── migrations/
    ├── 20251130003100_add_chat_messages_table.sql
    └── 20251130005850_add_character_documents_with_vectors.sql
```

## RAG Implementation

### How RAG Works

1. **Document Upload**: User uploads character documents (notes, backstories, templates) via the Document Manager
2. **Embedding Generation**: Document content is converted to vector embeddings using OpenAI's text-embedding-ada-002
3. **Vector Storage**: Embeddings are stored in Supabase pgvector with the document
4. **Semantic Search**: When user sends a chat message, the query is embedded and similar documents are retrieved
5. **Context Injection**: Retrieved documents are injected into the LLM prompt as context
6. **Source Attribution**: Chat responses include references to the documents that were used

### Vector Database Schema

```sql
CREATE TABLE character_documents (
    id uuid PRIMARY KEY,
    character_id uuid REFERENCES characters(id),
    user_id uuid REFERENCES auth.users(id),
    title text NOT NULL,
    content text NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 dimension
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- HNSW index for fast vector similarity search
CREATE INDEX character_documents_embedding_idx
    ON character_documents USING hnsw (embedding vector_cosine_ops);
```

### Similarity Search Function

Supabase provides a custom `match_character_documents` function for vector similarity search:

```sql
SELECT * FROM match_character_documents(
    query_embedding,      -- Embedded query vector
    character_id,         -- Limit to specific character
    match_threshold,      -- Minimum similarity (0.0-1.0)
    match_count           -- Max results to return
);
```

## Components

### CharacterList

Displays and manages characters in the left sidebar.

**Props:**
- `selectedCharacterId` - Currently selected character ID
- `onSelectCharacter(id)` - Callback when character is selected
- `onCreateCharacter(character)` - Callback when character is created

**Features:**
- Fetch characters from `/api/characters`
- Create new characters
- Display character names and descriptions
- Highlight selected character

### DocumentManager

Collapsible document management interface for uploading and managing character-specific documents.

**Props:**
- `characterId` - ID of the character
- `characterName` - Name of the character (for display)

**Features:**
- View all documents for a character
- Add new documents (markdown supported)
- Edit existing documents (regenerates embeddings)
- Delete documents
- Automatic chunking for large documents (>1000 chars)
- Expandable/collapsible interface

### ChatInterface

ChatGPT-like interface for character sheet assistance with RAG support.

**Props:**
- `characterId` - ID of the character to chat about
- `characterName` - Name of the character (for display)

**Features:**
- Load conversation history from `/api/chat?character_id={id}`
- Send messages to `/api/chat` (with RAG retrieval)
- Clear chat history with DELETE `/api/chat?character_id={id}`
- Auto-scroll to latest message
- Typing indicator while waiting for response
- Display token usage metadata
- **Display referenced documents** with similarity scores

## API Endpoints

### POST /api/chat

Send a message to the character creator assistant.

**Request:**
```json
{
  "character_id": "uuid",
  "message": "Help me create a character sheet",
  "include_history": true
}
```

**Response:**
```json
{
  "message": "I'd be happy to help you create a character sheet...",
  "metadata": {
    "model": "deepseek-chat",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 200,
      "total_tokens": 350
    },
    "sources": [
      {
        "id": "doc-uuid",
        "title": "Character Backstory",
        "similarity": 0.85,
        "content": "Excerpt from document..."
      }
    ]
  },
  "message_id": "uuid"
}
```

**Note**: The `sources` array contains documents that were retrieved via RAG and used as context for the response.

### GET /api/chat?character_id={id}

Get chat history for a character.

**Response:**
```json
[
  {
    "id": "uuid",
    "role": "user",
    "content": "Help me create a character",
    "metadata": {},
    "created_at": "2025-11-30T00:00:00Z"
  },
  {
    "id": "uuid",
    "role": "assistant",
    "content": "I'd be happy to help...",
    "metadata": { "model": "deepseek-chat", "usage": {...} },
    "created_at": "2025-11-30T00:00:01Z"
  }
]
```

### DELETE /api/chat?character_id={id}

Clear chat history for a character.

**Response:**
```json
{
  "success": true
}
```

### GET /api/documents?character_id={id}

Get all documents for a character.

**Response:**
```json
[
  {
    "id": "uuid",
    "character_id": "uuid",
    "title": "Character Backstory",
    "content": "Long markdown content...",
    "metadata": {},
    "created_at": "2025-11-30T00:00:00Z",
    "updated_at": "2025-11-30T00:00:00Z"
  }
]
```

**Note**: Embeddings are not returned in the response to reduce payload size.

### POST /api/documents

Create a new document with automatic embedding generation.

**Request:**
```json
{
  "character_id": "uuid",
  "title": "Character Backstory",
  "content": "Detailed backstory in markdown...",
  "metadata": {},
  "use_chunking": false
}
```

**Parameters:**
- `use_chunking` (optional): If true or content > 1000 chars, splits document into chunks

**Response:**
```json
{
  "id": "uuid",
  "character_id": "uuid",
  "title": "Character Backstory",
  "content": "...",
  "created_at": "2025-11-30T00:00:00Z"
}
```

Or if chunked, returns an array of document chunks.

### PUT /api/documents/:id

Update a document (regenerates embeddings if content changes).

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "uuid",
  "character_id": "uuid",
  "title": "Updated Title",
  "content": "Updated content...",
  "updated_at": "2025-11-30T00:00:01Z"
}
```

### DELETE /api/documents/:id

Delete a document.

**Response:**
```json
{
  "success": true
}
```

## LangChain Service

The `app/lib/langchain.ts` file provides the core chat functionality:

### Main Functions

#### `chat(supabase, characterId, userMessage, conversationHistory, characterContext)`

Main chat function that processes user messages and returns AI responses with RAG.

**Parameters:**
- `supabase` - Supabase client for database access
- `characterId` - ID of the character being discussed
- `userMessage` - The user's message
- `conversationHistory` - Array of previous messages
- `characterContext` - Optional character information (name, description, existingData)

**Returns:**
```typescript
{
  content: string,
  metadata: {
    model: string,
    usage: { prompt_tokens, completion_tokens, total_tokens },
    sources: DocumentSearchResult[] // Retrieved documents used in response
  }
}
```

#### `trimConversationHistory(messages, maxTokens)`

Trims conversation history to fit within token limits.

**Parameters:**
- `messages` - Array of chat messages
- `maxTokens` - Maximum tokens allowed (default: 4000)

**Returns:** Trimmed array of messages

### System Prompt

The assistant is configured with a system prompt that defines its role as a character sheet designer. It helps with:
- Character backstories and motivations
- Personality traits and quirks
- Physical descriptions
- Character relationships
- Character sheet templates

## Embeddings Service

The `app/lib/embeddings.ts` file handles all vector operations:

### Main Functions

#### `generateEmbedding(text: string): Promise<number[]>`

Generates a 1536-dimension embedding vector for a single text using OpenAI's text-embedding-ada-002.

#### `storeDocument({ supabase, characterId, userId, title, content, metadata })`

Stores a document with its embedding in the database.

**Process:**
1. Generate embedding for content
2. Insert document with embedding into `character_documents` table
3. Return stored document

#### `searchSimilarDocuments({ supabase, query, characterId, matchThreshold, matchCount })`

Performs semantic search for similar documents.

**Process:**
1. Generate embedding for query text
2. Call `match_character_documents` PostgreSQL function
3. Return top-k similar documents with similarity scores

**Parameters:**
- `matchThreshold` - Minimum similarity score (0.0-1.0, default: 0.5)
- `matchCount` - Maximum results to return (default: 5)

#### `chunkText(text: string, maxChunkSize, overlap)`

Splits large documents into smaller chunks for better embedding quality.

**Features:**
- Splits on paragraph boundaries
- Maintains overlap between chunks for context continuity
- Handles edge cases (very long sentences, etc.)

### RAG Workflow

1. **User sends chat message**
2. **Query embedding** is generated from user's message
3. **Vector search** finds top 3 similar documents (similarity > 0.5)
4. **Context injection** - Retrieved documents are added to system prompt
5. **LLM generates response** using retrieved context
6. **Sources returned** in metadata for attribution

## Database Schema

### chat_messages Table

```sql
CREATE TABLE chat_messages (
    id uuid PRIMARY KEY,
    character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

## Usage

### Basic Workflow

1. Navigate to `/character-creator`
2. Click the **+** button to create a new character
3. Enter character name and optional description
4. Select the character from the list
5. **(Optional)** Add documents for RAG:
   - Click "Character Documents" to expand
   - Click "Add Document"
   - Enter title and markdown content
   - Save (embedding generated automatically)
6. Start chatting with the AI assistant
7. The assistant uses your documents as context
8. Referenced documents shown below AI responses

### Using RAG Effectively

**Best Practices:**
- Add character backstories, personality traits, and world-building notes as separate documents
- Use descriptive titles for documents
- Keep documents focused (one topic per document)
- Update documents as your character evolves
- Check "Referenced documents" to see what context was used

**Document Examples:**
- "Character Backstory" - History and motivations
- "Personality Traits" - Behavior patterns and quirks
- "Relationships" - Connections with other characters
- "Visual Description" - Physical appearance details
- "Character Sheet Template" - Your preferred format

## Troubleshooting

### "Chat service not configured" Error

**Cause:** `DEEPSEEK_API_KEY` environment variable is not set

**Solution:**
1. Get an API key from [https://platform.deepseek.com](https://platform.deepseek.com)
2. Add it to `.env.local`:
   ```env
   DEEPSEEK_API_KEY=your-actual-api-key
   ```
3. Restart the development server

### Messages not loading

**Cause:** Database migration not applied

**Solution:**
```bash
npm run migrate:cli
```

### CORS errors when chatting

**Cause:** Deepseek API blocking requests

**Solution:** Check that `DEEPSEEK_BASE_URL` is correct and your API key is valid

### "Embeddings service not configured" Error

**Cause:** `OPENAI_API_KEY` environment variable is not set

**Solution:**
1. Get an API key from [https://platform.openai.com](https://platform.openai.com)
2. Add it to `.env.local`:
   ```env
   OPENAI_API_KEY=your-actual-openai-key
   ```
3. Restart the development server

### Documents not showing up in chat

**Cause:** Similarity threshold too high or no relevant documents

**Solution:**
- Check that documents exist for the character
- Ensure document content is relevant to your query
- The system uses 0.5 similarity threshold (50% match)
- Try more specific document titles and content

### pgvector extension error

**Cause:** pgvector extension not enabled in Supabase

**Solution:**
1. Run migrations: `npm run migrate:cli`
2. If still failing, manually enable in Supabase dashboard:
   - Go to Database → Extensions
   - Enable `vector` extension

## Future Enhancements

- [x] ~~Add RAG with character documents~~ (Implemented!)
- [ ] Add pre-loaded character sheet templates to RAG
- [ ] Add design best practices documentation to RAG
- [ ] Export character sheets to PDF/JSON
- [ ] Character sheet form builder
- [ ] Image generation integration
- [ ] Multi-modal character creation (text + images)
- [ ] Character sheet sharing
- [ ] Template marketplace
- [ ] Support for other embedding models (Cohere, local models)
- [ ] Advanced RAG features (reranking, hybrid search)

## Contributing

When adding new features to the Character Creator:

1. Maintain the RAG architecture
   - Use `app/lib/embeddings.ts` for vector operations
   - Follow the existing similarity search patterns
   - Keep documents character-specific for proper isolation
2. Store all character data in Supabase
   - Use proper RLS policies for security
   - Follow existing schema patterns
3. Use the existing component patterns
   - Follow Chubflix theme guidelines
   - Maintain responsive design
4. Update this documentation
5. Consider token limits when adding context to prompts

## License

Same as the main Avatar Builder project.
