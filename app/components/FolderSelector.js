import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

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
    const { folders, selectedCharacter } = state;
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

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
        if (!selectedCharacter) {
            alert('Please select a character first');
            return;
        }
        setIsAddingFolder(true);
        setNewFolderName('');
    };

    const handleSaveNewFolder = () => {
        if (!selectedCharacter) {
            alert('Please select a character first');
            return;
        }
        if (newFolderName.trim()) {
            dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: newFolderName.trim() });
            dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
            dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
            handleClose();
        }
    };

    const handleCancelAddFolder = () => {
        setIsAddingFolder(false);
        setNewFolderName('');
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

                    {!selectedCharacter && (
                        <div className="folder-selector-empty">
                            Please select a character to view folders
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

                    {/* Flat folder list with search */}
                    {filteredFolders.length > 0 ? (
                        filteredFolders.map(folder => (
                            <button
                                key={folder.id}
                                className={`folder-selector-item ${currentFolderId === folder.id ? 'active' : ''}`}
                                onClick={() => handleSelect(folder.id)}
                            >
                                <i className="fa fa-folder"></i>
                                <span>{folder.name}</span>
                                <span className="folder-count">{folder.image_count || 0}</span>
                                {currentFolderId === folder.id && <i className="fa fa-check"></i>}
                            </button>
                        ))
                    ) : searchQuery ? (
                        <div className="folder-selector-empty">
                            <i className="fa fa-search"></i>
                            <p>No folders found matching "{searchQuery}"</p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default FolderSelector;
