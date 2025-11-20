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
     */
    async getAll() {
        const response = await fetch(`${API_BASE}/api/folders`);
        if (!response.ok) {
            throw new Error('Failed to load folders');
        }
        return await response.json();
    },

    /**
     * Create a new folder
     */
    async create({ name, description = null, parent_id = null }) {
        const response = await fetch(`${API_BASE}/api/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, parent_id })
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
    async update(id, { name, description = null, parent_id = null }) {
        const response = await fetch(`${API_BASE}/api/folders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, parent_id })
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
    async delete(id) {
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
    async getAll({ folderId = null, limit = 50, offset = 0 } = {}) {
        let url = `${API_BASE}/api/images?limit=${limit}&offset=${offset}`;
        if (folderId) {
            url += `&folder_id=${folderId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load images');
        }

        return await response.json();
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
                   folderId = null
               }) {
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
                folderId
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
    async update(id, { folderId }) {
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
     * Delete an image
     */
    async delete(id) {
        const response = await fetch(`${API_BASE}/api/images/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete image');
        }

        return await response.json();
    },

    /**
     * Bulk move images to folder
     */
    async bulkMove(imageIds, folderId) {
        const response = await fetch(`${API_BASE}/api/images/bulk-move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageIds, folderId })
        });

        if (!response.ok) {
            throw new Error('Failed to move images');
        }

        return await response.json();
    },

    /**
     * Get image URL
     */
    getUrl(image) {
        return `${API_BASE}${image.url || `/generated/${image.filename}`}`;
    },

    /**
     * Download image
     */
    download(image) {
        const link = document.createElement('a');
        link.href = this.getUrl(image);
        link.download = image.filename;
        link.click();
    },

    /**
     * Copy image to clipboard
     */
    async copyToClipboard(image) {
        const response = await fetch(this.getUrl(image));
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
    }
};

export { API_BASE };