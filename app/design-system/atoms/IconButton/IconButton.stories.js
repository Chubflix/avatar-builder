import { IconButton } from './IconButton';

export default {
  title: 'Design System/Atoms/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `IconButton is a flexible icon-only button component used throughout the application for actions like close, edit, delete, save, and cancel.

**Features:**
- Multiple variants (primary, secondary, danger, ghost)
- Three sizes (small, medium, large)
- Disabled state support
- Tooltip support via title attribute
- Responsive sizing for mobile`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'FontAwesome icon class (e.g., "fa-times", "fa-pencil")',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether button is disabled',
    },
    title: {
      control: 'text',
      description: 'Tooltip text (shows on hover)',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler function',
    },
  },
};

/**
 * Primary variant - Used for save/confirm actions
 */
export const Primary = {
  args: {
    icon: 'fa-check',
    variant: 'primary',
    size: 'medium',
    title: 'Save',
  },
};

/**
 * Secondary variant - Used for edit actions
 */
export const Secondary = {
  args: {
    icon: 'fa-pencil',
    variant: 'secondary',
    size: 'medium',
    title: 'Edit',
  },
};

/**
 * Danger variant - Used for delete/destructive actions
 */
export const Danger = {
  args: {
    icon: 'fa-trash',
    variant: 'danger',
    size: 'medium',
    title: 'Delete',
  },
};

/**
 * Ghost variant - Used for subtle actions like close
 */
export const Ghost = {
  args: {
    icon: 'fa-times',
    variant: 'ghost',
    size: 'medium',
    title: 'Close',
  },
};

/**
 * Small size - Compact UI elements
 */
export const Small = {
  args: {
    icon: 'fa-times',
    variant: 'ghost',
    size: 'small',
    title: 'Clear',
  },
};

/**
 * Large size - More prominent actions
 */
export const Large = {
  args: {
    icon: 'fa-plus',
    variant: 'primary',
    size: 'large',
    title: 'Add',
  },
};

/**
 * Disabled state
 */
export const Disabled = {
  args: {
    icon: 'fa-check',
    variant: 'primary',
    size: 'medium',
    disabled: true,
    title: 'Save (disabled)',
  },
};

/**
 * All Common Icons - Gallery view of commonly used icons
 */
export const CommonIcons = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-times" variant="ghost" title="Close" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Close</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-pencil" variant="secondary" title="Edit" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Edit</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-trash" variant="danger" title="Delete" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Delete</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-check" variant="primary" title="Save" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Save</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-plus" variant="primary" title="Add" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Add</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-search" variant="secondary" title="Search" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Search</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IconButton icon="fa-level-up" variant="secondary" title="Back" />
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>Back</p>
      </div>
    </div>
  ),
};
