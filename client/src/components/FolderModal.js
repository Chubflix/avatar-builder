import React from 'react';
import { useApp } from '../context/AppContext';
import { flattenFoldersWithDepth } from '../utils/folderUtils';

function FolderModal({ onSave, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { showFolderModal, editingFolder, newFolderName, parentFolderId, folders } = state;

    if (!showFolderModal) return null;

    // Get flattened folders with depth for display
    const flatFolders = flattenFoldersWithDepth(folders);

    // Filter out the current folder and its descendants when editing
    const availableParents = editingFolder
        ? flatFolders.filter(f => {
              // Can't be parent of itself
              if (f.id === editingFolder.id) return false;
              // Can't be parent if it's a descendant
              let current = f;
              while (current.parent_id) {
                  if (current.parent_id === editingFolder.id) return false;
                  current = folders.find(folder => folder.id === current.parent_id);
                  if (!current) break;
              }
              return true;
          })
        : flatFolders;

    const handleClose = () => {
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: '' });
        dispatch({ type: actions.SET_PARENT_FOLDER_ID, payload: null });
    };

    const handleSave = () => {
        onSave(editingFolder?.id, newFolderName, parentFolderId);
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
                <div className="form-group">
                    <label className="form-label">Parent Folder (optional)</label>
                    <select
                        className="form-select"
                        value={parentFolderId || ''}
                        onChange={(e) => dispatch({ type: actions.SET_PARENT_FOLDER_ID, payload: e.target.value || null })}
                    >
                        <option value="">None (Root Level)</option>
                        {availableParents.map(folder => (
                            <option key={folder.id} value={folder.id}>
                                {'  '.repeat(folder.depth || 0)}{folder.name}
                            </option>
                        ))}
                    </select>
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
