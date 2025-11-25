# Organisms

Organisms are complex UI components composed of groups of molecules and/or atoms. They form distinct sections of an interface.

## Examples
- Navigation bar (logo + menu items + user dropdown)
- Image gallery grid
- Settings panel
- Modal dialog
- Data table with filters

## Guidelines
- Organisms are complex, multi-part components
- They combine molecules and atoms into a cohesive unit
- Often tied to specific business logic
- Can have complex state management
- Should be self-contained and independent

## File Structure
```
organisms/
├── Header/
│   ├── Header.js
│   ├── Header.stories.js
│   └── Header.module.css (optional)
└── ImageGrid/
    ├── ImageGrid.js
    └── ImageGrid.stories.js
```

## Design System Components

### LocationPicker
A complex hierarchical location picker for selecting characters and folders. Supports multiple modes (save, move, navigate, select) with inline editing, search, and creation capabilities.

**Location**: `app/design-system/organisms/LocationPicker/`
**Production version**: `app/components/LocationPicker.js` (will be migrated)

## Current Components (Legacy)
Your existing components in `/app/components/` mostly fall into the organisms category:
- `ImageGallery.js`
- `ControlsPanel.js`
- `FolderNav.js`
- `Lightbox.js`
- `LocationPicker.js` (now also in design system)
