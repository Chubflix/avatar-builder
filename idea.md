# Chubflix: Hybrid Structured + RAG Character System

## 🎯 **Structured Data Pipeline (YAML → Relational DB)**

### **1. Schema-Driven Tables (0$ Embeddings)**
```sql
-- Core structured tables (from character.1.1.schema.json)
CREATE TABLE character_greetings (
id UUID PRIMARY KEY,
character_id UUID,           -- ricktapclara...
greeting_order INT,          -- 1=initial, 2-13=alternatives
title TEXT,                  -- "Alt Greeting 5"
content TEXT,                -- Full greeting text
metadata JSONB               -- {is_nsfw: false, pov: 'any'}
);

CREATE TABLE character_description_sections (
id UUID PRIMARY KEY,
character_id UUID,
section VARCHAR(50),         -- 'personality', 'appearance'
content TEXT
);
```

### **2. YAML Parser → Structured Storage**
```js
// lib/parseCharacterSheet.ts
export async function storeStructuredSheet(file) {
const yaml = parse(await file.text());  // character.sheet.yaml

// Extract 13 greetings → 13 DB rows
await supabase.from('character_greetings').insert([
{ character_id, ...yaml.character.initialgreeting, greeting_order: 1 },
...yaml.character.alternativegreetings.map((g, i) => ({
character_id, ...g, greeting_order: i+2
}))
]);

// Extract sections → DB rows
await supabase.from('character_description_sections').insert([
{ character_id, section: 'personality', content: yaml.character.description.personality },
{ character_id, section: 'appearance', content: yaml.character.description.appearance }
]);
}
```

## 🔧 **Hybrid Retrieval: Structured + RAG**

### **Structured Tools (Characters: 90% queries, $0)**
```js
tools: [
get_greetings(characterId),           // SELECT * FROM greetings
get_personality(characterId),         // SELECT content WHERE section='personality'
get_appearance(characterId)
]
```

### **RAG Tools (Rules/Lore: 10% queries, $0.001)**
```js
tools: [
search_world_rules(query)             // Embed rules.md, world-lore.txt only
]
```

## 🛠️ **Core Tools (CRUD + External APIs)**

```js
const chubflixTools = [
// READ
tool(get_greetings(characterId)),
tool(get_personality(characterId)),

// CREATE
tool(add_greeting(characterId, title, content)),
tool(generate_avatar(characterId, description)),  // Avatar-builder API

// UPDATE  
tool(update_greeting(greetingId, newContent)),

// DELETE
tool(delete_greeting(greetingId))
];
```

## 🚀 **Typical Workflows**

### **1. Add New Greetings (Proposal Flow)**
```markdown
USER: "Add 3 nursing school greetings for Clara"

AGENT:
1. *get_greetings(claraId)* → "Current: 13 greetings"
2. AI generates 3 proposals internally
3. "Proposal 1: [text] Save? (Y/N)"

USER: "Love #1 & #3, save them!"

AGENT: *add_greeting(claraId, "Nursing Study 1", text1)*
*add_greeting(claraId, "Nursing Study 3", text3)*
```

### **2. Edit Greeting (Collaborative)**
```markdown
USER: "Alt 5 needs more drama about job loss"

AGENT:
1. *get_greetings(claraId, 5)* → Shows original
2. AI rewrites: "New dramatic version: [panic text]"
3. "Save this? (Y/N)"

USER: "Perfect, save it!"

AGENT: *update_greeting(greetingId5, newText)* → "✅ Alt #5 updated!"
```

### **3. Edit Appearance**
```markdown
USER: "Make Clara's hair blonde for new arc"

AGENT:
1. *get_appearance(claraId)* → Shows current
2. AI proposes: "Updated: long blonde hair in ponytail..."
3. *update_description(claraId, 'appearance', newText)*
```

### **4. Add New Character**
```markdown
USER: "Create Elf Warrior with 5 greetings"

AGENT:
1. Creates character row
2. Generates: personality, appearance, 5 greetings
3. *add_greeting(elfId, title1, content1)* ×5
4. *generate_avatar(elfId, "Elf warrior forest")*
5. "Elf Warrior created with 5 greetings + avatar!"
```

## 💰 **Cost Optimization**
```markdown
Character data (90%): SQL queries = $0
Rules/lore (10%): RAG = $0.001/query
Avatar API: $0.10/image (external)

Total vs pure RAG: 97% cheaper
```

## 📊 **Upload Classification**
```markdown
character.sheet.yaml → Structured DB (0$)
rules.md, world-lore.txt → RAG embeddings ($0.001)
other.txt → User choice
```

## 🎉 **Agent System Prompt**
```markdown
You are Chubflix Editor. Use tools for:
- get_greetings(characterId): Show current greetings
- add_greeting(characterId, title, content): Create new
- update_greeting(greetingId, content): Edit existing
- generate_avatar(characterId, description): New avatar

Workflow: Read → Propose (AI) → Confirm → Save
Always show before saving to DB.


**Upload YAML → AI builds structured DB → Tools enable perfect CRUD + hybrid RAG for rules.**
```

