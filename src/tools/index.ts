/**
 * Chubflix Character Management Tools
 *
 * This module provides tools for managing characters using a hybrid
 * structured database + RAG approach:
 *
 * - 90% of queries use structured SQL (0$ cost)
 * - 10% of queries use RAG embeddings ($0.001/query)
 *
 * Workflow: Read → Propose (AI) → Confirm → Save
 */

// Character Management (CRUD)
export {
  getCharacter,
  getCharacterBySlug,
  getAllCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  searchCharacters,
  getCompleteCharacterData,
  type Character
} from './manage_character';

// Greetings Management
export {
  getGreetings,
  getGreetingsCount,
  type Greeting
} from './get_greetings';

export {
  addGreeting,
  addGreetings
} from './add_greeting';

export {
  updateGreeting,
  reorderGreeting
} from './update_greeting';

export {
  deleteGreeting,
  deleteGreetings
} from './delete_greeting';

// Story Phases Management
export {
  getStoryPhases,
  getStoryPhasesCount,
  type StoryPhase,
} from './get_story_phases';

export {
  addStoryPhase,
  addStoryPhases,
} from './add_story_phase';

export {
  updateStoryPhase,
  reorderStoryPhase,
} from './update_story_phase';

export {
  deleteStoryPhase,
  deleteStoryPhases,
} from './delete_story_phase';

// Description Sections Management
export {
  getPersonality,
  type DescriptionSection
} from './get_personality';

export {
  getAppearance
} from './get_appearance';

export {
  updateDescription,
  updateDescriptions,
  getAllDescriptions
} from './update_description';

// Avatar Generation
export {
  generateAvatar,
  type AvatarGenerationOptions,
} from './generate_avatar';

// Character Sheet YAML Parser
export {
  parseAndStoreCharacterSheet,
  parseCharacterSheetFile,
  exportCharacterToYAML,
  type CharacterSheetYAML,
  type ParsedCharacter
} from './parse_character_sheet';

// RAG World Rules Search
export {
  searchWorldRules,
  searchWorldRulesByKeyword,
  getCharacterWorldRules,
  addWorldRule,
  deleteWorldRule,
  type DocumentChunk
} from './search_world_rules';

// Image analysis (Vision)
export {
  analyzeImageAppearance
} from './analyze_image_appearance';

/**
 * Tool Usage Examples:
 *
 * 1. Add New Greetings (Proposal Flow):
 *    const greetings = await getGreetings(claraId);
 *    // AI generates proposals
 *    await addGreeting(claraId, "Nursing Study 1", content);
 *
 * 2. Edit Greeting:
 *    const greeting = await getGreetings(claraId, 5);
 *    // AI rewrites
 *    await updateGreeting(greetingId, { content: newText });
 *
 * 3. Edit Appearance:
 *    const appearance = await getAppearance(claraId);
 *    // AI proposes changes
 *    await updateDescription(claraId, 'appearance', newText);
 *
 * 4. Add New Character:
 *    const character = await createCharacter("Elf Warrior");
 *    await addGreetings(character.id, greetings);
 *    await generateAvatar(character.id, "Elf warrior forest");
 *
 * 5. Parse Character Sheet:
 *    const result = await parseCharacterSheetFile(file);
 *    // Automatically creates character + greetings + descriptions
 *
 * 6. Search World Rules (RAG):
 *    const rules = await searchWorldRules("magic combat rules");
 *    // Returns semantically similar documents
 */
