'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import './CharacterSelector.css';

export default function CharacterSelector() {
    const { state, dispatch, actions } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load characters on mount
    useEffect(() => {
        loadCharacters();
    }, []);

    const loadCharacters = async () => {
        try {
            const response = await fetch('/api/characters');
            if (!response.ok) throw new Error('Failed to load characters');

            const characters = await response.json();
            dispatch({ type: actions.SET_CHARACTERS, payload: characters });

            // Auto-select first character if none selected
            if (!state.selectedCharacter && characters.length > 0) {
                handleSelectCharacter(characters[0]);
            }
        } catch (error) {
            console.error('Error loading characters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCharacter = async (character) => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        setIsOpen(false);

        // Load folders for this character
        try {
            const response = await fetch(`/api/folders?character_id=${character.id}`);
            if (response.ok) {
                const folders = await response.json();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            }
        } catch (error) {
            console.error('Error loading folders:', error);
        }

        // Clear current folder and images
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
        dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
        dispatch({ type: actions.SET_IMAGES, payload: [] });
    };

    const handleCreateCharacter = () => {
        setIsOpen(false);
        dispatch({ type: actions.SET_EDITING_CHARACTER, payload: null });
        dispatch({ type: actions.SET_SHOW_CHARACTER_MODAL, payload: true });
    };

    const handleEditCharacter = (character, e) => {
        e.stopPropagation();
        setIsOpen(false);
        dispatch({ type: actions.SET_EDITING_CHARACTER, payload: character });
        dispatch({ type: actions.SET_SHOW_CHARACTER_MODAL, payload: true });
    };

    if (isLoading) {
        return (
            <div className="character-selector loading">
                <div className="character-selector-button">
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="character-selector">
            <button
                className="character-selector-button"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="character-icon">👤</span>
                <span className="character-name">
                    {state.selectedCharacter?.name || 'Select Character'}
                </span>
                <span className="dropdown-arrow">{isOpen ? '▴' : '▾'}</span>
            </button>

            {isOpen && (
                <>
                    <div className="character-selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="character-selector-dropdown">
                        {state.characters.length === 0 ? (
                            <div className="character-selector-empty">
                                No characters yet
                            </div>
                        ) : (
                            <div className="character-selector-list">
                                {state.characters.map((character) => (
                                    <div
                                        key={character.id}
                                        className={`character-selector-item ${
                                            state.selectedCharacter?.id === character.id ? 'active' : ''
                                        }`}
                                        onClick={() => handleSelectCharacter(character)}
                                    >
                                        <div className="character-selector-item-info">
                                            <div className="character-selector-item-name">
                                                {character.name}
                                            </div>
                                            {character.description && (
                                                <div className="character-selector-item-desc">
                                                    {character.description}
                                                </div>
                                            )}
                                            <div className="character-selector-item-stats">
                                                {character.folder_count || 0} folders
                                            </div>
                                        </div>
                                        <button
                                            className="character-selector-item-edit"
                                            onClick={(e) => handleEditCharacter(character, e)}
                                            title="Edit character"
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="character-selector-divider" />
                        <button
                            className="character-selector-create"
                            onClick={handleCreateCharacter}
                        >
                            <span className="plus-icon">+</span>
                            Create New Character
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
