# Tool Fixes

You currently don't pass the authenticated Supabase database connection to the tools.

Rewrite like this:

**current implementation**
```js
export async function getGreetingsCount(characterId: string): Promise<number> {
    const { count, error } = await supabase
    .from('character_greetings')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId);
    
    if (error) {
    throw new Error(`Failed to count greetings: ${error.message}`);
    }
    
    return count || 0;
}
```

```js
export function createCharacterTools(supabase: SupabaseClient, characterId: string) {
    // Get greetings count
    const getGreetingsCountTool = tool(
        async () => {
            const count = await getGreetingsCount(characterId);
            return `The character currently has ${count} greeting${count === 1 ? '' : 's'}.`;
        },
        {
            name: 'get_greetings_count',
            description: 'Get the total number of greetings for the current character. Use this to answer questions like "how many greetings does this character have?"',
            schema: z.object({}),
        }
    );
}
```

```js
export async function createChatAgent(
    supabase: SupabaseClient,
    characterId: string,
    contextStr: string
) {
    const model = createDeepseekLLM();

    // Create character management tools
    const tools = createCharacterTools(supabase, characterId);

    // Create system prompt with context
    const systemPromptWithContext = SYSTEM_PROMPT.replace('{context}', contextStr);

    // Create the agent using modern createAgent API
    const agent = createAgent({
        model,
        tools,
        systemPrompt: systemPromptWithContext,
    });

    return agent;
}
```

```js
// Invoke the agent with messages
const response = await agent.invoke({
    messages,
});
```

**what it must be**
```js
import * as z from "zod";

const contextSchema = z.object({
  supabase: z.any(),        // SupabaseClient (any for complex objects)
  characterId: z.string().uuid(),
});
```

```js
export async function getGreetingsCount({ supabase, characterId }: { supabase: any, characterId: string }): Promise<number> {
    const { count, error } = await supabase
    .from('character_greetings')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId);
    
    if (error) {
    throw new Error(`Failed to count greetings: ${error.message}`);
    }
    
    return count || 0;
}
```

```js
export function createCharacterTools() {  // No params needed!
    const getGreetingsCountTool = tool(
        async (_, { context }) => {  // context auto-injected!
            const { supabase, characterId } = context;
            const count = await getGreetingsCount({ supabase, characterId });
            return `The character currently has ${count} greeting${count === 1 ? '' : 's'}.`;
        },
        {
            name: 'get_greetings_count',
            description: 'Get total number of greetings for the current character.',
            schema: z.object({}),
        }
    );

    return [getGreetingsCountTool];
}
```

```js
export async function createChatAgent(
    supabase: SupabaseClient,
    characterId: string,
    contextStr: string
) {
    const model = createDeepseekLLM();
    const tools = createCharacterTools();  // No params!

    const systemPromptWithContext = SYSTEM_PROMPT.replace('{context}', contextStr);

    const agent = createAgent({
        model,
        tools,
        systemPrompt: systemPromptWithContext,
        contextSchema,  // ✅ Inject schema
    });

    return agent;
}
```

```js
// Invoke the agent with messages
const response = await agent.invoke({
    messages
}, {
    context: {supabase, characterId}
});
```