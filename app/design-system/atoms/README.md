# Atoms

Atoms are the smallest building blocks of your UI. They are basic HTML elements or simple components that can't be broken down further without losing their meaning.

## Examples
- Buttons
- Inputs
- Labels
- Icons
- Badges
- Spinners

## Guidelines
- Atoms should be highly reusable
- They should not depend on other components
- They typically accept simple props (text, color, size, etc.)
- They should be stateless when possible

## File Structure
```
atoms/
├── Button/
│   ├── Button.js
│   ├── Button.stories.js
│   └── Button.module.css (optional)
└── Input/
    ├── Input.js
    └── Input.stories.js
```

## Current Components

### IconButton
Icon-only button component with multiple variants and sizes.

**Location**: `app/design-system/atoms/IconButton/`

**Features**:
- 4 variants: primary, secondary, danger, ghost
- 3 sizes: small, medium, large
- FontAwesome icon support
- Disabled state
- Tooltip support

**Usage**:
```jsx
import { IconButton } from '@/app/design-system/atoms/IconButton';

<IconButton icon="fa-times" variant="ghost" onClick={handleClose} title="Close" />
<IconButton icon="fa-pencil" variant="secondary" onClick={handleEdit} title="Edit" />
<IconButton icon="fa-trash" variant="danger" onClick={handleDelete} title="Delete" />
<IconButton icon="fa-check" variant="primary" onClick={handleSave} title="Save" />
```
