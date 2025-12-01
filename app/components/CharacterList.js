'use client';

import React, { useState, useEffect } from 'react';
import './CharacterList.css';

/**
 * CharacterList Component
 * Displays a list of characters in the left sidebar with ability to select and create
 */
export default function CharacterList({ selectedCharacterId, onSelectCharacter, onCreateCharacter, suppressAutoSelect = false }) {
    const [characters, setCharacters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newCharacterName, setNewCharacterName] = useState('');
    const [newCharacterDescription, setNewCharacterDescription] = useState('');
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch characters on mount
    useEffect(() => {
        fetchCharacters();
    }, []);

    const fetchCharacters = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/characters');
            if (!response.ok) {
                throw new Error('Failed to fetch characters');
            }
            const data = await response.json();
            setCharacters(data);
            // Auto-select first character if none selected and not suppressed
            if (!suppressAutoSelect && !selectedCharacterId && data.length > 0) {
                onSelectCharacter(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching characters:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // If auto-select was suppressed during initial load, perform it once suppression lifts
    useEffect(() => {
        if (!suppressAutoSelect && !selectedCharacterId && characters.length > 0) {
            onSelectCharacter(characters[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suppressAutoSelect]);

    const handleCreateCharacter = async () => {
        if (!newCharacterName.trim()) {
            alert('Please enter a character name');
            return;
        }

        try {
            setError(null);
            const response = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCharacterName.trim(),
                    description: newCharacterDescription.trim() || null,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create character');
            }

            const newCharacter = await response.json();
            setCharacters([newCharacter, ...characters]);
            setIsCreating(false);
            setNewCharacterName('');
            setNewCharacterDescription('');
            onSelectCharacter(newCharacter.id);
            if (onCreateCharacter) {
                onCreateCharacter(newCharacter);
            }
        } catch (err) {
            console.error('Error creating character:', err);
            setError(err.message);
        }
    };

    const handleCancelCreate = () => {
        setIsCreating(false);
        setNewCharacterName('');
        setNewCharacterDescription('');
        setError(null);
    };

    const handleUploadCharacterSheet = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
            setError('Invalid file type. Only .yaml or .yml files are supported.');
            return;
        }

        try {
            setIsUploading(true);
            setError(null);
            setUploadProgress('Uploading character sheet...');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/characters/upload-sheet', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Failed to upload character sheet');
            }

            const data = await response.json();
            setUploadProgress(`Successfully imported: ${data.character.name}`);

            // Refresh character list
            await fetchCharacters();

            // Select the newly created/updated character
            onSelectCharacter(data.character.characterId);
            if (onCreateCharacter) {
                onCreateCharacter({ id: data.character.characterId, name: data.character.name });
            }

            // Clear upload progress after 2 seconds
            setTimeout(() => {
                setUploadProgress(null);
                setIsUploading(false);
            }, 2000);

        } catch (err) {
            console.error('Error uploading character sheet:', err);
            setError(err.message);
            setIsUploading(false);
            setUploadProgress(null);
        }

        // Reset file input
        event.target.value = '';
    };

    if (isLoading) {
        return (
            <div className="character-list">
                <div className="character-list-header">
                    <h3>Characters</h3>
                </div>
                <div className="character-list-loading">
                    <div className="spinner"></div>
                    <p>Loading characters...</p>
                </div>
            </div>
        );
    }

    // Compute filtered list based on search term (case-insensitive)
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const filteredCharacters = (Array.isArray(characters) ? characters : []).filter((c) => {
        if (!normalizedQuery) return true;
        const name = (c?.name || '').toString().toLowerCase();
        return name.includes(normalizedQuery);
    });

    return (
        <div className="character-list">
            <div className="character-list-header">
                <h3>Characters</h3>
                {!isCreating && (
                    <div className="character-list-header-actions">
                        <button
                            className="character-list-add-btn"
                            onClick={() => setIsCreating(true)}
                            title="Create new character"
                        >
                            <i className="fa fa-plus"></i>
                        </button>
                        <label
                            className="character-list-upload-btn"
                            title="Upload character sheet (.yaml)"
                        >
                            <i className="fa fa-upload"></i>
                            <input
                                type="file"
                                accept=".yaml,.yml"
                                onChange={handleUploadCharacterSheet}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                )}
            </div>

            {error && (
                <div className="character-list-error">
                    <p>{error}</p>
                </div>
            )}

            {uploadProgress && (
                <div className="character-list-upload-progress">
                    {isUploading && <div className="spinner-small"></div>}
                    <p>{uploadProgress}</p>
                </div>
            )}

            {isCreating && (
                <div className="character-create-form">
                    <input
                        type="text"
                        className="character-create-input"
                        placeholder="Character name"
                        value={newCharacterName}
                        onChange={(e) => setNewCharacterName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateCharacter();
                            if (e.key === 'Escape') handleCancelCreate();
                        }}
                        autoFocus
                    />
                    <textarea
                        className="character-create-textarea"
                        placeholder="Description (optional)"
                        value={newCharacterDescription}
                        onChange={(e) => setNewCharacterDescription(e.target.value)}
                        rows={2}
                    />
                    <div className="character-create-actions">
                        <button
                            className="btn-create"
                            onClick={handleCreateCharacter}
                        >
                            Create
                        </button>
                        <button
                            className="btn-cancel"
                            onClick={handleCancelCreate}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Search field styled like folder-selector modal */}
            <div className="folder-selector-search character-list-search">
                <i className="fa fa-search" aria-hidden="true"></i>
                <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search characters"
                />
                {searchTerm && (
                    <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchTerm('')}
                        aria-label="Clear search"
                        title="Clear search"
                    >
                        <i className="fa fa-times" aria-hidden="true"></i>
                    </button>
                )}
            </div>

            <div className="character-list-items">
                {characters.length === 0 && !isCreating ? (
                    <div className="character-list-empty">
                        <p>No characters yet</p>
                        <p className="character-list-empty-hint">
                            Click the + button to create your first character
                        </p>
                    </div>
                ) : filteredCharacters.length === 0 ? (
                    <div className="character-list-empty">
                        <p>No matching characters</p>
                    </div>
                ) : (
                    filteredCharacters.sort((a, b) => a.name.localeCompare(b.name)).map((character) => (
                        <div
                            key={character.id}
                            className={`character-list-item ${selectedCharacterId === character.id ? 'active' : ''}`}
                            onClick={() => onSelectCharacter(character.id)}
                        >
                            <div className="character-list-item-icon">
                                {character.avatar_url ? (
                                    <img src={character.avatar_url} alt={character.name} />
                                ) : (
                                    <i className="fa fa-user"></i>
                                )}
                            </div>
                            <div className="character-list-item-content">
                                <div className="character-list-item-name">
                                    {character.name}
                                </div>
                                {character.description && (
                                    <div className="character-list-item-description">
                                        {character.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
