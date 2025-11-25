import { ModalHeader } from './ModalHeader';

export default {
  title: 'Design System/Molecules/ModalHeader',
  component: ModalHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `ModalHeader is a molecule that combines a title with a close button, used in modal dialogs throughout the application.

**Features:**
- Consistent title styling
- Integrated close button using IconButton atom
- Responsive padding for mobile
- Flexible title text`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Modal title text',
    },
    onClose: {
      action: 'closed',
      description: 'Close button click handler',
    },
  },
};

/**
 * Default modal header
 */
export const Default = {
  args: {
    title: 'Select Location',
  },
};

/**
 * Save mode header
 */
export const SaveMode = {
  args: {
    title: 'Save to Folder',
  },
};

/**
 * Move mode header
 */
export const MoveMode = {
  args: {
    title: 'Move to Folder',
  },
};

/**
 * Long title - Tests text overflow handling
 */
export const LongTitle = {
  args: {
    title: 'This is a Very Long Modal Title That Might Need Special Handling',
  },
};

/**
 * In Modal Context - Shows how it looks in an actual modal
 */
export const InModalContext = {
  args: {
    title: 'Select Location',
  },
  render: (args) => (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
    }}>
      <ModalHeader {...args} />
      <div style={{ padding: '1.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Modal content would go here...
        </p>
      </div>
    </div>
  ),
};
