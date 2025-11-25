import { LocationPicker } from './LocationPicker';
import { useState } from 'react';
import { AppProvider } from '@/app/context/AppContext';
import { QueueProvider } from '@/app/context/QueueContext';

// Mock data for Storybook (prevents real API calls)
const mockCharacters = [
  { id: 'char-1', name: 'Alice Sterling', created_at: '2024-01-01' },
  { id: 'char-2', name: 'Bob Martinez', created_at: '2024-01-02' },
  { id: 'char-3', name: 'Charlie Davis', created_at: '2024-01-03' },
];

const mockFolders = [
  { id: 'folder-1', name: 'Portrait Shots', character_id: 'char-1', created_at: '2024-01-01' },
  { id: 'folder-2', name: 'Landscape Views', character_id: 'char-1', created_at: '2024-01-02' },
  { id: 'folder-3', name: 'Action Poses', character_id: 'char-2', created_at: '2024-01-03' },
  { id: 'folder-4', name: 'Casual Outfits', character_id: 'char-2', created_at: '2024-01-04' },
  { id: 'folder-5', name: 'Professional Headshots', character_id: 'char-3', created_at: '2024-01-05' },
];

// Mock fetch BEFORE rendering (so any component can use mocked API)
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async (url, options) => {
    console.log('[Storybook Mock]', options?.method || 'GET', url);

    // Characters endpoint
    if (url.includes('/api/characters')) {
      console.log('[Storybook Mock] Returning mock characters');
      return { ok: true, json: async () => mockCharacters };
    }

    // Folders endpoint
    if (url.includes('/api/folders')) {
      const urlObj = new URL(url, window.location.origin);
      const characterId = urlObj.searchParams.get('character_id');
      const filtered = characterId
        ? mockFolders.filter(f => f.character_id === characterId)
        : mockFolders;
      console.log('[Storybook Mock] Returning mock folders', filtered.length);
      return { ok: true, json: async () => filtered };
    }

    // Create/Update/Delete - just log and return success
    if (options?.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      console.log('[Storybook Mock] Mocked', options.method, 'response');
      const body = options.body ? JSON.parse(options.body) : {};
      return { ok: true, json: async () => ({ success: true, id: `mock-${Date.now()}`, ...body }) };
    }

    // Fallback to original fetch for other requests
    console.warn('[Storybook Mock] Unhandled request, using original fetch:', url);
    return originalFetch(url, options);
  };
}

// Custom provider that pre-loads mock data
const MockedProviders = ({ children }) => {
  const { useEffect } = require('react');
  const { useApp } = require('@/app/context/AppContext');

  const InnerWrapper = () => {
    const { dispatch, actions } = useApp();

    // Pre-load mock data into context
    useEffect(() => {
      console.log('[Storybook] Loading mock data into context');
      dispatch({ type: actions.SET_CHARACTERS, payload: mockCharacters });
      dispatch({ type: actions.SET_FOLDERS, payload: mockFolders });
    }, [dispatch, actions]);

    return <>{children}</>;
  };

  return (
    <QueueProvider>
      <AppProvider>
        <InnerWrapper />
      </AppProvider>
    </QueueProvider>
  );
};

export default {
  title: 'Design System/Organisms/LocationPicker',
  component: LocationPicker,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `A hierarchical location picker for selecting characters and folders. Supports multiple modes: save, move, navigate, and select.

**Note**: All API calls are mocked in Storybook to prevent accessing real data. The component uses 3 mock characters and 5 mock folders for demonstration.`,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MockedProviders>
        <Story />
      </MockedProviders>
    ),
  ],
  argTypes: {
    mode: {
      control: 'select',
      options: ['save', 'move', 'select', 'navigate'],
      description: 'Determines the behavior and available actions',
    },
    show: {
      control: 'boolean',
      description: 'Controls modal visibility',
    },
    title: {
      control: 'text',
      description: 'Modal title text',
    },
    currentFolderId: {
      control: 'text',
      description: 'Currently selected folder ID (for highlighting)',
    },
    currentCharacterId: {
      control: 'text',
      description: 'Currently selected character ID (for highlighting)',
    },
    allowCharacterSelect: {
      control: 'boolean',
      description: 'Allow selecting characters directly',
    },
    onSelect: { action: 'selected' },
    onClose: { action: 'closed' },
  },
};

// Wrapper component to handle state
const LocationPickerWrapper = (args) => {
  const [show, setShow] = useState(args.show || false);

  return (
    <>
      <div style={{ padding: '2rem', minHeight: '100vh', background: '#1a1a1a' }}>
        <button
          onClick={() => setShow(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #e50914 0%, #b20710 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Open LocationPicker
        </button>

        <div style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)' }}>
          <p>Mode: <strong style={{ color: '#e50914' }}>{args.mode}</strong></p>
          <p>Title: {args.title}</p>
          {args.currentFolderId && <p>Current Folder: {args.currentFolderId}</p>}
          {args.currentCharacterId && <p>Current Character: {args.currentCharacterId}</p>}
        </div>
      </div>

      <LocationPicker
        {...args}
        show={show}
        onClose={() => {
          setShow(false);
          args.onClose?.();
        }}
        onSelect={(folderId, characterId, includeSubfolders) => {
          console.log('Selected:', { folderId, characterId, includeSubfolders });
          args.onSelect?.(folderId, characterId, includeSubfolders);
          setShow(false);
        }}
      />
    </>
  );
};

/**
 * Save Mode - Used when saving generated images to a folder.
 * Allows creating new characters and folders.
 */
export const SaveMode = {
  render: LocationPickerWrapper,
  args: {
    mode: 'save',
    title: 'Save to Folder',
    show: false,
  },
};

/**
 * Move Mode - Used when moving existing images to a different folder.
 * Shows current location and allows selecting a destination.
 */
export const MoveMode = {
  render: LocationPickerWrapper,
  args: {
    mode: 'move',
    title: 'Move to Folder',
    show: false,
    currentFolderId: null,
    currentCharacterId: null,
  },
};

/**
 * Navigate Mode - Used in the gallery for browsing folders.
 * Character headers are clickable to view all folders.
 */
export const NavigateMode = {
  render: LocationPickerWrapper,
  args: {
    mode: 'navigate',
    title: 'Select Location',
    show: false,
  },
};

/**
 * Select Mode - Generic selection mode for picking a location.
 * Includes "All Images" option.
 */
export const SelectMode = {
  render: LocationPickerWrapper,
  args: {
    mode: 'select',
    title: 'Select Location',
    show: false,
  },
};

/**
 * With Current Selection - Shows the picker with a folder pre-selected.
 * The selected folder will be highlighted in the UI.
 */
export const WithCurrentFolder = {
  render: LocationPickerWrapper,
  args: {
    mode: 'move',
    title: 'Move to Folder',
    show: false,
    currentFolderId: 'example-folder-id',
    currentCharacterId: 'example-character-id',
  },
};

/**
 * Allow Character Select - Enables direct character selection without entering folders.
 */
export const WithCharacterSelect = {
  render: LocationPickerWrapper,
  args: {
    mode: 'select',
    title: 'Select Character or Folder',
    show: false,
    allowCharacterSelect: true,
  },
};

/**
 * Open by Default - Modal starts in open state for testing.
 */
export const OpenByDefault = {
  render: LocationPickerWrapper,
  args: {
    mode: 'save',
    title: 'Save to Folder',
    show: true,
  },
};
