import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { imageAPI, API_BASE } from '../utils/backend-api';
import FolderSelector from './FolderSelector';

function ImageGallery({ onOpenLightbox, onRestoreSettings, onDelete, onLoadMore }) {
    const { state, dispatch, actions } = useApp();
    const { images, totalImages, hasMore, isLoadingMore, selectedImages, isSelecting } = state;
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);
    const [bulkMoveMode, setBulkMoveMode] = useState(false);

    const handleDownload = (e, image) => {
        e.stopPropagation();
        imageAPI.download(image);
    };

    const handleRestoreWithSeed = (e, image) => {
        e.stopPropagation();
        onRestoreSettings(image, true);
    };

    const handleRestoreWithoutSeed = (e, image) => {
        e.stopPropagation();
        onRestoreSettings(image, false);
    };

    const handleDelete = (e, imageId) => {
        e.stopPropagation();
        onDelete(imageId);
    };

    const handleToggleSelection = (e, imageId) => {
        e.stopPropagation();
        dispatch({ type: actions.TOGGLE_IMAGE_SELECTION, payload: imageId });
    };

    const handleSelectAll = () => {
        dispatch({ type: actions.SELECT_ALL_IMAGES });
    };

    const handleClearSelection = () => {
        dispatch({ type: actions.CLEAR_SELECTION });
    };

    const handleBulkDownload = async () => {
        try {
            await imageAPI.downloadZip(selectedImages);
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: `Downloaded ${selectedImages.length} images` } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to download images' } });
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedImages.length} selected images?`)) return;

        try {
            await imageAPI.bulkDelete(selectedImages);
            selectedImages.forEach(id => {
                dispatch({ type: actions.REMOVE_IMAGE, payload: id });
            });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: totalImages - selectedImages.length });
            dispatch({ type: actions.CLEAR_SELECTION });
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: `Deleted ${selectedImages.length} images` } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to delete images' } });
        }
    };

    const handleBulkMove = () => {
        setBulkMoveMode(true);
        setShowFolderSelector(true);
    };

    if (images.length === 0) {
        return (
            <div className="empty-state">
                <i className="fa fa-image"></i>
                <h3>No images yet</h3>
                <p>Configure your settings and click Generate to create images</p>
            </div>
        );
    }

    return (
        <>
            {/* Selection Toolbar */}
            <div className="selection-toolbar">
                {!isSelecting ? (
                    <>
                        <button
                            className="btn-select"
                            onClick={() => dispatch({ type: actions.SET_IS_SELECTING, payload: true })}
                        >
                            <i className="fa fa-check-square-o"></i>
                            Select
                        </button>
                        {state.currentFolder && (
                            <button
                                className="btn-select"
                                onClick={() => dispatch({ type: actions.TOGGLE_INCLUDE_SUBFOLDERS })}
                                title={state.includeSubfolders ? "Hide subfolder images" : "Show subfolder images"}
                            >
                                <i className={`fa fa-folder${state.includeSubfolders ? '-open' : ''}-o`}></i>
                                {state.includeSubfolders ? 'Hide Subfolders' : 'Show Subfolders'}
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className="selection-info">
                            <span className="selection-count">
                                {selectedImages.length} selected
                            </span>
                        </div>
                        <div className="selection-actions">
                            <button
                                className="btn-selection-action"
                                onClick={handleSelectAll}
                                disabled={selectedImages.length === images.length}
                            >
                                <i className="fa fa-check-square"></i>
                                Select All
                            </button>
                            {selectedImages.length > 0 && (
                                <>
                                    <button
                                        className="btn-selection-action"
                                        onClick={handleBulkDownload}
                                    >
                                        <i className="fa fa-download"></i>
                                        Download
                                    </button>
                                    <button
                                        className="btn-selection-action"
                                        onClick={handleBulkMove}
                                    >
                                        <i className="fa fa-folder-o"></i>
                                        Move
                                    </button>
                                    <button
                                        className="btn-selection-action danger"
                                        onClick={handleBulkDelete}
                                    >
                                        <i className="fa fa-trash"></i>
                                        Delete
                                    </button>
                                </>
                            )}
                            <button
                                className="btn-selection-action"
                                onClick={handleClearSelection}
                            >
                                <i className="fa fa-times"></i>
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="image-grid">
                {images.map((image, index) => {
                    const imageSrc = `${API_BASE}${image.url || `/generated/${image.filename}`}`;
                    const isSelected = selectedImages.includes(image.id);
                    return (
                        <div key={image.id} className={`image-card ${isSelected ? 'selected' : ''}`}>
                            <div
                                className="image-wrapper"
                                style={{ '--bg-image': `url(${imageSrc})` }}
                                onClick={() => isSelecting ? handleToggleSelection({ stopPropagation: () => {} }, image.id) : onOpenLightbox(index)}
                            >
                                {isSelecting && (
                                    <div className="image-checkbox">
                                        <i className={ `fa ${isSelected ? 'fa-dot-circle-o' : 'fa-circle-o'}` } />
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => handleToggleSelection(e, image.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                )}
                                <img
                                    src={imageSrc}
                                    alt={`Generated ${image.id}`}
                                    loading="lazy"
                                />
                            {!isSelecting && <div className="image-overlay">
                                <button
                                    className="image-btn"
                                    onClick={(e) => handleDownload(e, image)}
                                    title="Download"
                                >
                                    <i className="fa fa-download"></i>
                                </button>
                                <button
                                    className="image-btn secondary"
                                    onClick={(e) => handleRestoreWithSeed(e, image)}
                                    title="Restore with seed"
                                >
                                    <i className="fa fa-undo"></i>
                                </button>
                                <button
                                    className="image-btn secondary"
                                    onClick={(e) => handleRestoreWithoutSeed(e, image)}
                                    title="Restore without seed"
                                >
                                    <i className="fa fa-random"></i>
                                </button>
                                <button
                                    className="image-btn danger"
                                    onClick={(e) => handleDelete(e, image.id)}
                                    title="Delete"
                                >
                                    <i className="fa fa-trash"></i>
                                </button>
                            </div>}
                        </div>
                        <div className="image-info">
                            {new Date(image.created_at).toLocaleString()}
                            {image.seed && image.seed !== -1 && (
                                <span> • Seed: {image.seed}</span>
                            )}
                        </div>
                        <div className="image-tags">
                            {image.folder_path ? (
                                // Split path into individual badges with separators
                                <>
                                    {image.folder_path.split(' / ').map((folderName, index, array) => {
                                        const isLast = index === array.length - 1;
                                        return (
                                            <React.Fragment key={index}>
                                                <div className={`image-folder-badge-split ${!isLast ? 'path-part' : ''}`}>
                                                    <button
                                                        className="folder-badge-filter"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Find folder by matching the name at this depth
                                                            const pathUpToHere = array.slice(0, index + 1);
                                                            const folder = state.folders.find(f => {
                                                                // Build path for this folder and check if it matches
                                                                const folderPathParts = [];
                                                                let currentId = f.id;
                                                                const folderMap = new Map(state.folders.map(folder => [folder.id, folder]));
                                                                while (currentId) {
                                                                    const currentFolder = folderMap.get(currentId);
                                                                    if (!currentFolder) break;
                                                                    folderPathParts.unshift(currentFolder.name);
                                                                    currentId = currentFolder.parent_id;
                                                                }
                                                                return folderPathParts.join(' / ') === pathUpToHere.join(' / ');
                                                            });
                                                            if (folder) {
                                                                dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folder.id });
                                                            }
                                                        }}
                                                        title={`Filter by ${folderName}`}
                                                    >
                                                        {folderName}
                                                    </button>
                                                    {isLast && (
                                                        <button
                                                            className="folder-badge-move"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedImageForMove(image);
                                                                setShowFolderSelector(true);
                                                            }}
                                                            title="Move to folder"
                                                        >
                                                            <i className="fa fa-folder-o"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                {!isLast && <span className="folder-path-separator">/</span>}
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            ) : (
                                // Unfiled badge
                                <div className="image-folder-badge-split unfiled">
                                    <button
                                        className="folder-badge-filter"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch({ type: actions.SET_CURRENT_FOLDER, payload: 'unfiled' });
                                        }}
                                        title="Filter unfiled images"
                                    >
                                        Unfiled
                                    </button>
                                    <button
                                        className="folder-badge-move"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImageForMove(image);
                                            setShowFolderSelector(true);
                                        }}
                                        title="Move to folder"
                                    >
                                        <i className="fa fa-folder-o"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            <>
                                <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', marginRight: '8px', verticalAlign: 'middle' }}></span>
                                Loading...
                            </>
                        ) : (
                            `Load More (${totalImages - images.length} remaining)`
                        )}
                    </button>
                </div>
            )}

            <FolderSelector
                show={showFolderSelector}
                onClose={() => {
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                    setBulkMoveMode(false);
                }}
                onSelect={async (folderId) => {
                    try {
                        if (bulkMoveMode) {
                            await imageAPI.bulkMove(selectedImages, folderId || null);
                            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: `Moved ${selectedImages.length} images` } });
                            dispatch({ type: actions.CLEAR_SELECTION });
                            window.location.reload();
                        } else if (selectedImageForMove) {
                            await imageAPI.update(selectedImageForMove.id, { folderId: folderId || null });
                            window.location.reload();
                        }
                    } catch (err) {
                        dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to move images' } });
                    }
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                    setBulkMoveMode(false);
                }}
                currentFolderId={bulkMoveMode ? null : selectedImageForMove?.folder_id}
                title={bulkMoveMode ? `Move ${selectedImages.length} Images` : "Move to Folder"}
            />
        </>
    );
}

export default ImageGallery;
