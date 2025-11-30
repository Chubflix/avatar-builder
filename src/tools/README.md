# Chubflix Character Management Tools

This directory contains tools for managing characters using a **hybrid structured database + RAG** approach.

## Architecture

### Cost Optimization
- **90% of queries**: Structured SQL queries (**$0 cost**)
- **10% of queries**: RAG embeddings (**$0.001/query**)
- **Avatar generation**: External API (**~$0.10/image**)

**Total: 97% cheaper than pure RAG approach**

### Database Schema

```sql
-- Core character data
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Character greetings (13+ greetings per character)
CREATE TABLE character_greetings (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  greeting_order INTEGER NOT NULL,  -- 1=initial, 2-13=alternatives
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Character description sections (personality, appearance, etc.)
CREATE TABLE character_description_sections (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,     -- 'personality', 'appearance', 'backstory'
  content TEXT NOT NULL,
  UNIQUE(character_id, section)
);

-- World rules and lore (RAG-enabled with pgvector)
CREATE TABLE character_documents (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),           -- OpenAI embeddings
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## Tool Categories

### 1. Character Management (CRUD)

**manage_character.ts**

```typescript
import {
  createCharacter,
  getCharacter,
  getAllCharacters,
  updateCharacter,
  deleteCharacter,
  searchCharacters,
  getCompleteCharacterData
} from './tools';

// Create a new character
const character = await createCharacter("Clara Martinez", {
  age: 25,
  occupation: "nursing student"
});

// Get character by ID
const clara = await getCharacter(characterId);

// Get character by slug
const clara = await getCharacterBySlug("clara-martinez");

// Search characters
const results = await searchCharacters("Clara");

// Get complete data (character + greetings + descriptions)
const completeData = await getCompleteCharacterData(characterId);
// Returns: { character, greetings, descriptions }

// Update character
await updateCharacter(characterId, {
  name: "Clara Martinez-Smith",
  avatar_url: "/avatars/clara-new.png"
});

// Delete character (cascades to greetings, descriptions, documents)
await deleteCharacter(characterId);
```

### 2. Greetings Management

**get_greetings.ts, add_greeting.ts, update_greeting.ts, delete_greeting.ts**

```typescript
import { createAuthClient } from '@/app/lib/supabase-server';
import {
  getGreetings,
  getGreetingsCount,
  addGreeting,
  addGreetings,
  updateGreeting,
  reorderGreeting,
  deleteGreeting
} from './tools';

// Create authenticated Supabase client
const supabase = createAuthClient();

// Get all greetings for a character
const greetings = await getGreetings(characterId);
// Returns: [{ id, character_id, greeting_order, title, content, metadata }, ...]

// Get specific greeting by order
const initialGreeting = await getGreetings(characterId, 1);

// Get count
const count = await getGreetingsCount(characterId);

// Add single greeting
const greeting = await addGreeting(
  supabase,
  characterId,
  "Alt Greeting 5",
  "Hey! Want to study together?",
  { is_nsfw: false, pov: 'any' }
);

// Add multiple greetings at once
const greetings = await addGreetings(supabase, characterId, [
  { title: "Nursing Study 1", content: "...", metadata: {} },
  { title: "Nursing Study 2", content: "...", metadata: {} },
  { title: "Nursing Study 3", content: "...", metadata: {} }
]);

// Update greeting content
await updateGreeting(greetingId, {
  content: "Updated dramatic version with panic text..."
});

// Reorder greeting
await reorderGreeting(greetingId, 5);  // Move to position 5

// Delete greeting
await deleteGreeting(greetingId);
```

### 3. Description Sections Management

**get_personality.ts, get_appearance.ts, update_description.ts**

```typescript
import { createAuthClient } from '@/app/lib/supabase-server';
import {
  getPersonality,
  getAppearance,
  updateDescription,
  updateDescriptions,
  getAllDescriptions
} from './tools';

// Create authenticated Supabase client
const supabase = createAuthClient();

// Get specific sections
const personality = await getPersonality(characterId);
const appearance = await getAppearance(characterId);

// Get all sections
const allSections = await getAllDescriptions(supabase, characterId);
// Returns: [{ id, character_id, section, content }, ...]

// Update single section (upserts if doesn't exist)
await updateDescription(
  supabase,
  characterId,
  'appearance',
  'Long blonde hair in a ponytail, blue eyes, 5\'6"...'
);

// Update multiple sections at once
await updateDescriptions(supabase, characterId, [
  { section: 'personality', content: '...' },
  { section: 'appearance', content: '...' },
  { section: 'backstory', content: '...' }
]);
```

### 4. Avatar Generation

**generate_avatar.ts**

```typescript
import { generateAvatar, generateAvatarVariations } from './tools';

// Generate single avatar
const avatar = await generateAvatar(
  characterId,
  "Clara Martinez, nursing student, blonde ponytail, blue eyes",
  {
    orientation: 'portrait',
    batchSize: 1,
    enhanceFace: true,
    negativePrompt: 'ugly, distorted'
  }
);
// Returns: { id, filename, url, folderId, metadata }

// Generate multiple variations
const avatars = await generateAvatarVariations(
  characterId,
  "Elf warrior in forest armor",
  4  // Generate 4 variations
);

// Update character with new avatar
await updateCharacter(characterId, { avatar_url: avatar.url });
```

### 5. Character Sheet YAML Parser

**parse_character_sheet.ts**

Parses structured YAML character sheets into the database.

```typescript
import { createAuthClient } from '@/app/lib/supabase-server';
import {
  parseCharacterSheetFile,
  parseAndStoreCharacterSheet,
  exportCharacterToYAML
} from './tools';

// Create authenticated Supabase client
const supabase = createAuthClient();
const userId = (await supabase.auth.getUser()).data.user?.id;

// Parse from file upload
const result = await parseCharacterSheetFile(supabase, file, userId);
// Returns: { characterId, name, slug, greetingsCount, descriptionsCount }

// Parse from YAML string
const yamlContent = `
character:
  name: Clara Martinez
  description:
    personality: Caring, studious, anxious about exams...
    appearance: Long brown hair, hazel eyes, 5'6"...
    backstory: Third-year nursing student...
  initialgreeting:
    title: Initial Greeting
    content: "Hey! You're in my nursing program, right?"
    metadata:
      is_nsfw: false
      pov: any
  alternativegreetings:
    - title: Study Session
      content: "Want to quiz each other for the exam?"
    - title: Campus Encounter
      content: "Oh hey! I didn't expect to see you here!"
`;

const result = await parseAndStoreCharacterSheet(supabase, yamlContent, userId);

// Export character to YAML
const yaml = await exportCharacterToYAML(supabase, characterId, userId);
// Returns YAML string
```

**YAML Schema:**

```yaml
character:
  name: string
  description:
    personality: string
    appearance: string
    backstory: string      # optional, can add custom sections
  initialgreeting:
    title: string
    content: string
    metadata:              # optional
      is_nsfw: boolean
      pov: string
  alternativegreetings:    # optional array
    - title: string
      content: string
      metadata: object
  metadata:                # optional character-level metadata
    age: number
    occupation: string
```

### 6. RAG World Rules Search

**search_world_rules.ts**

Semantic search for world rules and lore using embeddings.

```typescript
import {
  searchWorldRules,
  searchWorldRulesByKeyword,
  getCharacterWorldRules,
  addWorldRule,
  deleteWorldRule
} from './tools';

// Semantic search (uses embeddings)
const rules = await searchWorldRules(
  "What are the magic combat rules?",
  5,    // limit
  0.7   // similarity threshold
);
// Returns: [{ id, document_id, content, metadata, similarity }, ...]

// Keyword search (full-text search, no embeddings)
const rules = await searchWorldRulesByKeyword("magic", 10);

// Get all rules for a character
const characterRules = await getCharacterWorldRules(characterId);

// Add world rule (generates embeddings automatically)
await addWorldRule(
  characterId,  // or null for global rules
  "Magic in this world requires verbal incantations...",
  { type: 'rule', tags: ['magic', 'combat'] }
);

// Delete world rule
await deleteWorldRule(documentId);
```

## Workflows

### Workflow 1: Add New Greetings (Proposal Flow)

```typescript
USER: "Add 3 nursing school greetings for Clara"

// 1. Get current greetings
const current = await getGreetings(claraId);
console.log(`Current: ${current.length} greetings`);

// 2. AI generates 3 proposals
const proposals = [
  { title: "Study Session", content: "..." },
  { title: "Lab Practice", content: "..." },
  { title: "Exam Stress", content: "..." }
];

// 3. Show proposals to user
console.log("Proposal 1:", proposals[0]);
console.log("Proposal 2:", proposals[1]);
console.log("Proposal 3:", proposals[2]);

USER: "Love #1 & #3, save them!"

// 4. Save selected greetings
await addGreetings(claraId, [proposals[0], proposals[2]]);
console.log("✅ Added 2 new greetings!");
```

### Workflow 2: Edit Greeting (Collaborative)

```typescript
USER: "Alt 5 needs more drama about job loss"

// 1. Get the greeting
const [greeting] = await getGreetings(claraId, 5);
console.log("Original:", greeting.content);

// 2. AI rewrites
const newContent = "AI-generated dramatic version with panic text...";
console.log("New version:", newContent);
console.log("Save this? (Y/N)");

USER: "Perfect, save it!"

// 3. Update
await updateGreeting(greeting.id, { content: newContent });
console.log("✅ Alt #5 updated!");
```

### Workflow 3: Edit Appearance

```typescript
USER: "Make Clara's hair blonde for new arc"

// 1. Get current appearance
const appearance = await getAppearance(claraId);
console.log("Current:", appearance.content);

// 2. AI proposes update
const newAppearance = "Long blonde hair in ponytail, blue eyes, 5'6\"...";
console.log("Proposed:", newAppearance);

// 3. Update
await updateDescription(claraId, 'appearance', newAppearance);
console.log("✅ Appearance updated!");
```

### Workflow 4: Add New Character

```typescript
USER: "Create Elf Warrior with 5 greetings"

// 1. Create character
const character = await createCharacter("Elf Warrior", {
  race: "elf",
  class: "warrior"
});

// 2. Generate descriptions & greetings with AI
await updateDescriptions(character.id, [
  { section: 'personality', content: "Brave, honorable, protective..." },
  { section: 'appearance', content: "Tall elf with silver hair..." },
  { section: 'backstory', content: "Guardian of the ancient forest..." }
]);

// 3. Add greetings
await addGreetings(character.id, [
  { title: "Initial Greeting", content: "Halt! State your business..." },
  { title: "Battle Ready", content: "Enemies approach! Stand with me!" },
  { title: "Forest Patrol", content: "These woods are under my watch..." },
  { title: "Campfire Rest", content: "Join me by the fire, traveler..." },
  { title: "Victory Celebration", content: "We fought well today!" }
]);

// 4. Generate avatar
const avatar = await generateAvatar(
  character.id,
  "Elf warrior in forest, silver hair, armor"
);
await updateCharacter(character.id, { avatar_url: avatar.url });

console.log("✅ Elf Warrior created with 5 greetings + avatar!");
```

### Workflow 5: Upload Character Sheet

```typescript
USER: Uploads "clara.sheet.yaml"

// Parse and store automatically
const result = await parseCharacterSheetFile(file);
console.log(`✅ Created "${result.name}" with:`);
console.log(`- ${result.greetingsCount} greetings`);
console.log(`- ${result.descriptionsCount} description sections`);
console.log(`Character ID: ${result.characterId}`);

// Optionally generate avatar
const avatar = await generateAvatar(
  result.characterId,
  "Clara Martinez, nursing student"
);
```

## Environment Setup

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application URL (for API calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI (for embeddings)
OPENAI_API_KEY=your-openai-api-key
```

### Database Setup

1. Run migrations:
```bash
supabase db reset
```

2. Enable pgvector extension (for RAG):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Create RPC function for similarity search:
```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    character_id as document_id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  FROM character_documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## Installation

```bash
# Install dependencies
npm install @supabase/supabase-js yaml

# For embeddings API
npm install openai
```

## Usage in AI Agent

```typescript
import * as tools from './src/tools';

// Agent prompt
const systemPrompt = `
You are Chubflix Editor. Use tools for:
- get_greetings(characterId): Show current greetings
- add_greeting(characterId, title, content): Create new
- update_greeting(greetingId, content): Edit existing
- generate_avatar(characterId, description): New avatar

Workflow: Read → Propose (AI) → Confirm → Save
Always show before saving to DB.
`;

// Example agent interaction
async function handleUserRequest(characterId: string, request: string) {
  if (request.includes("add greetings")) {
    // 1. Read current state
    const greetings = await tools.getGreetings(characterId);

    // 2. AI generates proposals
    const proposals = generateProposals(request); // Your AI logic

    // 3. Show to user
    showProposalsToUser(proposals);

    // 4. Wait for confirmation
    const approved = await getUserConfirmation();

    // 5. Save to DB
    if (approved) {
      await tools.addGreetings(characterId, proposals);
    }
  }
}
```

## Cost Analysis

```
Character data queries (90%):        $0.00 (SQL)
Rules/lore queries (10%):            $0.001/query (embeddings)
Avatar generation:                   ~$0.10/image (Stable Diffusion)

Example monthly costs for 1000 users:
- 10,000 character queries:          $0
- 1,000 RAG queries:                 $1
- 100 avatar generations:            $10
---------------------------------
Total:                               $11/month

vs Pure RAG approach:
- 11,000 RAG queries:                $11,000/month
---------------------------------
Savings: 99.9%
```

## License

Part of the Avatar Builder / Chubflix project.
