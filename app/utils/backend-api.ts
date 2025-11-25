// @ts-nocheck
/**
 * Backend API Client
 * Handles all communication with the Avatar Builder backend
 */

const API_BASE = process.env.REACT_APP_API_BASE || '';

/**
 * Folder API
 */
export const folderAPI = {
    /**
     * Get all folders with image counts
     * Optionally filter by character_id
     */
    async getAll(characterId: string | null = null) {
        let url = `${API_BASE}/api/folders`;
        if (characterId) {
            url += `?character_id=${characterId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load folders');
        }
        return await response.json();
    },

    /**
     * Create a new folder (requires character_id)
     */
    async create({ name, description = null, character_id }: { name: string; description?: string | null; character_id: string; }) {
        const response = await fetch(`${API_BASE}/api/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, character_id })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create folder');
        }

        return await response.json();
    },

    /**
     * Update a folder
     */
    async update(id: string, { name, description = null }: { name: string; description?: string | null; }) {
        const response = await fetch(`${API_BASE}/api/folders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update folder');
        }

        return await response.json();
    },

    /**
     * Delete a folder
     */
    async delete(id: string) {
        const response = await fetch(`${API_BASE}/api/folders/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete folder');
        }

        return await response.json();
    }
};

/**
 * Image API
 */
export const imageAPI = {
    /**
     * Get images with optional folder filter
     */
    async getAll({ folderId = null, character_id = null, limit = 50, offset = 0 }: { folderId?: string | null; character_id?: string | null; limit?: number; offset?: number; } = {}) {
        let url = `${API_BASE}/api/images?limit=${limit}&offset=${offset}`;
        if (folderId) {
            url += `&folder_id=${folderId}`;
        }
        if (character_id) {
            // url += `&character_id=${character_id}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load images');
        }

        return await response.json();
    },

    /**
     * Get a single image by id
     */
    async getById(id: string) {
        const url = `${API_BASE}/api/images?id=${encodeURIComponent(id)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load image');
        }
        const data = await response.json();
        return Array.isArray(data.images) ? data.images[0] : null;
    },

    /**
     * Save a new image
     */
    async save({
                   imageData,
                   positivePrompt,
                   negativePrompt,
                   model,
                   orientation,
                   width,
                   height,
                   batchSize,
                   samplerName,
                   scheduler,
                   steps,
                   cfgScale,
                   seed,
                   adetailerEnabled,
                   adetailerModel,
                   info,
                   folderId = null,
                   loras = null
               }: any) {
        const response = await fetch(`${API_BASE}/api/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData,
                positivePrompt,
                negativePrompt,
                model,
                orientation,
                width,
                height,
                batchSize,
                samplerName,
                scheduler,
                steps,
                cfgScale,
                seed,
                adetailerEnabled,
                adetailerModel,
                info,
                folderId,
                loras
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save image');
        }

        return await response.json();
    },

    /**
     * Update image (move to folder)
     */
    async update(id: string, { folderId }: { folderId: string | null; }) {
        const response = await fetch(`${API_BASE}/api/images/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId })
        });

        if (!response.ok) {
            throw new Error('Failed to update image');
        }

        return await response.json();
    },

    /**
     * Update image flags (favorite, nsfw)
     */
    async updateFlags(id: string, { is_favorite, is_nsfw }: { is_favorite?: boolean; is_nsfw?: boolean; }) {
        const updates: any = {};
        if (is_favorite !== undefined) updates.is_favorite = is_favorite;
        if (is_nsfw !== undefined) updates.is_nsfw = is_nsfw;

        const response = await fetch(`${API_BASE}/api/images/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update image flags');
        }

        return await response.json();
    },

    /**
     * Delete an image
     */
    async delete(id: string) {
        const response = await fetch(`${API_BASE}/api/images/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete image');
        }

        return await response.json();
    }
};

/**
 * Character API (minimal)
 */
export const characterAPI = {
    async getAll() {
        const response = await fetch(`${API_BASE}/api/characters`);
        if (!response.ok) {
            throw new Error('Failed to load characters');
        }
        return await response.json();
    }
};
