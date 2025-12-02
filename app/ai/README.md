# LangChain Deep Agents System

This directory contains a production-ready multi-agent system built with **LangChain's Deep Agents framework**.

## Architecture

The system uses `createDeepAgent` with specialized subagents:

```
app/ai/
├── index.ts            # Main Deep Agent coordinator (entry point)
├── checkpointer.ts     # PostgresSaver setup
├── tools/
│   ├── avatar.ts       # Avatar generation & image analysis tools
│   ├── character.ts    # Character metadata & description tools
│   └── greetings.ts    # Greetings & story phases tools
└── README.md           # This file
```

## Features

### ✅ Deep Agents Architecture
- **Coordinator Agent**: Delegates to specialized subagents using `task()` tool
- **Avatar Agent**: Image generation and visual analysis (2 tools)
- **Character Agent**: Descriptions and metadata (5 tools)
- **Greetings Agent**: Greetings and story phases (14 tools)

### ✅ Built-in Capabilities
- **Planning**: Automatic todo list for complex tasks
- **Context Management**: Subagents isolate context for clean execution
- **State Persistence**: PostgreSQL checkpointer for conversations
- **Vercel Compatible**: Optimized for serverless deployment

### ✅ Tool Context Injection
- Supabase client passed via `ToolRuntime` (not visible to LLM)
- `characterId` passed via `configurable` (static context)
- All 21 tools access context without parameters

## Installation

### Required Packages

```bash
# Deep Agents framework (required)
npm install deepagents

# PostgreSQL persistence (recommended for production)
npm install @langchain/langgraph-checkpoint-postgres

# Or use yarn
yarn add deepagents @langchain/langgraph-checkpoint-postgres
```

### Environment Variables

Add to `.env`:

```env
# Required for production persistence
POSTGRES_URL=postgresql://user:password@host:5432/database

# Deepseek LLM (required)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Usage

### Basic Chat Example

```typescript
import { chat } from '@/app/ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

const response = await chat(
  supabase,
  characterId,      // Static context (passed via configurable)
  userId,
  "Add a greeting where the character meets the user at a cafe",
  conversationHistory,
  {
    name: "Alice",
    description: "A friendly nurse"
  }
);

console.log(response.content);
// → The coordinator delegates to greetings-agent
// → Greetings-agent creates the greeting
// → "I've added a new greeting titled 'Cafe Meeting'..."

// If image generation was triggered:
if (response.metadata?.jobId) {
  console.log(`Job ID: ${response.metadata.jobId}`);
}
```

### API Route Example (Vercel)

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/app/ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { characterId, message, history } = await request.json();

  // Get authenticated user
  const supabase = createClient(...);
  const { data: { user } } = await supabase.auth.getUser();

  const response = await chat(
    supabase,
    characterId,
    user.id,
    message,
    history
  );

  return NextResponse.json(response);
}
```

## How It Works

### 1. Delegation with task() Tool

The coordinator automatically delegates to subagents:

```
User: "Generate an avatar with dark hair and add a greeting"

Coordinator:
  ├─> task(name="avatar-agent", task="Generate avatar with dark hair")
  │   └─> Avatar Agent calls generate_avatar tool
  │
  └─> task(name="greetings-agent", task="Add a greeting")
      └─> Greetings Agent calls add_greeting tool
```

### 2. Tool Context Injection

Tools receive context via `ToolRuntime`:

```typescript
import { tool, type ToolRuntime } from '@langchain/core/tools';

const contextSchema = z.object({
  supabase: z.any(),
  characterId: z.string(),
});

export const getPersonalityTool = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    // Extract injected context
    const { supabase, characterId } = runtime.context!;

    // Use Supabase without passing as param
    const personality = await getPersonality(supabase, characterId);
    return personality.content;
  },
  {
    name: 'get_personality',
    description: 'Get character personality',
    schema: z.object({}) // No supabase/characterId params!
  }
);
```

### 3. State Persistence

Conversations persist via thread IDs:

```typescript
// Thread ID: userId + characterId
const threadId = `${userId}-${characterId}`;

// State automatically saved to PostgreSQL
const response = await agent.invoke(
  { messages },
  {
    configurable: { thread_id: threadId, characterId },
    context: { supabase, characterId }
  }
);
```

### 4. Context Quarantine

Each subagent has isolated context:

```
Coordinator Context:
- System prompt
- Subagent descriptions
- No tools (only delegates)

↓ task("avatar-agent", "Generate image")

Avatar Agent Context (isolated):
- Avatar-specific system prompt
- Only avatar tools (2 tools)
- Clean context window
```

## Tools Reference

### Avatar Agent (2 tools)
- `generate_avatar(prompt, orientation?)` - Generate character avatar
- `analyze_image_appearance(image)` - Extract appearance from image

### Character Agent (5 tools)
- `get_personality()` - View personality description
- `get_appearance()` - View appearance description
- `get_all_descriptions()` - View all sections
- `update_description(section, content)` - Update description
- `update_character(name?, avatar_url?, metadata?)` - Update metadata

### Greetings Agent (14 tools)

**Greetings:**
- `get_greetings_count()` - Count greetings
- `get_all_greetings()` - List all greetings
- `get_greeting(order)` - View specific greeting
- `add_greeting(title, content, ...)` - Create greeting
- `update_greeting(greetingId, ..., confirmed?)` - Update (with preview)
- `delete_greeting(greetingId)` - Delete greeting

**Story Phases:**
- `get_story_phases_count()` - Count story phases
- `get_all_story_phases()` - List phases
- `get_story_phase(order)` - View specific phase
- `add_story_phase(name, description?)` - Create phase
- `update_story_phase(phaseId, ..., confirmed?)` - Update phase
- `reorder_story_phase(phaseId, newOrder)` - Reorder phase
- `delete_story_phase(phaseId)` - Delete phase
- `delete_story_phases(phaseIds[])` - Delete multiple phases

**Assignment:**
- `assign_story_phase_to_greetings(greetingIds[], phaseId)` - Link greetings

## Migration from Old AI System

### Key Changes

| Old (app/lib/ai.ts) | New (app/ai/index.ts) |
|---------------------|----------------------|
| Manual LangGraph | `createDeepAgent()` |
| Single monolithic agent | 3 specialized subagents |
| RAG with embeddings | Direct database queries |
| Manual tool routing | Automatic delegation via `task()` |
| No planning | Built-in todo list |

### Breaking Changes

**None!** The public API (`chat()` function) signature remains identical.

### What Was Removed

- **RAG implementation** (`retrieveContext`, `searchSimilarDocuments`)
- **Vector embeddings** (no more similarity search)
- **Document context** (no longer prepended to prompts)
- **Manual tool routing** (coordinator delegates automatically)

### What Was Added

- **Deep Agents framework** (`createDeepAgent`)
- **Automatic planning** (todo list middleware)
- **Context quarantine** (subagents have isolated context)
- **State persistence** (PostgreSQL checkpointer)
- **Specialized subagents** (avatar, character, greetings)

## Deployment

### Vercel Deployment

1. **Install packages:**
   ```bash
   npm install deepagents @langchain/langgraph-checkpoint-postgres
   ```

2. **Set environment variables** in Vercel dashboard:
   - `POSTGRES_URL` (required for persistence)
   - `DEEPSEEK_API_KEY` (required)

3. **Deploy:**
   ```bash
   vercel deploy
   ```

### Database Setup

The checkpointer automatically creates required tables on first run:

```sql
-- Created automatically by checkpointer.setup()
CREATE TABLE checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_id TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_id)
);
```

## Debugging

### Enable Logging

```typescript
// In createMultiAgentGraph()
console.log('🤖 Creating Deep Agent with subagents:', {
  characterId: context.characterId
});
```

### Test Without PostgreSQL

The system automatically falls back to MemorySaver:

```bash
# Remove POSTGRES_URL to test locally
unset POSTGRES_URL
npm run dev
```

You'll see:
```
⚠ POSTGRES_URL not set, falling back to MemorySaver
```

### Verify Subagent Delegation

Check the coordinator's messages for `task` tool calls:

```typescript
console.log('Messages:', response.messages.map(m => ({
  role: m.role,
  tool_calls: m.tool_calls?.map(tc => tc.name)
})));

// Expected output:
// [
//   { role: 'user', tool_calls: undefined },
//   { role: 'assistant', tool_calls: ['task'] },  // ← Delegation!
//   { role: 'tool', tool_calls: undefined },
//   { role: 'assistant', tool_calls: undefined }
// ]
```

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| First chat (cold start) | ~3-4s | Initializes Deep Agent + checkpointer |
| Subsequent chats | ~800ms-1.5s | Includes subagent delegation |
| Tool execution | ~100-500ms | Depends on Supabase query |
| Image generation | ~30-60s | Async (returns jobId) |

### Optimization Tips

1. **Reuse agent instance**: Cache the Deep Agent across requests
2. **Limit history**: Use `trimConversationHistory()` utility
3. **Use thread IDs**: Enables faster state retrieval
4. **Monitor delegation**: Ensure coordinator delegates appropriately

## Troubleshooting

### "Cannot find module 'deepagents'"

Install the package:
```bash
npm install deepagents
```

### "Cannot find module '@langchain/langgraph-checkpoint-postgres'"

Install the PostgreSQL checkpointer:
```bash
npm install @langchain/langgraph-checkpoint-postgres
```

### "Property 'context' does not exist on type '{}'"

Your `ToolRuntime` type is incorrect. Use:
```typescript
runtime: ToolRuntime<any, typeof contextSchema>
// NOT: runtime: ToolRuntime<ContextType>
```

### Coordinator not delegating to subagents

Check your coordinator prompt. Add explicit delegation instructions:
```typescript
const COORDINATOR_PROMPT = `...
IMPORTANT: For all tasks, delegate to your subagents using the task() tool.
...`;
```

### Tools returning "Tool context not provided"

Ensure you're passing context in the invoke call:
```typescript
await agent.invoke(
  { messages },
  {
    configurable: { thread_id, characterId },
    context: { supabase, characterId }  // ← Required!
  }
);
```

## Contributing

When adding new tools:

1. Add to appropriate file (`tools/avatar.ts`, `tools/character.ts`, or `tools/greetings.ts`)
2. Export from the tools array at the bottom
3. Use `ToolRuntime<any, typeof contextSchema>` pattern
4. Add to subagent's tools array in `index.ts`
5. Update README tools reference

Example:
```typescript
// tools/character.ts
export const myNewTool = tool(
  async ({ param }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { supabase, characterId } = runtime.context!;
    // Implementation...
  },
  {
    name: 'my_new_tool',
    description: 'What this tool does',
    schema: z.object({
      param: z.string().describe('Parameter description')
    })
  }
);

// Add to export
export const characterTools = [
  // ... existing tools
  myNewTool
];
```

## Learn More

- [Deep Agents Documentation](https://docs.langchain.com/oss/javascript/deepagents/overview)
- [LangGraph Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangChain Tools](https://docs.langchain.com/oss/javascript/langchain/tools)

## License

Same as parent project.
