import { ListItemWithActions } from './ListItemWithActions';

export default {
  title: 'Design System/Molecules/ListItemWithActions',
  component: ListItemWithActions,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `ListItemWithActions extends ListItem by adding inline edit and delete action buttons.

**Features:**
- All ListItem features (icon, label, count, active state)
- Inline edit button
- Inline delete button
- Actions stop propagation (don't trigger item click)
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
    onClick: {
      action: 'clicked',
      description: 'Click handler for the item',
    },
    onEdit: {
      action: 'edit-clicked',
      description: 'Edit button click handler',
    },
    onDelete: {
      action: 'delete-clicked',
      description: 'Delete button click handler',
    },
  },
};

/**
 * Character with actions
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
 * Folder with actions and count
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
 * List of Items with Actions - Shows how multiple items look together
 */
export const CharacterList = {
  render: () => (
    <div style={{ maxWidth: '500px' }}>
      <ListItemWithActions
        icon="fa-user"
        label="Alice Sterling"
        onEdit={() => console.log('Edit Alice')}
        onDelete={() => console.log('Delete Alice')}
      />
      <ListItemWithActions
        icon="fa-user"
        label="Bob Martinez"
        active
        showCheck
        onEdit={() => console.log('Edit Bob')}
        onDelete={() => console.log('Delete Bob')}
      />
      <ListItemWithActions
        icon="fa-user"
        label="Charlie Davis"
        onEdit={() => console.log('Edit Charlie')}
        onDelete={() => console.log('Delete Charlie')}
      />
    </div>
  ),
};

/**
 * Folder List with Actions - Shows folders with counts and actions
 */
export const FolderList = {
  render: () => (
    <div style={{ maxWidth: '500px' }}>
      <ListItemWithActions
        icon="fa-folder"
        label="Portrait Shots"
        count={24}
        onEdit={() => console.log('Edit Portrait Shots')}
        onDelete={() => console.log('Delete Portrait Shots')}
      />
      <ListItemWithActions
        icon="fa-folder"
        label="Landscape Views"
        count={18}
        active
        showCheck
        onEdit={() => console.log('Edit Landscape Views')}
        onDelete={() => console.log('Delete Landscape Views')}
      />
      <ListItemWithActions
        icon="fa-folder"
        label="Action Poses"
        count={42}
        onEdit={() => console.log('Edit Action Poses')}
        onDelete={() => console.log('Delete Action Poses')}
      />
    </div>
  ),
};

/**
 * Interactive Demo - Click item vs. actions
 */
export const InteractiveDemo = {
  render: () => {
    const [selected, setSelected] = React.useState(null);

    return (
      <div style={{ maxWidth: '500px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Click the item to select it. Click edit or delete buttons to trigger those actions.
          Selected: <strong style={{ color: 'var(--accent)' }}>{selected || 'None'}</strong>
        </p>
        <ListItemWithActions
          icon="fa-user"
          label="Alice Sterling"
          active={selected === 'Alice Sterling'}
          showCheck={selected === 'Alice Sterling'}
          onClick={() => setSelected('Alice Sterling')}
          onEdit={() => alert('Edit Alice Sterling')}
          onDelete={() => alert('Delete Alice Sterling')}
        />
        <ListItemWithActions
          icon="fa-user"
          label="Bob Martinez"
          active={selected === 'Bob Martinez'}
          showCheck={selected === 'Bob Martinez'}
          onClick={() => setSelected('Bob Martinez')}
          onEdit={() => alert('Edit Bob Martinez')}
          onDelete={() => alert('Delete Bob Martinez')}
        />
      </div>
    );
  },
};
