import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function FolderNav({ onOpenFolderModal }) {
    const { state, dispatch, actions } = useApp();
    const { folders, currentFolder, selectedCharacter } = state;
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const currentFolderName = currentFolder === null ? 'All Images' :
                               currentFolder === 'unfiled' ? 'Unfiled' :
                               folders.find(f => f.id === currentFolder)?.name || 'Images';

    const handleFolderSelect = (folderId) => {
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folderId || null });
        setShowFolderPicker(false);
    };

    const handleAddFolderClick = () => {
        if (!selectedCharacter) {
            alert('Please select a character first');
            return;
        }
        setIsAddingFolder(true);
        setNewFolderName('');
    };

    const handleSaveNewFolder = () => {
        if (!selectedCharacter) {
            alert('Please select a character first');
            return;
        }
        if (newFolderName.trim()) {
            dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: newFolderName.trim() });
            dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
            dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
            setShowFolderPicker(false);
            setIsAddingFolder(false);
            setNewFolderName('');
        }
    };

    const handleCancelAddFolder = () => {
        setIsAddingFolder(false);
        setNewFolderName('');
    };

    return (
        <>
            <div className="folder-nav">
                <div className="folder-picker-row">
                    <button
                        className={`btn-all-images ${currentFolder === null ? 'active' : ''}`}
                        onClick={() => dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null })}
                        title="View all images"
                    >
                        All
                    </button>
                    <button
                        className="folder-picker-btn"
                        onClick={() => setShowFolderPicker(true)}
                    >
                        <i className="fa fa-folder"></i>
                        <span>{currentFolderName}</span>
                        <i className="fa fa-chevron-down"></i>
                    </button>
                </div>
            </div>

            {showFolderPicker && (
                <div className="folder-selector-overlay" onClick={() => setShowFolderPicker(false)}>
                    <div className="folder-selector-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="folder-selector-header">
                            <h4>Select Folder</h4>
                            <button onClick={() => setShowFolderPicker(false)} className="close-btn">
                                <i className="fa fa-times"></i>
                            </button>
                        </div>
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

                            {!selectedCharacter && (
                                <div className="folder-selector-empty">
                                    Please select a character to view folders
                                </div>
                            )}

                            <button
                                className={`folder-selector-item ${currentFolder === null ? 'active' : ''}`}
                                onClick={() => handleFolderSelect(null)}
                            >
                                <i className="fa fa-th"></i>
                                <span>All Images</span>
                                {currentFolder === null && <i className="fa fa-check"></i>}
                            </button>
                            <button
                                className={`folder-selector-item ${currentFolder === 'unfiled' ? 'active' : ''}`}
                                onClick={() => handleFolderSelect('unfiled')}
                            >
                                <i className="fa fa-folder-o"></i>
                                <span>Unfiled</span>
                                {currentFolder === 'unfiled' && <i className="fa fa-check"></i>}
                            </button>

                            {/* Render flat folder list */}
                            {folders.map(folder => (
                                <div key={folder.id} className="folder-selector-item-with-edit">
                                    <button
                                        className={`folder-selector-item ${currentFolder === folder.id ? 'active' : ''}`}
                                        onClick={() => handleFolderSelect(folder.id)}
                                    >
                                        <i className="fa fa-folder"></i>
                                        <span>{folder.name}</span>
                                        <span className="folder-count">{folder.image_count || 0}</span>
                                        {currentFolder === folder.id && <i className="fa fa-check"></i>}
                                    </button>
                                    <button
                                        className="folder-edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFolderPicker(false);
                                            onOpenFolderModal(folder);
                                        }}
                                        title="Edit folder"
                                    >
                                        <i className="fa fa-pencil"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default FolderNav;
