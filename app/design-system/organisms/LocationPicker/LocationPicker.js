import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/app/context/AppContext';
import { folderAPI } from '@/app/utils/backend-api';
import './LocationPicker.css';

/**
 * Unified Location Picker - Hierarchical file-system style navigator
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the picker
 * @param {Function} props.onClose - Callback when closing
 * @param {Function} props.onSelect - Callback when location is selected (folderId, characterId, includeSubfolders)
 * @param {string} props.currentFolderId - Currently selected folder ID
 * @param {string} props.currentCharacterId - Currently selected character ID
 * @param {string} props.title - Modal title
 * @param {string} props.mode - 'save' | 'move' | 'select' | 'navigate' (determines behavior)
 * @param {boolean} props.allowCharacterSelect - If true, clicking a character selects it instead of navigating
 */
function LocationPicker({
    show,
    onClose,
    onSelect,
    currentFolderId,
    currentCharacterId,
    title = "Select Location",
    mode = 'select',
    allowCharacterSelect = false
}) {
    const { state, dispatch, actions } = useApp();
    const { folders, characters } = state;

    // Navigation state - Initialize based on current selection
    const getInitialView = () => {
        if (currentCharacterId && characters.length > 0) {
            return 'folders';
        }
        return 'characters';
    };

    const getInitialCharacter = () => {
        if (currentCharacterId && characters.length > 0) {
            return characters.find(c => c.id === currentCharacterId) || null;
        }
        return null;
    };

    const [view, setView] = useState(getInitialView);
    const [selectedCharacter, setSelectedCharacter] = useState(getInitialCharacter);

    // Update view and selected character when modal opens or selection changes
    useEffect(() => {
        if (show && characters.length > 0) {
            // Start in folders view if a character is selected (with or without a folder)
            if (currentCharacterId) {
                const char = characters.find(c => c.id === currentCharacterId);
                if (char) {
                    setSelectedCharacter(char);
                    setView('folders');
                    setSearchQuery('');
                    setIsAdding(false);
                    setEditingItem(null);
                    return;
                }
            }
            // Default: start in characters view
            setView('characters');
            setSelectedCharacter(null);
            setSearchQuery('');
            setIsAdding(false);
            setEditingItem(null);
        }
    }, [show, currentCharacterId, currentFolderId, characters]);
    const [searchQuery, setSearchQuery] = useState('');

    // Add/Edit state
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState(null); // {type: 'character'|'folder', id, name}

    // Filtered characters for search
    const filteredCharacters = useMemo(() => {
        if (!searchQuery.trim()) return characters;
        const query = searchQuery.toLowerCase();
        return characters.filter(char => char.name.toLowerCase().includes(query));
    }, [characters, searchQuery]);

    // Filtered folders for selected character
    const filteredFolders = useMemo(() => {
        if (!selectedCharacter) return [];

        let filtered = folders.filter(f => f.character_id === selectedCharacter.id);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f => f.name.toLowerCase().includes(query));
        }

        return filtered;
    }, [folders, selectedCharacter, searchQuery]);

    // Handlers
    const handleClose = () => {
        setSearchQuery('');
        setIsAdding(false);
        setEditingItem(null);
        onClose();
    };

    const handleSelectCharacter = (character, includeSubfolders = false) => {
        // In navigate mode, navigate into folders view
        setSelectedCharacter(character);
        setView('folders');
        setSearchQuery('');
    };

    const handleBackToCharacters = () => {
        setView('characters');
        setSelectedCharacter(null);
        setSearchQuery('');
    };

    const handleSelect = (folderId, characterId = null, includeSubfolders = false) => {
        onSelect(folderId, characterId, includeSubfolders);
        handleClose();
    };

    // Add Character
    const handleAddCharacterClick = () => {
        setIsAdding(true);
        setNewItemName('');
    };

    const handleSaveNewCharacter = async () => {
        if (!newItemName.trim()) return;

        try {
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newItemName.trim() })
            });

            if (!response.ok) throw new Error('Failed to create character');

            const newCharacter = await response.json();

            // Reload characters
            const charactersResponse = await fetch('/api/characters');
            if (charactersResponse.ok) {
                const updatedCharacters = await charactersResponse.json();
                dispatch({ type: actions.SET_CHARACTERS, payload: updatedCharacters });
            }

            setIsAdding(false);
            setNewItemName('');

            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: 'Character created' }
            });
        } catch (error) {
            console.error('Failed to create character:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to create character' }
            });
        }
    };

    // Add Folder
    const handleAddFolderClick = () => {
        setIsAdding(true);
        setNewItemName('');
    };

    const handleSaveNewFolder = async () => {
        if (!newItemName.trim() || !selectedCharacter) return;

        try {
            await folderAPI.create({
                name: newItemName.trim(),
                character_id: selectedCharacter.id
            });

            // Reload folders
            const updatedFolders = await folderAPI.getAll();
            dispatch({ type: actions.SET_FOLDERS, payload: updatedFolders });

            setIsAdding(false);
            setNewItemName('');

            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: 'Folder created' }
            });
        } catch (error) {
            console.error('Failed to create folder:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to create folder' }
            });
        }
    };

    const handleCancelAdd = () => {
        setIsAdding(false);
        setNewItemName('');
    };

    // Edit handlers
    const handleStartEdit = (type, item) => {
        setEditingItem({ type, id: item.id, name: item.name });
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !editingItem.name.trim()) return;

        try {
            if (editingItem.type === 'character') {
                const response = await fetch(`/api/characters/${editingItem.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editingItem.name.trim() })
                });

                if (!response.ok) throw new Error('Failed to update character');

                // Reload characters
                const charactersResponse = await fetch('/api/characters');
                if (charactersResponse.ok) {
                    const updatedCharacters = await charactersResponse.json();
                    dispatch({ type: actions.SET_CHARACTERS, payload: updatedCharacters });
                }
            } else if (editingItem.type === 'folder') {
                await folderAPI.update(editingItem.id, { name: editingItem.name.trim() });

                // Reload folders
                const updatedFolders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: updatedFolders });
            }

            setEditingItem(null);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `${editingItem.type === 'character' ? 'Character' : 'Folder'} updated` }
            });
        } catch (error) {
            console.error('Failed to update:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to update' }
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleDelete = async (type, item) => {
        const itemType = type === 'character' ? 'character' : 'folder';
        if (!window.confirm(`Delete ${itemType} "${item.name}"?`)) return;

        try {
            if (type === 'character') {
                const response = await fetch(`/api/characters/${item.id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Failed to delete character');

                // Reload characters
                const charactersResponse = await fetch('/api/characters');
                if (charactersResponse.ok) {
                    const updatedCharacters = await charactersResponse.json();
                    dispatch({ type: actions.SET_CHARACTERS, payload: updatedCharacters });
                }

                // If we deleted the currently selected character, go back
                if (selectedCharacter?.id === item.id) {
                    handleBackToCharacters();
                }
            } else if (type === 'folder') {
                await folderAPI.delete(item.id);

                // Reload folders
                const updatedFolders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: updatedFolders });
            }

            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `${itemType === 'character' ? 'Character' : 'Folder'} deleted` }
            });
        } catch (error) {
            console.error('Failed to delete:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to delete' }
            });
        }
    };

    if (!show) return null;


    const modalContent = (
        <div className="folder-selector-overlay" onClick={handleClose}>
            <div className="folder-selector-modal location-picker" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="folder-selector-header">
                    <h4>{title}</h4>
                    <button onClick={handleClose} className="close-btn">
                        <i className="fa fa-times"></i>
                    </button>
                </div>

                {/* Search */}
                <div className="folder-selector-search">
                    <i className="fa fa-search"></i>
                    <input
                        type="text"
                        placeholder={view === 'characters' ? 'Search characters...' : 'Search folders...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Content */}
                <div className="folder-selector-list">
                    {view === 'characters' ? (
                        <>
                            {/* Characters View */}
                            {mode === 'select' && (
                                <button
                                    className="folder-selector-item location-special"
                                    onClick={() => handleSelect('all')}
                                >
                                    <i className="fa fa-th"></i>
                                    <span>All Images</span>
                                </button>
                            )}

                            <button
                                className={`folder-selector-item location-special ${currentFolderId === 'unfiled' && !currentCharacterId ? 'active' : ''}`}
                                onClick={() => handleSelect(null)}
                            >
                                <i className="fa fa-folder-o"></i>
                                <span>Unfiled</span>
                            </button>

                            <div className="location-divider"></div>

                            {/* Add Character */}
                            {!isAdding ? (
                                <button
                                    className="folder-selector-item folder-add-btn"
                                    onClick={handleAddCharacterClick}
                                >
                                    <i className="fa fa-plus-circle"></i>
                                    <span>Add Character</span>
                                </button>
                            ) : (
                                <div className="folder-add-input-row">
                                    <input
                                        type="text"
                                        className="folder-add-input"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNewCharacter();
                                            if (e.key === 'Escape') handleCancelAdd();
                                        }}
                                        placeholder="Character name..."
                                        autoFocus
                                    />
                                    <button
                                        className="folder-add-save-btn"
                                        onClick={handleSaveNewCharacter}
                                        disabled={!newItemName.trim()}
                                        title="Save"
                                    >
                                        <i className="fa fa-check"></i>
                                    </button>
                                    <button
                                        className="folder-add-cancel-btn"
                                        onClick={handleCancelAdd}
                                        title="Cancel"
                                    >
                                        <i className="fa fa-times"></i>
                                    </button>
                                </div>
                            )}

                            <div className="location-divider"></div>

                            {/* Character List */}
                            {filteredCharacters.length > 0 ? (
                                filteredCharacters.map(char => (
                                    editingItem?.type === 'character' && editingItem.id === char.id ? (
                                        <div key={char.id} className="folder-add-input-row">
                                            <input
                                                type="text"
                                                className="folder-add-input"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                className="folder-add-save-btn"
                                                onClick={handleSaveEdit}
                                                disabled={!editingItem.name.trim()}
                                                title="Save"
                                            >
                                                <i className="fa fa-check"></i>
                                            </button>
                                            <button
                                                className="folder-add-cancel-btn"
                                                onClick={handleCancelEdit}
                                                title="Cancel"
                                            >
                                                <i className="fa fa-times"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            key={char.id}
                                            className={`folder-selector-item location-item-with-actions ${currentCharacterId === char.id && !currentFolderId ? 'active' : ''}`}
                                            onClick={() => handleSelectCharacter(char)}
                                        >
                                            <i className="fa fa-user"></i>
                                            <span>{char.name}</span>
                                            <div className="location-item-actions">
                                                <button
                                                    className="location-edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEdit('character', char);
                                                    }}
                                                    title="Edit character"
                                                >
                                                    <i className="fa fa-pencil"></i>
                                                </button>
                                                <button
                                                    className="location-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete('character', char);
                                                    }}
                                                    title="Delete character"
                                                >
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            </div>
                                            {currentCharacterId === char.id && !currentFolderId && <i className="fa fa-check check-icon"></i>}
                                        </button>
                                    )
                                ))
                            ) : searchQuery ? (
                                <div className="folder-selector-empty">
                                    <i className="fa fa-search"></i>
                                    <p>No characters found</p>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {/* Folders View */}

                            {/* Character Header / Editing - Below search */}
                            {selectedCharacter && (
                                editingItem?.type === 'character' && editingItem.id === selectedCharacter.id ? (
                                    <div className="location-edit-header">
                                        <input
                                            type="text"
                                            className="location-edit-input"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            autoFocus
                                        />
                                        <button className="location-edit-save-btn" onClick={handleSaveEdit} title="Save">
                                            <i className="fa fa-check"></i>
                                        </button>
                                        <button className="location-edit-cancel-btn" onClick={handleCancelEdit} title="Cancel">
                                            <i className="fa fa-times"></i>
                                        </button>
                                    </div>
                                ) : mode === 'navigate' ? (
                                    // In navigate mode, make character header clickable to select all folders
                                    <div className="location-character-header-wrapper">
                                        <button
                                            className="location-character-header location-character-header-clickable"
                                            onClick={() => handleSelect(null, selectedCharacter.id, true)}
                                        >
                                            <i className="fa fa-user"></i>
                                            <span>{selectedCharacter.name}</span>
                                        </button>
                                        <button
                                            className="location-header-edit-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit('character', selectedCharacter);
                                            }}
                                            title="Edit character"
                                        >
                                            <i className="fa fa-pencil"></i>
                                        </button>
                                    </div>
                                ) : (
                                    // In save/move mode, character header is not clickable
                                    <div className="location-character-header">
                                        <i className="fa fa-user"></i>
                                        <span>{selectedCharacter.name}</span>
                                        <button
                                            className="location-header-edit-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit('character', selectedCharacter);
                                            }}
                                            title="Edit character"
                                        >
                                            <i className="fa fa-pencil"></i>
                                        </button>
                                    </div>
                                )
                            )}

                            <div className="location-divider"></div>

                            {/* Back to Characters */}
                            <button
                                className="folder-selector-item location-back-btn"
                                onClick={handleBackToCharacters}
                            >
                                <i className="fa fa-level-up"></i>
                                <span>..</span>
                            </button>

                            {/* Add Folder */}
                            {!isAdding ? (
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
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNewFolder();
                                            if (e.key === 'Escape') handleCancelAdd();
                                        }}
                                        placeholder="Folder name..."
                                        autoFocus
                                    />
                                    <button
                                        className="folder-add-save-btn"
                                        onClick={handleSaveNewFolder}
                                        disabled={!newItemName.trim()}
                                        title="Save"
                                    >
                                        <i className="fa fa-check"></i>
                                    </button>
                                    <button
                                        className="folder-add-cancel-btn"
                                        onClick={handleCancelAdd}
                                        title="Cancel"
                                    >
                                        <i className="fa fa-times"></i>
                                    </button>
                                </div>
                            )}

                            <div className="location-divider"></div>

                            {/* Folder List */}
                            {filteredFolders.length > 0 ? (
                                filteredFolders.map(folder => (
                                    editingItem?.type === 'folder' && editingItem.id === folder.id ? (
                                        <div key={folder.id} className="folder-add-input-row">
                                            <input
                                                type="text"
                                                className="folder-add-input"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                className="folder-add-save-btn"
                                                onClick={handleSaveEdit}
                                                disabled={!editingItem.name.trim()}
                                                title="Save"
                                            >
                                                <i className="fa fa-check"></i>
                                            </button>
                                            <button
                                                className="folder-add-cancel-btn"
                                                onClick={handleCancelEdit}
                                                title="Cancel"
                                            >
                                                <i className="fa fa-times"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            key={folder.id}
                                            className={`folder-selector-item location-item-with-actions ${currentFolderId === folder.id ? 'active' : ''}`}
                                            onClick={() => handleSelect(folder.id, selectedCharacter?.id)}
                                        >
                                            <i className="fa fa-folder"></i>
                                            <span>{folder.name}</span>
                                            <span className="folder-count">{folder.image_count || 0}</span>
                                            <div className="location-item-actions">
                                                <button
                                                    className="location-edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEdit('folder', folder);
                                                    }}
                                                    title="Edit folder"
                                                >
                                                    <i className="fa fa-pencil"></i>
                                                </button>
                                                <button
                                                    className="location-delete-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete('folder', folder);
                                                    }}
                                                    title="Delete folder"
                                                >
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            </div>
                                            {currentFolderId === folder.id && <i className="fa fa-check check-icon"></i>}
                                        </button>
                                    )
                                ))
                            ) : searchQuery ? (
                                <div className="folder-selector-empty">
                                    <i className="fa fa-search"></i>
                                    <p>No folders found</p>
                                </div>
                            ) : (
                                <div className="folder-selector-empty">
                                    <p>No folders yet</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    // Render to document.body using portal to escape parent stacking contexts
    return typeof window !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}

export { LocationPicker };
export default LocationPicker;
