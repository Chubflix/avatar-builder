'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function CharacterFolderSelector() {
    const { state, dispatch, actions } = useApp();
    const [showPicker, setShowPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCharacters, setExpandedCharacters] = useState(new Set());

    // Load characters on mount
    useEffect(() => {
        loadCharacters();
    }, []);

    // Reload character images when changes
    useEffect(() => {
        if (state.selectedCharacter && !state.currentFolder) {
            const loadImages = async () => {
                try {
                    dispatch({ type: actions.SET_IMAGES, payload: [] });
                    dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

                    const url = `/api/images?character_id=${state.selectedCharacter.id}&limit=50`;
                    const response = await fetch(url);

                    if (response.ok) {
                        const data = await response.json();
                        let images = data.images || [];
                        let totalCount = data.total || 0;

                        dispatch({ type: actions.SET_IMAGES, payload: images });
                        dispatch({ type: actions.SET_TOTAL_IMAGES, payload: totalCount });
                        dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore || false });
                    }
                } catch (error) {
                    console.error('Error loading character images:', error);
                } finally {
                    dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
                }
            };
            loadImages();
        }
    }, [state.selectedCharacter, state.currentFolder, dispatch, actions]);

    const loadCharacters = async () => {
        try {
            const response = await fetch('/api/characters');
            if (!response.ok) throw new Error('Failed to load characters');

            const characters = await response.json();
            dispatch({ type: actions.SET_CHARACTERS, payload: characters });

            // Load folders for all characters
            await loadAllFolders(characters);
        } catch (error) {
            console.error('Error loading characters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAllFolders = async (characters) => {
        try {
            // Load folders for all characters at once
            const allFolders = [];
            for (const character of characters) {
                const response = await fetch(`/api/folders?character_id=${character.id}`);
                if (response.ok) {
                    const folders = await response.json();
                    allFolders.push(...folders);
                }
            }
            dispatch({ type: actions.SET_FOLDERS, payload: allFolders });
        } catch (error) {
            console.error('Error loading folders:', error);
        }
    };

    const handleSelectAllImages = () => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
        setShowPicker(false);

        // Load all images from all characters/folders
        loadAllImages();
    };

    const loadAllImages = async () => {
        try {
            dispatch({ type: actions.SET_IMAGES, payload: [] });
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

            const response = await fetch('/api/images?limit=50');
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: actions.SET_IMAGES, payload: data.images || [] });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: data.total || 0 });
                dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore || false });
            }
        } catch (error) {
            console.error('Error loading all images:', error);
        } finally {
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
        }
    };

    const handleSelectCharacter = async (character) => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
        setShowPicker(false);

        // Load images for this character (no specific folder)
        loadCharacterImages(character.id);
    };

    const loadCharacterImages = async (characterId) => {
        try {
            dispatch({ type: actions.SET_IMAGES, payload: [] });
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

            // Otherwise, only load unfiled images for this character
            let url;
            // Load unfiled images - we need a different approach
            // For now, just load character images without folders
            url = `/api/images?character_id=${characterId}&limit=50`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();

                // If not including subfolders, filter to only unfiled images
                let images = data.images || [];
                let totalCount = data.total || 0;

                dispatch({ type: actions.SET_IMAGES, payload: images });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: totalCount });
                dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore || false });
            }
        } catch (error) {
            console.error('Error loading character images:', error);
        } finally {
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
        }
    };

    const handleSelectFolder = async (folder, character) => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folder.id });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folder.id });
        setShowPicker(false);

        // Load images for this folder
        loadFolderImages(folder.id);
    };

    const loadFolderImages = async (folderId) => {
        try {
            dispatch({ type: actions.SET_IMAGES, payload: [] });
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

            const response = await fetch(`/api/images?folder_id=${folderId}&limit=50`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: actions.SET_IMAGES, payload: data.images || [] });
            }
        } catch (error) {
            console.error('Error loading folder images:', error);
        } finally {
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
        }
    };

    const toggleCharacterExpand = (characterId, e) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedCharacters);
        if (newExpanded.has(characterId)) {
            newExpanded.delete(characterId);
        } else {
            newExpanded.add(characterId);
        }
        setExpandedCharacters(newExpanded);
    };

    const handleCreateCharacter = () => {
        setShowPicker(false);
        dispatch({ type: actions.SET_EDITING_CHARACTER, payload: null });
        dispatch({ type: actions.SET_SHOW_CHARACTER_MODAL, payload: true });
    };

    const handleEditCharacter = (character, e) => {
        e.stopPropagation();
        setShowPicker(false);
        dispatch({ type: actions.SET_EDITING_CHARACTER, payload: character });
        dispatch({ type: actions.SET_SHOW_CHARACTER_MODAL, payload: true });
    };

    const handleCreateFolder = (character, e) => {
        e.stopPropagation();
        setShowPicker(false);
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
    };

    const handleEditFolder = (folder, character, e) => {
        e.stopPropagation();
        setShowPicker(false);
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: folder });
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
    };

    // Get display text for current selection
    const getDisplayText = () => {
        if (!state.selectedCharacter && !state.currentFolder) {
            return 'All Images';
        }
        if (state.currentFolder) {
            // currentFolder is an ID, look it up
            const folder = state.folders.find(f => f.id === state.currentFolder);
            if (folder) {
                const character = state.characters.find(c => c.id === folder.character_id);
                return character ? `${character.name} / ${folder.name}` : folder.name;
            }
            return 'Folder';
        }
        if (state.selectedCharacter) {
            return state.selectedCharacter.name;
        }
        return 'Select...';
    };

    // Get folders for a specific character
    const getFoldersForCharacter = (characterId) => {
        return state.folders.filter(f => f.character_id === characterId);
    };

    return (
        <>
            <div className="folder-nav">
                <div className="folder-picker-row">
                    <button
                        className={`btn-all-images ${!state.selectedCharacter && !state.currentFolder ? 'active' : ''}`}
                        onClick={handleSelectAllImages}
                        title="View all images from all characters"
                    >
                        <i className="fa fa-th"></i>
                        All
                    </button>
                    <button
                        className="folder-picker-btn"
                        onClick={() => setShowPicker(true)}
                    >
                        <i className="fa fa-folder"></i>
                        <span>{getDisplayText()}</span>
                        <i className="fa fa-chevron-down"></i>
                    </button>
                </div>
            </div>

            {showPicker && (
                <div className="folder-selector-overlay" onClick={() => setShowPicker(false)}>
                    <div className="folder-selector-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="folder-selector-header">
                            <h4>Select Location</h4>
                            <button onClick={() => setShowPicker(false)} className="close-btn">
                                <i className="fa fa-times"></i>
                            </button>
                        </div>

                        <div className="folder-selector-list">
                            {/* All Images Option */}
                            <button
                                className={`folder-selector-item ${
                                    !state.selectedCharacter && !state.currentFolder ? 'active' : ''
                                }`}
                                style={{ marginBottom: '10px' }}
                                onClick={handleSelectAllImages}
                            >
                                <i className="fa fa-th"></i>
                                <span>All Images</span>
                                {!state.selectedCharacter && !state.currentFolder && <i className="fa fa-check"></i>}
                            </button>

                            {/* Character List */}
                            {state.characters.length === 0 ? (
                                <div className="folder-selector-empty">
                                    <p>No characters yet</p>
                                    <button
                                        className="folder-selector-item folder-add-btn"
                                        onClick={handleCreateCharacter}
                                    >
                                        <i className="fa fa-plus-circle"></i>
                                        <span>Create Character</span>
                                    </button>
                                </div>
                            ) : (
                                state.characters.map((character) => {
                                    const folders = getFoldersForCharacter(character.id);
                                    const isExpanded = expandedCharacters.has(character.id);
                                    const isSelected = state.selectedCharacter?.id === character.id && !state.currentFolder;

                                    return (
                                        <div key={character.id} className="folder-selector-character-group">
                                            <div className="folder-selector-item-with-edit">
                                                <div className={`folder-selector-item character split ${isSelected ? 'active' : ''}`}>
                                                    {/* Left part: Expand/collapse - always visible for alignment */}
                                                    <button
                                                        className="character-expand-part"
                                                        onClick={(e) => {
                                                            if (folders.length > 0) {
                                                                e.stopPropagation();
                                                                toggleCharacterExpand(character.id, e);
                                                            }
                                                        }}
                                                        title={folders.length > 0 ? (isExpanded ? 'Collapse' : 'Expand') : ''}
                                                        style={{ cursor: folders.length > 0 ? 'pointer' : 'default' }}
                                                    >
                                                        {folders.length > 0 && (
                                                            <i className={`fa fa-caret-${isExpanded ? 'down' : 'right'}`}></i>
                                                        )}
                                                    </button>
                                                    {/* Right part: Select character */}
                                                    <button
                                                        className="character-select-part"
                                                        onClick={() => handleSelectCharacter(character)}
                                                    >
                                                        <i className="fa fa-user"></i>
                                                        <span>{character.name}</span>
                                                        {isSelected && <i className="fa fa-check"></i>}
                                                    </button>
                                                </div>
                                                <button
                                                    className="folder-add-btn-inline"
                                                    onClick={(e) => handleCreateFolder(character, e)}
                                                    title="Add folder to this character"
                                                >
                                                    <i className="fa fa-plus"></i>
                                                </button>
                                                <button
                                                    className="folder-edit-btn"
                                                    onClick={(e) => handleEditCharacter(character, e)}
                                                    title="Edit character"
                                                >
                                                    <i className="fa fa-pencil"></i>
                                                </button>
                                            </div>

                                            {/* Folders under this character */}
                                            {isExpanded && folders.length > 0 && (
                                                <div className="folder-selector-folders">
                                                    {folders.map((folder) => {
                                                        const isFolderSelected = state.currentFolder === folder.id;
                                                        return (
                                                            <div key={folder.id} className="folder-selector-item-with-edit">
                                                                <button
                                                                    className={`folder-selector-item folder ${isFolderSelected ? 'active' : ''}`}
                                                                    onClick={() => handleSelectFolder(folder, character)}
                                                                >
                                                                    <i className="fa fa-folder"></i>
                                                                    <span>{folder.name}</span>
                                                                    <span className="folder-count">{folder.image_count || 0}</span>
                                                                    {isFolderSelected && <i className="fa fa-check"></i>}
                                                                </button>
                                                                <button
                                                                    className="folder-edit-btn"
                                                                    onClick={(e) => handleEditFolder(folder, character, e)}
                                                                    title="Edit folder"
                                                                >
                                                                    <i className="fa fa-pencil"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Create Character Button */}
                            {state.characters.length > 0 && (
                                <>
                                    <div className="folder-selector-divider"></div>
                                    <button
                                        className="folder-selector-item folder-add-btn"
                                        onClick={handleCreateCharacter}
                                    >
                                        <i className="fa fa-plus-circle"></i>
                                        <span>Create New Character</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
