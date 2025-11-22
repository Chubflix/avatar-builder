import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { folderAPI } from '../utils/backend-api';

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
    const { folders, selectedCharacter: globalSelectedCharacter, characters, currentFolder } = state;
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [modalSelectedCharacter, setModalSelectedCharacter] = useState(null);
    const [showCharacterSelector, setShowCharacterSelector] = useState(false);
    const [characterSearchQuery, setCharacterSearchQuery] = useState('');
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);
    const [newCharacterName, setNewCharacterName] = useState('');

    // Update modal selected character when global selection changes or modal opens
    useEffect(() => {
        if (show) {
            // Try to get character from global selection first
            let characterToSelect = globalSelectedCharacter;

            // If no character selected but we have a current folder, derive character from it
            if (!characterToSelect && currentFolder) {
                const folder = folders.find(f => f.id === currentFolder);
                if (folder && folder.character_id) {
                    characterToSelect = characters.find(c => c.id === folder.character_id);
                }
            }

            setModalSelectedCharacter(characterToSelect || null);
        }
    }, [show, globalSelectedCharacter, currentFolder, folders, characters]);

    // Filter characters based on search query
    const filteredCharacters = useMemo(() => {
        if (!characterSearchQuery.trim()) {
            return characters;
        }
        const query = characterSearchQuery.toLowerCase();
        return characters.filter(char =>
            char.name.toLowerCase().includes(query)
        );
    }, [characters, characterSearchQuery]);

    // Filter folders based on modal selected character and search query
    const filteredFolders = useMemo(() => {
        // First filter by character
        let filtered = folders;
        if (modalSelectedCharacter) {
            filtered = folders.filter(f => f.character_id === modalSelectedCharacter.id);
        }

        // Then filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(folder =>
                folder.name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [folders, modalSelectedCharacter, searchQuery]);

    const handleSelect = (folderId) => {
        onSelect(folderId);
        setSearchQuery(''); // Reset search on select
    };

    const handleClose = () => {
        setSearchQuery(''); // Reset search on close
        setCharacterSearchQuery('');
        setShowCharacterSelector(false);
        setIsAddingFolder(false);
        setNewFolderName('');
        onClose();
    };

    const handleSelectCharacter = (character) => {
        setModalSelectedCharacter(character);
        setShowCharacterSelector(false);
        setCharacterSearchQuery('');
    };

    const handleAddCharacterClick = () => {
        setIsAddingCharacter(true);
        setNewCharacterName('');
    };

    const handleSaveNewCharacter = async () => {
        if (newCharacterName.trim()) {
            try {
                // Create character directly via API
                const response = await fetch('/api/characters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newCharacterName.trim() })
                });

                if (!response.ok) throw new Error('Failed to create character');

                const newCharacter = await response.json();

                // Reload characters
                const charactersResponse = await fetch('/api/characters');
                if (charactersResponse.ok) {
                    const updatedCharacters = await charactersResponse.json();
                    dispatch({ type: actions.SET_CHARACTERS, payload: updatedCharacters });
                }

                // Select the new character
                setModalSelectedCharacter(newCharacter);

                // Reset add character state
                setIsAddingCharacter(false);
                setNewCharacterName('');

                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'success', message: 'Character created successfully' }
                });
            } catch (error) {
                console.error('Failed to create character:', error);
                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'error', message: 'Failed to create character' }
                });
            }
        }
    };

    const handleCancelAddCharacter = () => {
        setIsAddingCharacter(false);
        setNewCharacterName('');
    };

    const handleAddFolderClick = () => {
        if (!modalSelectedCharacter) {
            alert('Please select a character first');
            return;
        }
        setIsAddingFolder(true);
        setNewFolderName('');
    };

    const handleSaveNewFolder = async () => {
        if (!modalSelectedCharacter) {
            alert('Please select a character first');
            return;
        }
        if (newFolderName.trim()) {
            try {
                // Create folder directly via API
                await folderAPI.create({
                    name: newFolderName.trim(),
                    character_id: modalSelectedCharacter.id
                });

                // Reload folders
                const updatedFolders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: updatedFolders });

                // Reset add folder state
                setIsAddingFolder(false);
                setNewFolderName('');

                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'success', message: 'Folder created successfully' }
                });
            } catch (error) {
                console.error('Failed to create folder:', error);
                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'error', message: 'Failed to create folder' }
                });
            }
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

                {/* Character Selector */}
                <div className="folder-selector-character-select">
                    <label className="form-label">Character</label>
                    <button
                        className="folder-select-display-btn"
                        onClick={() => setShowCharacterSelector(!showCharacterSelector)}
                        type="button"
                    >
                        <i className="fa fa-user"></i>
                        <span>
                            {modalSelectedCharacter?.name || 'Select character...'}
                        </span>
                        <i className={`fa fa-chevron-${showCharacterSelector ? 'up' : 'down'}`}></i>
                    </button>

                    {showCharacterSelector && (
                        <div className="character-selector-dropdown">
                            {/* Character Search */}
                            <div className="character-search">
                                <i className="fa fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Search characters..."
                                    value={characterSearchQuery}
                                    onChange={(e) => setCharacterSearchQuery(e.target.value)}
                                />
                                {characterSearchQuery && (
                                    <button
                                        className="clear-search-btn"
                                        onClick={() => setCharacterSearchQuery('')}
                                        title="Clear search"
                                    >
                                        <i className="fa fa-times"></i>
                                    </button>
                                )}
                            </div>

                            {/* Character List */}
                            <div className="character-selector-list">
                                {/* Add Character Button/Input */}
                                {!isAddingCharacter ? (
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
                                            value={newCharacterName}
                                            onChange={(e) => setNewCharacterName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveNewCharacter();
                                                if (e.key === 'Escape') handleCancelAddCharacter();
                                            }}
                                            placeholder="Character name..."
                                            autoFocus
                                        />
                                        <button
                                            className="folder-add-save-btn"
                                            onClick={handleSaveNewCharacter}
                                            disabled={!newCharacterName.trim()}
                                            title="Save character"
                                        >
                                            <i className="fa fa-check"></i>
                                        </button>
                                        <button
                                            className="folder-add-cancel-btn"
                                            onClick={handleCancelAddCharacter}
                                            title="Cancel"
                                        >
                                            <i className="fa fa-times"></i>
                                        </button>
                                    </div>
                                )}

                                {/* Character Items */}
                                {filteredCharacters.length > 0 ? (
                                    filteredCharacters.map(char => (
                                        <button
                                            key={char.id}
                                            className={`folder-selector-item ${modalSelectedCharacter?.id === char.id ? 'active' : ''}`}
                                            onClick={() => handleSelectCharacter(char)}
                                        >
                                            <i className="fa fa-user"></i>
                                            <span>{char.name}</span>
                                            {modalSelectedCharacter?.id === char.id && <i className="fa fa-check"></i>}
                                        </button>
                                    ))
                                ) : characterSearchQuery ? (
                                    <div className="folder-selector-empty">
                                        <i className="fa fa-search"></i>
                                        <p>No characters found matching "{characterSearchQuery}"</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Input */}
                <div className="folder-selector-search">
                    <i className="fa fa-search"></i>
                    <input
                        type="text"
                        placeholder="Search folders..."
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

                    {!modalSelectedCharacter && (
                        <>
                            <div className="folder-selector-empty">
                                Please select a character to view folders
                            </div>

                            {/* Unfiled Option */}
                            <button
                                className={`folder-selector-item ${!currentFolderId ? 'active' : ''}`}
                                onClick={() => handleSelect(null)}
                            >
                                <i className="fa fa-folder-o"></i>
                                <span>Unfiled</span>
                                {!currentFolderId && <i className="fa fa-check"></i>}
                            </button>
                        </>
                    )}

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
