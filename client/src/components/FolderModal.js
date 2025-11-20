import React from 'react';
import { useApp } from '../context/AppContext';

function FolderModal({ onSave, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { showFolderModal, editingFolder, newFolderName } = state;

    if (!showFolderModal) return null;

    const handleClose = () => {
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: '' });
    };

    const handleSave = () => {
        onSave(editingFolder?.id, newFolderName);
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
                <div className="form-group">
                    <label className="form-label">Folder Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={newFolderName}
                        onChange={(e) => dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: e.target.value })}
                        placeholder="e.g., Character Name"
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
                        disabled={!newFolderName.trim()}
                    >
                        {editingFolder ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FolderModal;
