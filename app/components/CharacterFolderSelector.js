'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import LocationPicker from './LocationPicker';

export default function CharacterFolderSelector() {
    const { state, dispatch, actions } = useApp();
    const [showPicker, setShowPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'unfiled' | 'character' | 'folder'
    const [includeAllFolders, setIncludeAllFolders] = useState(false);

    // Load characters on mount
    useEffect(() => {
        loadCharacters();
    }, []);

    // Update viewMode when global state changes (e.g., from Save to Folder modal)
    useEffect(() => {
        if (state.currentFolder) {
            setViewMode('folder');
            setIncludeAllFolders(false);
        } else if (state.selectedCharacter) {
            setViewMode('character');
            // Check if we should show "All Folders" - this happens when character is selected but no specific folder
            // We can't easily detect this, so default to false
            setIncludeAllFolders(false);
        } else {
            // No character and no folder - could be "all" or "unfiled"
            // Default to "all" unless we know it should be unfiled
            setViewMode('all');
            setIncludeAllFolders(false);
        }
    }, [state.currentFolder, state.selectedCharacter]); // Watch for changes

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
        setViewMode('all');

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

    const handleSelectUnfiled = () => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
        setViewMode('unfiled');

        // Load only unfiled images
        loadUnfiledImages();
    };

    const loadUnfiledImages = async () => {
        try {
            dispatch({ type: actions.SET_IMAGES, payload: [] });
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

            // Use folder_id=unfiled to get only images without folder_id
            const response = await fetch('/api/images?folder_id=unfiled&limit=50');
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: actions.SET_IMAGES, payload: data.images || [] });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: data.total || 0 });
                dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore || false });
            }
        } catch (error) {
            console.error('Error loading unfiled images:', error);
        } finally {
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
        }
    };

    const handleSelectCharacter = async (characterId, includeSubfolders = false) => {
        const character = state.characters.find(c => c.id === characterId);
        if (character) {
            dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
            dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
            setViewMode('character');
            setIncludeAllFolders(includeSubfolders);

            // Load all images from all folders of this character
            loadCharacterImages(characterId);
        }
    };

    const loadCharacterImages = async (characterId) => {
        try {
            dispatch({ type: actions.SET_IMAGES, payload: [] });
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: true });

            // Load images from all folders belonging to this character
            const response = await fetch(`/api/images?character_id=${characterId}&limit=50`);
            if (response.ok) {
                const data = await response.json();

                dispatch({ type: actions.SET_IMAGES, payload: data.images || [] });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: data.total || 0 });
                dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore || false });
            }
        } catch (error) {
            console.error('Error loading character images:', error);
        } finally {
            dispatch({ type: actions.SET_LOADING_IMAGES, payload: false });
        }
    };

    const handleSelectFolder = async (folderId, characterId) => {
        const folder = state.folders.find(f => f.id === folderId);
        const character = state.characters.find(c => c.id === characterId);

        if (character) {
            dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        }
        if (folder) {
            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folder.id });
            dispatch({ type: actions.SET_SELECTED_FOLDER, payload: folder.id });
            setViewMode('folder');

            // Load images for this folder
            loadFolderImages(folder.id);
        }
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

    // Get display text for current selection
    const getDisplayText = () => {
        if (viewMode === 'unfiled') {
            return 'Unfiled';
        }
        if (viewMode === 'all') {
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
            return includeAllFolders
                ? `${state.selectedCharacter.name} (All Folders)`
                : state.selectedCharacter.name;
        }
        return 'Select...';
    };

    return (
        <>
            <div className="folder-nav">
                <div className="folder-picker-row">
                    <button
                        className={`btn-all-images ${viewMode === 'all' ? 'active' : ''}`}
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

            <LocationPicker
                show={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={(folderId, characterId, includeSubfolders) => {
                    if (folderId === 'all') {
                        // All Images selected
                        handleSelectAllImages();
                    } else if (folderId === null && characterId && includeSubfolders) {
                        // Character selected with all folders (clicked character header in folders view)
                        handleSelectCharacter(characterId, true);
                    } else if (folderId && characterId) {
                        // Folder selected
                        handleSelectFolder(folderId, characterId);
                    } else if (folderId === null && !characterId) {
                        // Unfiled selected - only show images without folders
                        handleSelectUnfiled();
                    }
                    setShowPicker(false);
                }}
                currentFolderId={state.currentFolder}
                currentCharacterId={state.selectedCharacter?.id}
                title="Select Location"
                mode="navigate"
                allowCharacterSelect={false}
            />
        </>
    );
}
