'use client';

import React from 'react';
import { useApp } from '../context/AppContext';

function FolderModal({ onSave, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { showFolderModal, editingFolder, newFolderName, selectedCharacter } = state;

    if (!showFolderModal) return null;

    const handleClose = () => {
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: '' });
    };

    const handleSave = () => {
        // Ensure character is selected when creating new folder
        if (!editingFolder && !selectedCharacter) {
            alert('Please select a character first');
            return;
        }
        onSave(editingFolder?.id, newFolderName, selectedCharacter?.id);
    };

    const handleDelete = () => {
        if (editingFolder) {
            onDelete(editingFolder.id);
            handleClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>{editingFolder ? 'Edit Folder' : 'Create Folder'}</h3>

                {!editingFolder && !selectedCharacter && (
                    <div className="warning-message" style={{
                        padding: '0.75rem',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '6px',
                        color: '#ffc107',
                        fontSize: '0.9rem',
                        marginBottom: '1rem'
                    }}>
                        ⚠️ Please select a character first
                    </div>
                )}

                {!editingFolder && selectedCharacter && (
                    <div className="info-message" style={{
                        padding: '0.75rem',
                        background: 'rgba(0, 122, 255, 0.1)',
                        border: '1px solid rgba(0, 122, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#007aff',
                        fontSize: '0.9rem',
                        marginBottom: '1rem'
                    }}>
                        Creating folder for: <strong>{selectedCharacter.name}</strong>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Folder Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newFolderName}
                        onChange={(e) => dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: e.target.value })}
                        placeholder="e.g., Portraits, Action Poses"
                        autoFocus
                    />
                </div>

                <div className="modal-actions">
                    {editingFolder && (
                        <button
                            className="btn-reset"
                            onClick={handleDelete}
                        >
                            <i className="fa fa-trash"></i>
                            Delete
                        </button>
                    )}
                    <button
                        className="btn-generate"
                        onClick={handleSave}
                        disabled={!newFolderName.trim() || (!editingFolder && !selectedCharacter)}
                    >
                        {editingFolder ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FolderModal;
