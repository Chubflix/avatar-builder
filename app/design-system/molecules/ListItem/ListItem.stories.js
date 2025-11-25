import { ListItem } from './ListItem';

export default {
  title: 'Design System/Molecules/ListItem',
  component: ListItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `ListItem is a flexible clickable list item component used for displaying characters, folders, and special items in lists.

**Features:**
- Icon + label layout
- Optional count badge
- Active state highlighting
- Optional check icon for selection
- Special styling for system items
- Responsive sizing for mobile`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'FontAwesome icon class',
    },
    label: {
      control: 'text',
      description: 'Item label text',
    },
    count: {
      control: 'number',
      description: 'Optional count badge',
    },
    active: {
      control: 'boolean',
      description: 'Whether item is currently selected',
    },
    showCheck: {
      control: 'boolean',
      description: 'Show check icon when active',
    },
    special: {
      control: 'boolean',
      description: 'Use special styling (for system items)',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler',
    },
  },
};

/**
 * Character item
 */
export const Character = {
  args: {
    icon: 'fa-user',
    label: 'Alice Sterling',
    active: false,
    showCheck: false,
  },
};

/**
 * Folder item with count
 */
export const Folder = {
  args: {
    icon: 'fa-folder',
    label: 'Portrait Shots',
    count: 24,
    active: false,
    showCheck: false,
  },
};

/**
 * Active character with check
 */
export const ActiveCharacter = {
  args: {
    icon: 'fa-user',
    label: 'Alice Sterling',
    active: true,
    showCheck: true,
  },
};

/**
 * Active folder with check
 */
export const ActiveFolder = {
  args: {
    icon: 'fa-folder',
    label: 'Portrait Shots',
    count: 24,
    active: true,
    showCheck: true,
  },
};

/**
 * Special item - All Images
 */
export const AllImages = {
  args: {
    icon: 'fa-th',
    label: 'All Images',
    special: true,
    active: false,
  },
};

/**
 * Special item - Unfiled
 */
export const Unfiled = {
  args: {
    icon: 'fa-folder-o',
    label: 'Unfiled',
    special: true,
    active: false,
  },
};

/**
 * Back button
 */
export const BackButton = {
  args: {
    icon: 'fa-level-up',
    label: '..',
    special: true,
  },
};

/**
 * List of Items - Shows how multiple items look together
 */
export const List = {
  render: () => (
    <div style={{ maxWidth: '500px' }}>
      <ListItem icon="fa-th" label="All Images" special />
      <ListItem icon="fa-folder-o" label="Unfiled" />
      <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
      <ListItem icon="fa-user" label="Alice Sterling" />
      <ListItem icon="fa-user" label="Bob Martinez" active showCheck />
      <ListItem icon="fa-user" label="Charlie Davis" />
    </div>
  ),
};

/**
 * Folder List - Shows folders with counts
 */
export const FolderList = {
  render: () => (
    <div style={{ maxWidth: '500px' }}>
      <ListItem icon="fa-level-up" label=".." special />
      <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
      <ListItem icon="fa-folder" label="Portrait Shots" count={24} />
      <ListItem icon="fa-folder" label="Landscape Views" count={18} active showCheck />
      <ListItem icon="fa-folder" label="Action Poses" count={42} />
      <ListItem icon="fa-folder" label="Professional Headshots" count={7} />
    </div>
  ),
};
