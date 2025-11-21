import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { buildFolderTree } from '../utils/folderUtils';

/**
 * Reusable Folder Selector Component with Search
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the selector
 * @param {Function} props.onClose - Callback when closing
 * @param {Function} props.onSelect - Callback when folder is selected (folderId)
 * @param {string} props.currentFolderId - Currently selected folder ID
 * @param {string} props.title - Modal title (default: "Select Folder")
 */
function FolderSelector({ show, onClose, onSelect, currentFolderId, title = "Select Folder" }) {
    const { state, dispatch, actions } = useApp();
    const { folders, currentFolder } = state;
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    // Build folder tree
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

    // Filter folders based on search query
    const filteredFolders = useMemo(() => {
        if (!searchQuery.trim()) {
            return folders;
        }

        const query = searchQuery.toLowerCase();
        return folders.filter(folder =>
            folder.name.toLowerCase().includes(query)
        );
    }, [folders, searchQuery]);

    const handleSelect = (folderId) => {
        onSelect(folderId);
        setSearchQuery(''); // Reset search on select
    };

    const handleClose = () => {
        setSearchQuery(''); // Reset search on close
        setIsAddingFolder(false);
        setNewFolderName('');
        onClose();
    };

    const handleAddFolderClick = () => {
        setIsAddingFolder(true);
        setNewFolderName('');
    };

    const handleSaveNewFolder = () => {
        if (newFolderName.trim()) {
            // Open the folder modal with the new folder name
            // Set parent to current folder if one is selected
            const parentId = (currentFolder && currentFolder !== 'unfiled' && currentFolder !== null) ? currentFolder : null;
            dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: newFolderName.trim() });
            dispatch({ type: actions.SET_PARENT_FOLDER_ID, payload: parentId });
            dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
            dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
            handleClose();
        }
    };

    const handleCancelAddFolder = () => {
        setIsAddingFolder(false);
        setNewFolderName('');
    };

    const toggleFolder = (folderId) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    // Recursive function to render folder tree
    const renderFolderTree = (folderList, depth = 0) => {
        return folderList.map(folder => {
            const hasChildren = folder.children && folder.children.length > 0;
            const isExpanded = expandedFolders.has(folder.id);
            const isActive = currentFolderId === folder.id;
            // Add extra padding for nested folders without children to align with folders that have expand button
            const basePadding = depth * 1.5 + 1;
            const extraPadding = (!hasChildren && depth > 0) ? 1.75 : 0;
            const paddingLeft = `${basePadding + extraPadding}rem`;

            return (
                <React.Fragment key={folder.id}>
                    <button
                        className={`folder-selector-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelect(folder.id)}
                        style={{ paddingLeft }}
                    >
                        {hasChildren && (
                            <button
                                className="folder-expand-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFolder(folder.id);
                                }}
                            >
                                <i className={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                            </button>
                        )}
                        <i className="fa fa-folder"></i>
                        <span>{folder.name}</span>
                        <span className="folder-count">{folder.image_count}</span>
                        {isActive && <i className="fa fa-check"></i>}
                    </button>
                    {hasChildren && isExpanded && renderFolderTree(folder.children, depth + 1)}
                </React.Fragment>
            );
        });
    };

    if (!show) return null;

    return (
        <div className="folder-selector-overlay" onClick={handleClose}>
            <div className="folder-selector-modal" onClick={(e) => e.stopPropagation()}>
                <div className="folder-selector-header">
                    <h4>{title}</h4>
                    <button onClick={handleClose} className="close-btn">
                        <i className="fa fa-times"></i>
                    </button>
                </div>

                {/* Search Input */}
                <div className="folder-selector-search">
                    <i className="fa fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search folders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button 
                            className="clear-search-btn"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <i className="fa fa-times"></i>
                        </button>
                    )}
                </div>

                {/* Folder List */}
                <div className="folder-selector-list">
                    {/* Add Folder button/input at the top */}
                    {!isAddingFolder ? (
                        <button
                            className="folder-selector-item folder-add-btn"
                            onClick={handleAddFolderClick}
                        >
                            <i className="fa fa-plus-circle"></i>
                            <span>Add Folder</span>
                        </button>
                    ) : (
                        <div className="folder-add-input-row">
                            <input
                                type="text"
                                className="folder-add-input"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveNewFolder();
                                    if (e.key === 'Escape') handleCancelAddFolder();
                                }}
                                placeholder="Folder name..."
                                autoFocus
                            />
                            <button
                                className="folder-add-save-btn"
                                onClick={handleSaveNewFolder}
                                disabled={!newFolderName.trim()}
                                title="Save folder"
                            >
                                <i className="fa fa-check"></i>
                            </button>
                            <button
                                className="folder-add-cancel-btn"
                                onClick={handleCancelAddFolder}
                                title="Cancel"
                            >
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
                    )}
                    {/* Unfiled Option */}
                    <button
                        className={`folder-selector-item ${!currentFolderId ? 'active' : ''}`}
                        onClick={() => handleSelect('')}
                    >
                        <i className="fa fa-folder-o"></i>
                        <span>Unfiled</span>
                        {!currentFolderId && <i className="fa fa-check"></i>}
                    </button>

                    {/* Show hierarchical tree when no search, flat list when searching */}
                    {!searchQuery.trim() ? (
                        // Hierarchical tree view
                        renderFolderTree(folderTree)
                    ) : (
                        // Flat filtered list view
                        filteredFolders.length > 0 ? (
                            filteredFolders.map(folder => (
                                <button
                                    key={folder.id}
                                    className={`folder-selector-item ${currentFolderId === folder.id ? 'active' : ''}`}
                                    onClick={() => handleSelect(folder.id)}
                                >
                                    <i className="fa fa-folder"></i>
                                    <span>{folder.name}</span>
                                    <span className="folder-count">{folder.image_count}</span>
                                    {currentFolderId === folder.id && <i className="fa fa-check"></i>}
                                </button>
                            ))
                        ) : (
                            <div className="folder-selector-empty">
                                <i className="fa fa-search"></i>
                                <p>No folders found matching "{searchQuery}"</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default FolderSelector;
