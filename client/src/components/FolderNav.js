import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function FolderNav({ onOpenFolderModal }) {
    const { state, dispatch, actions } = useApp();
    const { folders, currentFolder } = state;
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    const currentFolderName = currentFolder === null ? 'All Images' :
                               currentFolder === 'unfiled' ? 'Unfiled' :
                               folders.find(f => f.id === currentFolder)?.name || 'Images';

    const handleFolderSelect = (folderId) => {
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folderId || null });
        setShowFolderPicker(false);
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
                            {folders.map(folder => (
                                <div key={folder.id} className="folder-selector-item-with-edit">
                                    <button
                                        className={`folder-selector-item ${currentFolder === folder.id ? 'active' : ''}`}
                                        onClick={() => handleFolderSelect(folder.id)}
                                    >
                                        <i className="fa fa-folder"></i>
                                        <span>{folder.name}</span>
                                        <span className="folder-count">{folder.image_count}</span>
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
