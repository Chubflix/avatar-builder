# Character Specification Documentation

## Overview

This directory contains the technical specification for the ChubAI Character Sheet format used in this project.

## Character Structure

Each character in `/characters/[character-name]/` follows this file structure:

### Core Files (in character folder root)
- **`character.sheet.yaml`** - Main character definition with all metadata, descriptions, and greetings
- **`note.md`** - Creator's notes about design philosophy, color schemes, styling preferences
- **`character.json`** (auto-generated) - ChubAI-compatible JSON export
- **`creator-note.html`** (auto-generated) - Formatted HTML creator's note

### Image Directory (`img/`)
- **Flat directory structure** containing all character images
- Names are chosen by the user (no enforced naming convention)
- Typically includes: avatars, greeting images, expressions, etc.

## Files in This Directory

### Primary Documentation

- **`character.spec.yaml`** - Complete template file with all available fields and examples
- **`character.1.1.schema.json`** - JSON Schema for validation of character.sheet.yaml files

## Key Changes from Previous Structure

### What Changed

1. **Single YAML file**: `character.sheet.yaml` replaces the multi-file folder structure
2. **Separate creator notes**: `note.md` is now separate from the character sheet
3. **Flat image directory**: All images in `img/` with user-chosen names
4. **Auto-generated exports**: `character.json` and `creator-note.html` are generated on-demand

### What Stayed the Same

- Character metadata structure (title, tags, description, etc.)
- Greeting format and organization
- Avatar prompts and example dialogs
- System prompt structure
- Changelog tracking

## Schema Version

**Current Version**: 1.1

**Format**: character.sheet.yaml files must include:
```yaml
meta:
  format_version: "1.1"
  created_at: "2025-11-17T00:00:00Z"
  last_modified: "2025-11-17T00:00:00Z"
```

## Required Sections

Every `character.sheet.yaml` file MUST contain:

1. **`meta`** - Format version and timestamps
2. **`changelog`** - Version history
3. **`character`** - Complete character definition
   - `title`, `tagline`, `tags`
   - `description` (with rundown, appearance, personality)
   - `system_prompt`
   - `initial_greeting`

## Optional Sections

These sections can be included when needed:

- **`character.short_name`** - Nickname or shortened name
- **`character.subtitle`** - Brief identifier
- **`character.in_chat_name`** - Name shown in chat UI
- **`character.scenario`** - Current circumstances and context for the conversation
- **`character.post_history_instructions`** - Instructions appended after chat history (V2 Spec)
- **`character.characters_note`** - Prompt injected at specific depth in chat history
- **`character.alternative_greetings`** - Additional greeting scenarios
- **`character.avatars`** - Multiple avatar generation prompts
- **`chubAI`** - ChubAI platform integration metadata
- **`local`** - Local filesystem and publishing metadata
- **`assets`** - Asset tracking (expressions, backgrounds, etc.)

## Greeting Structure

Greetings (both initial and alternatives) include:

```yaml
title: "Scenario Title"
description: "Brief description"
is_nsfw: false
pov: "any"  # any, male, or female
has_image: true
avatar_prompt: "Image generation prompt"
content: |
  The actual greeting text with {{char}} and {{user}} placeholders.
```

## Character Description Sections

The `character.description` object includes:

- **`rundown`** - Quick facts (required: name, age; optional: gender, species, hair, eyes, ethnicity, style, build, setting, plus custom fields)
- **`appearance`** - Detailed physical description
- **`profession`** - Occupation and work style
- **`relation_to_user`** - How character relates to {{user}}
- **`personality`** - Core traits and emotional patterns
- **`traits_and_quirks`** - List of notable behaviors
- **`background`** - Character history

## Advanced Character Fields

These optional fields provide additional control over character behavior:

### `scenario`
Describes the current circumstances and context of the conversation. Use this to establish the situation {{char}} and {{user}} are in.

### `post_history_instructions`
Character-specific instructions appended after chat history. Only used when 'Use V2 Spec.' is enabled in the frontend. Include `{{original}}` to supplement (rather than replace) the user's default PHI settings.

### `characters_note`
Injects a prompt at a specific position in chat history:
```yaml
characters_note:
  prompt: "Reminder about character state"
  depth: 4  # Messages back from current
```

## Creator Notes (note.md)

The separate `note.md` file contains styling and design information:

- Design philosophy
- Color scheme preferences
- Mood and tone guidance
- Inspiration sources
- Usage notes
- Any other non-character-definition content

This content is used when generating `creator-note.html`.

## Validation

Use the JSON Schema file to validate character sheets:

```bash
# Example using a JSON Schema validator
yajsv -s character.1.1.schema.json /path/to/character.sheet.yaml
```

## Next Steps

1. **Creating a new character?** Use `character.spec.yaml` as your template
3. **Understanding the format?** Review `character.1.1.schema.json`

## Questions & Support

For questions about:
- **Field meanings**: See `character.spec.yaml` inline comments
- **Validation errors**: Check `character.1.1.schema.json`

---

**Last Updated**: 2025-11-17  
**Schema Version**: 1.1  
**Format**: YAML with JSON Schema validation
