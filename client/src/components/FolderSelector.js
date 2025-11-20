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
    const { state } = useApp();
    const { folders } = state;
    const [searchQuery, setSearchQuery] = useState('');

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
        onClose();
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
                    {/* Unfiled Option */}
                    <button
                        className={`folder-selector-item ${!currentFolderId ? 'active' : ''}`}
                        onClick={() => handleSelect('')}
                    >
                        <i className="fa fa-folder-o"></i>
                        <span>Unfiled</span>
                        {!currentFolderId && <i className="fa fa-check"></i>}
                    </button>

                    {/* Filtered Folders */}
                    {filteredFolders.length > 0 ? (
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
                    )}
                </div>
            </div>
        </div>
    );
}

export default FolderSelector;
