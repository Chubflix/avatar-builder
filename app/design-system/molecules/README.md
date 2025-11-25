# Molecules

Molecules are groups of atoms bonded together to form relatively simple UI components that have a specific purpose.

## Examples
- Search bar (input + button)
- Form field (label + input + error message)
- Card header (avatar + title + action button)
- Navigation item (icon + label)

## Guidelines
- Molecules combine 2+ atoms to create a functional unit
- They should serve a single, clear purpose
- Can maintain their own simple state
- Should still be fairly generic and reusable

## File Structure
```
molecules/
├── SearchBar/
│   ├── SearchBar.js
│   ├── SearchBar.stories.js
│   └── SearchBar.module.css (optional)
└── FormField/
    ├── FormField.js
    └── FormField.stories.js
```

## Current Components

### ModalHeader
Modal dialog header with title and close button.

**Location**: `app/design-system/molecules/ModalHeader/`

**Composition**: Title (h4) + IconButton (close)

**Usage**:
```jsx
import { ModalHeader } from '@/app/design-system/molecules/ModalHeader';

<ModalHeader title="Select Location" onClose={handleClose} />
```

---

### ListItem
Clickable list item with icon, label, and optional count badge.

**Location**: `app/design-system/molecules/ListItem/`

**Composition**: Icon + Label + Count + Check icon

**Features**:
- Active state highlighting
- Optional count badge
- Optional check icon
- Special styling for system items

**Usage**:
```jsx
import { ListItem } from '@/app/design-system/molecules/ListItem';

<ListItem icon="fa-user" label="Alice Sterling" onClick={handleClick} />
<ListItem icon="fa-folder" label="Portrait Shots" count={24} active showCheck />
<ListItem icon="fa-th" label="All Images" special />
```

---

### ListItemWithActions
List item with inline edit and delete action buttons.

**Location**: `app/design-system/molecules/ListItemWithActions/`

**Composition**: ListItem + IconButton (edit) + IconButton (delete)

**Usage**:
```jsx
import { ListItemWithActions } from '@/app/design-system/molecules/ListItemWithActions';

<ListItemWithActions
  icon="fa-user"
  label="Alice Sterling"
  onClick={handleSelect}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### EditableListItem
Inline editing row with input field and save/cancel buttons.

**Location**: `app/design-system/molecules/EditableListItem/`

**Composition**: Input + IconButton (save) + IconButton (cancel)

**Features**:
- Keyboard support (Enter to save, Escape to cancel)
- Auto-focus on mount
- Disabled state for save button

**Usage**:
```jsx
import { EditableListItem } from '@/app/design-system/molecules/EditableListItem';

<EditableListItem
  value={name}
  onChange={setName}
  onSave={handleSave}
  onCancel={handleCancel}
  placeholder="Character name..."
  disabled={!name.trim()}
/>
```

---

### EmptyState
Centered empty state message with icon.

**Location**: `app/design-system/molecules/EmptyState/`

**Composition**: Icon + Message

**Usage**:
```jsx
import { EmptyState } from '@/app/design-system/molecules/EmptyState';

<EmptyState icon="fa-search" message="No characters found" />
<EmptyState icon="fa-folder-o" message="No folders yet" />
```
