'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './CharacterModal.css';

export default function CharacterModal() {
    const { state, dispatch, actions } = useApp();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Populate fields when editing
    useEffect(() => {
        if (state.editingCharacter) {
            setName(state.editingCharacter.name || '');
            setDescription(state.editingCharacter.description || '');
        } else {
            setName('');
            setDescription('');
        }
        setError(null);
    }, [state.editingCharacter]);

    const handleClose = () => {
        dispatch({ type: actions.SET_SHOW_CHARACTER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_CHARACTER, payload: null });
        setName('');
        setDescription('');
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Character name is required');
            return;
        }

        setIsSubmitting(true);

        try {
            const url = state.editingCharacter
                ? `/api/characters/${state.editingCharacter.id}`
                : '/api/characters';

            const method = state.editingCharacter ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save character');
            }

            const savedCharacter = await response.json();

            // Refresh characters list
            const listResponse = await fetch('/api/characters');
            const characters = await listResponse.json();
            dispatch({ type: actions.SET_CHARACTERS, payload: characters });

            // If creating new, select it
            if (!state.editingCharacter) {
                dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: savedCharacter });
            }

            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!state.editingCharacter) return;

        const confirmed = confirm(
            `Are you sure you want to delete "${state.editingCharacter.name}"? This will also delete all folders and images associated with this character.`
        );

        if (!confirmed) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/characters/${state.editingCharacter.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete character');
            }

            // Refresh characters list
            const listResponse = await fetch('/api/characters');
            const characters = await listResponse.json();
            dispatch({ type: actions.SET_CHARACTERS, payload: characters });

            // If deleted character was selected, clear selection
            if (state.selectedCharacter?.id === state.editingCharacter.id) {
                dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
                dispatch({ type: actions.SET_FOLDERS, payload: [] });
                dispatch({ type: actions.SET_IMAGES, payload: [] });
            }

            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!state.showCharacterModal) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content character-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{state.editingCharacter ? 'Edit Character' : 'Create Character'}</h2>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="character-name">Name *</label>
                        <input
                            id="character-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter character name"
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="character-description">Description</label>
                        <textarea
                            id="character-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        {state.editingCharacter && (
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                Delete
                            </button>
                        )}
                        <div className="modal-actions-right">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
