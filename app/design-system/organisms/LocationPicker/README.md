# LocationPicker

A complex, hierarchical location picker for selecting characters and folders. This organism combines multiple atoms and molecules to create a complete file-system-style navigation experience.

## Overview

LocationPicker is a modal component that allows users to:
- Browse and select characters
- Navigate into character folders
- Create new characters and folders
- Edit existing items
- Search for folders
- View unfiled items

## Modes

The LocationPicker supports four distinct modes:

### 1. Save Mode (`mode="save"`)
Used when saving generated images to a folder.
- Shows "All Images" option
- Allows creating new characters and folders
- Used in: Generation controls

### 2. Move Mode (`mode="move"`)
Used when moving existing images to a different folder.
- Highlights current location
- Shows destination options
- Used in: Image gallery bulk actions, lightbox

### 3. Navigate Mode (`mode="navigate"`)
Used for browsing and navigating the folder structure.
- Character headers are clickable to view all folders
- Used in: Gallery folder selector

### 4. Select Mode (`mode="select"`)
Generic selection mode.
- Includes "All Images" option
- Basic folder/character selection

## Usage

```javascript
import { LocationPicker } from '@/app/design-system/organisms/LocationPicker';

function MyComponent() {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <button onClick={() => setShowPicker(true)}>
        Choose Folder
      </button>

      <LocationPicker
        show={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(folderId, characterId, includeSubfolders) => {
          console.log('Selected:', { folderId, characterId, includeSubfolders });
          setShowPicker(false);
        }}
        currentFolderId={currentFolder}
        currentCharacterId={currentCharacter?.id}
        title="Save to Folder"
        mode="save"
      />
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | required | Controls modal visibility |
| `onClose` | `function` | required | Called when modal should close |
| `onSelect` | `function` | required | Called when location selected: `(folderId, characterId, includeSubfolders)` |
| `currentFolderId` | `string` | `null` | Currently selected folder ID (for highlighting) |
| `currentCharacterId` | `string` | `null` | Currently selected character ID (for highlighting) |
| `title` | `string` | `"Select Location"` | Modal title text |
| `mode` | `string` | `"select"` | One of: `save`, `move`, `select`, `navigate` |
| `allowCharacterSelect` | `boolean` | `false` | Allow selecting characters directly |

## Callback Signature

The `onSelect` callback receives three parameters:

```javascript
onSelect(folderId, characterId, includeSubfolders)
```

- `folderId`: `string | null | 'all'` - Selected folder ID, or `null` for unfiled, or `'all'` for all images
- `characterId`: `string | null` - Selected character ID (when character selected)
- `includeSubfolders`: `boolean` - Whether to include all subfolders (clicking character header)

## Features

### Character & Folder Management
- Create new characters and folders inline
- Edit character and folder names
- Delete characters and folders (with confirmation)
- Search functionality for folders

### Navigation
- Two-view system: Characters view → Folders view
- Back button to return to characters
- Breadcrumb-style navigation
- Keyboard support (Enter to save, Escape to cancel)

### Visual Feedback
- Active item highlighting
- Edit mode indicators
- Loading states
- Empty states

### Accessibility
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader support

## Component Composition

LocationPicker is built from:
- **Atoms**: Buttons, inputs, icons
- **Molecules**: Search functionality, list items
- **State Management**: Uses AppContext for folders and characters
- **Portal Rendering**: Uses ReactDOM.createPortal for modal overlay

## Styling

Styles are in `LocationPicker.css` (originally `folder-styles.css`).

Key CSS classes:
- `.location-modal` - Modal overlay
- `.location-selector` - Main container
- `.location-search` - Search input
- `.location-character-header` - Character header in folders view
- `.location-item` - List items
- `.active` - Active/selected state

## Current Implementation

**Note**: The production version of this component currently lives at:
```
/app/components/LocationPicker.js
```

This design system version is for:
1. Documentation and Storybook demos
2. Reference for new implementations
3. Testing different modes and states
4. Future refactoring baseline

When ready to migrate, update all imports from `/app/components/LocationPicker` to `/app/design-system/organisms/LocationPicker`.

## Related Components

- **FolderModal** - Older folder selection (being replaced by LocationPicker)
- **CharacterFolderSelector** - Uses LocationPicker in navigate mode
- **ControlsPanel** - Uses LocationPicker in save mode
- **ImageGallery** - Uses LocationPicker in move mode
- **Lightbox** - Uses LocationPicker in move mode

## Migration Guide

To use this design system version instead of the legacy component:

```javascript
// Before
import LocationPicker from '@/app/components/LocationPicker';

// After
import { LocationPicker } from '@/app/design-system/organisms/LocationPicker';
```

## Examples in Storybook

View all modes and states in Storybook:
```bash
npm run storybook
```

Navigate to: **Design System > Organisms > LocationPicker**
