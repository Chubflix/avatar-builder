import React, { useEffect } from 'react';

// Mock data
export const mockCharacters = [
  {
    id: 'char-1',
    name: 'Alice Sterling',
    created_at: '2024-01-01',
    description: 'Professional character'
  },
  {
    id: 'char-2',
    name: 'Bob Martinez',
    created_at: '2024-01-02',
    description: 'Casual character'
  },
  {
    id: 'char-3',
    name: 'Charlie Davis',
    created_at: '2024-01-03',
    description: 'Action character'
  },
];

export const mockFolders = [
  { id: 'folder-1', name: 'Portrait Shots', character_id: 'char-1', created_at: '2024-01-01' },
  { id: 'folder-2', name: 'Landscape Views', character_id: 'char-1', created_at: '2024-01-02' },
  { id: 'folder-3', name: 'Action Poses', character_id: 'char-2', created_at: '2024-01-03' },
  { id: 'folder-4', name: 'Casual Outfits', character_id: 'char-2', created_at: '2024-01-04' },
  { id: 'folder-5', name: 'Professional Headshots', character_id: 'char-3', created_at: '2024-01-05' },
];

/**
 * Decorator that provides mock API implementations
 * This prevents Storybook from making real API calls
 */
export const MockApiDecorator = (Story, context) => {
  useEffect(() => {
    // Store original fetch
    const originalFetch = global.fetch;

    // Mock fetch for API calls
    global.fetch = async (url, options) => {
      console.log('[Storybook Mock] Intercepted:', url, options?.method || 'GET');

      // Mock character endpoints
      if (url.includes('/api/characters')) {
        console.log('[Storybook Mock] Returning mock characters');
        return {
          ok: true,
          json: async () => mockCharacters,
        };
      }

      // Mock folder endpoints
      if (url.includes('/api/folders')) {
        console.log('[Storybook Mock] Returning mock folders');
        const characterId = new URL(url, 'http://localhost').searchParams.get('character_id');

        if (characterId) {
          const filtered = mockFolders.filter(f => f.character_id === characterId);
          return {
            ok: true,
            json: async () => filtered,
          };
        }

        return {
          ok: true,
          json: async () => mockFolders,
        };
      }

      // Mock folder create
      if (url.includes('/api/folders') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        console.log('[Storybook Mock] Creating folder:', body);
        return {
          ok: true,
          json: async () => ({ id: `mock-${Date.now()}`, ...body }),
        };
      }

      // Mock folder update
      if (url.match(/\/api\/folders\/[^/]+$/) && options?.method === 'PUT') {
        const body = JSON.parse(options.body);
        console.log('[Storybook Mock] Updating folder:', body);
        return {
          ok: true,
          json: async () => ({ success: true, ...body }),
        };
      }

      // Mock folder delete
      if (url.match(/\/api\/folders\/[^/]+$/) && options?.method === 'DELETE') {
        console.log('[Storybook Mock] Deleting folder');
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }

      // For any other requests, use original fetch (or return empty)
      console.warn('[Storybook Mock] Unhandled request:', url);
      return {
        ok: true,
        json: async () => ({}),
      };
    };

    // Cleanup
    return () => {
      global.fetch = originalFetch;
    };
  }, []);

  return <Story {...context} />;
};
