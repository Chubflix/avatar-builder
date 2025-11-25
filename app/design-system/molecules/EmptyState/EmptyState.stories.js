import { EmptyState } from './EmptyState';

export default {
  title: 'Design System/Molecules/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `EmptyState is a centered empty state component with an icon and message, used for displaying empty search results, empty folders, and other empty states.

**Features:**
- Large icon for visual emphasis
- Centered layout
- Muted color scheme
- Responsive sizing for mobile
- Flexible messaging`,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'text',
      description: 'FontAwesome icon class',
    },
    message: {
      control: 'text',
      description: 'Empty state message text',
    },
  },
};

/**
 * No search results
 */
export const NoSearchResults = {
  args: {
    icon: 'fa-search',
    message: 'No characters found',
  },
};

/**
 * No folders
 */
export const NoFolders = {
  args: {
    icon: 'fa-folder-o',
    message: 'No folders yet',
  },
};

/**
 * No images
 */
export const NoImages = {
  args: {
    icon: 'fa-image',
    message: 'No images found',
  },
};

/**
 * No results
 */
export const NoResults = {
  args: {
    icon: 'fa-inbox',
    message: 'Nothing here yet',
  },
};

/**
 * Without icon
 */
export const WithoutIcon = {
  args: {
    message: 'No items to display',
  },
};

/**
 * In modal context - Shows how it looks in an actual modal list
 */
export const InModalContext = {
  render: () => (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700 }}>
          Select Location
        </h4>
      </div>
      <div style={{ padding: '0.5rem' }}>
        <EmptyState icon="fa-search" message="No folders found" />
      </div>
    </div>
  ),
};

/**
 * All Empty States - Gallery view
 */
export const AllStates = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <EmptyState icon="fa-search" message="No characters found" />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <EmptyState icon="fa-folder-o" message="No folders yet" />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <EmptyState icon="fa-image" message="No images found" />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <EmptyState icon="fa-inbox" message="Nothing here yet" />
      </div>
    </div>
  ),
};
