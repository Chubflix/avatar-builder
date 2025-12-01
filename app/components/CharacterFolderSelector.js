'use client';

import React, {useCallback, useEffect, useState} from 'react';
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
            setIncludeAllFolders(true);
        } else if (state.selectedFolder === 'unfiled') {
            // Viewing unfiled images
            setViewMode('unfiled');
            setIncludeAllFolders(false);
        } else {
            // No character and no folder - viewing all images
            setViewMode('all');
            setIncludeAllFolders(false);
        }
    }, [state.currentFolder, state.selectedCharacter, state.selectedFolder]); // Watch for changes

    const folderUp = useCallback(() => {
        if (state.currentFolder) {
            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
            dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
        } else if (state.selectedCharacter) {
            dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
        }
    }, [state.currentFolder, state.selectedCharacter]);

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
    };

    const handleSelectUnfiled = () => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: 'unfiled' });
        setViewMode('unfiled');
    };


    const handleSelectCharacter = async (characterId, includeSubfolders = false) => {
        const character = state.characters.find(c => c.id === characterId);
        if (character) {
            dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
            dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
            setViewMode('character');
            setIncludeAllFolders(includeSubfolders);
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
        } else {
            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
            dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
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
            return 'Unfiled';
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
                        className={`btn-all-images`}
                        disabled={state.selectedCharacter === null || isLoading}
                        onClick={folderUp}
                        title="Folder Up"
                    >
                        <i className="fa fa-level-up"></i>
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
                currentFolderId={state.selectedFolder === 'unfiled' ? 'unfiled' : state.currentFolder}
                currentCharacterId={state.selectedCharacter?.id}
                title="Select Location"
                mode="navigate"
                allowCharacterSelect={false}
            />
        </>
    );
}
