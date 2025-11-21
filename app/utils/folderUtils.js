/**
 * Folder Hierarchy Utilities
 */

/**
 * Build a hierarchical folder tree from flat folder array
 * @param {Array} folders - Flat array of folders with parent_id
 * @returns {Array} - Hierarchical tree structure
 */
export function buildFolderTree(folders) {
    const folderMap = {};
    const roots = [];

    // First pass: create map
    folders.forEach(folder => {
        folderMap[folder.id] = { ...folder, children: [] };
    });

    // Second pass: build tree
    folders.forEach(folder => {
        if (folder.parent_id && folderMap[folder.parent_id]) {
            folderMap[folder.parent_id].children.push(folderMap[folder.id]);
        } else {
            roots.push(folderMap[folder.id]);
        }
    });

    return roots;
}

/**
 * Flatten folder tree for display with indentation
 * @param {Array} folders - Flat array of folders with parent_id
 * @returns {Array} - Flat array with depth information
 */
export function flattenFoldersWithDepth(folders) {
    const folderMap = {};
    const result = [];

    // Create map
    folders.forEach(folder => {
        folderMap[folder.id] = { ...folder, depth: 0 };
    });

    // Calculate depth
    const calculateDepth = (folderId, currentDepth = 0) => {
        const folder = folderMap[folderId];
        if (!folder) return;

        folder.depth = currentDepth;

        // Find children
        folders.forEach(f => {
            if (f.parent_id === folderId) {
                calculateDepth(f.id, currentDepth + 1);
            }
        });
    };

    // Calculate depth for root folders
    folders.forEach(folder => {
        if (!folder.parent_id) {
            calculateDepth(folder.id, 0);
        }
    });

    // Sort folders: parents before children, alphabetically within level
    const sortedFolders = [...folders].sort((a, b) => {
        const aData = folderMap[a.id];
        const bData = folderMap[b.id];

        // If same parent, sort by name
        if (a.parent_id === b.parent_id) {
            return a.name.localeCompare(b.name);
        }

        // If one is parent of the other, parent comes first
        if (isAncestor(a.id, b.id, folderMap)) return -1;
        if (isAncestor(b.id, a.id, folderMap)) return 1;

        // Otherwise sort by depth then name
        if (aData.depth !== bData.depth) {
            return aData.depth - bData.depth;
        }
        return a.name.localeCompare(b.name);
    });

    return sortedFolders.map(folder => folderMap[folder.id]);
}

/**
 * Check if folder A is an ancestor of folder B
 */
function isAncestor(ancestorId, folderId, folderMap) {
    let current = folderMap[folderId];
    while (current && current.parent_id) {
        if (current.parent_id === ancestorId) return true;
        current = folderMap[current.parent_id];
    }
    return false;
}

/**
 * Get folder path (breadcrumb)
 * @param {string} folderId
 * @param {Array} folders
 * @returns {Array} - Array of folder objects from root to current
 */
export function getFolderPath(folderId, folders) {
    const folderMap = {};
    folders.forEach(folder => {
        folderMap[folder.id] = folder;
    });

    const path = [];
    let current = folderMap[folderId];

    while (current) {
        path.unshift(current);
        current = current.parent_id ? folderMap[current.parent_id] : null;
    }

    return path;
}

/**
 * Get all descendant folder IDs
 * @param {string} folderId
 * @param {Array} folders
 * @returns {Array} - Array of descendant folder IDs
 */
export function getDescendantIds(folderId, folders) {
    const descendants = [];
    const findDescendants = (parentId) => {
        folders.forEach(folder => {
            if (folder.parent_id === parentId) {
                descendants.push(folder.id);
                findDescendants(folder.id);
            }
        });
    };

    findDescendants(folderId);
    return descendants;
}
