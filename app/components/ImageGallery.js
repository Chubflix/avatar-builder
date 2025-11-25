import React, {useState} from 'react';
import {useApp} from '../context/AppContext';
import {imageAPI} from '../utils/backend-api';
import LocationPicker from './LocationPicker';
import ImageCard from './ImageCard';

function ImageGallery({onOpenLightbox, onRestoreSettings, onDelete, onLoadMore}) {
    const {state, dispatch, actions} = useApp();
    const {images, totalImages, hasMore, isLoadingMore, selectedImages, isSelecting, hideNsfw, showFavoritesOnly} = state;
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);
    const [bulkMoveMode, setBulkMoveMode] = useState(false);

    // Filter images based on NSFW and favorites settings
    let filteredImages = images;
    if (hideNsfw) {
        filteredImages = filteredImages.filter(img => !img.is_nsfw);
    }
    if (showFavoritesOnly) {
        filteredImages = filteredImages.filter(img => img.is_favorite);
    }

    const handleSelectAll = () => {
        dispatch({type: actions.SELECT_ALL_IMAGES});
    };

    const handleClearSelection = () => {
        dispatch({type: actions.CLEAR_SELECTION});
    };

    const handleBulkDownload = async () => {
        try {
            await imageAPI.downloadZip(selectedImages);
            dispatch({
                type: actions.SET_STATUS,
                payload: {type: 'success', message: `Downloaded ${selectedImages.length} images`}
            });
        } catch (err) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: 'Failed to download images'}});
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedImages.length} selected images?`)) return;

        try {
            await imageAPI.bulkDelete(selectedImages);
            selectedImages.forEach(id => {
                dispatch({type: actions.REMOVE_IMAGE, payload: id});
            });
            dispatch({type: actions.SET_TOTAL_IMAGES, payload: totalImages - selectedImages.length});
            dispatch({type: actions.CLEAR_SELECTION});
            dispatch({
                type: actions.SET_STATUS,
                payload: {type: 'success', message: `Deleted ${selectedImages.length} images`}
            });
        } catch (err) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: 'Failed to delete images'}});
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

    if (filteredImages.length === 0 && hideNsfw) {
        return (
            <div className="empty-state">
                <i className="fa fa-eye-slash"></i>
                <h3>All images are hidden</h3>
                <p>All images are marked as NSFW. Disable "Hide NSFW Images" in settings to view them.</p>
            </div>
        );
    }

    if (filteredImages.length === 0 && showFavoritesOnly) {
        return (
            <div className="empty-state">
                <i className="fa fa-heart-o"></i>
                <h3>No favorite images</h3>
                <p>Mark images as favorites to see them here.</p>
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
                            onClick={() => dispatch({type: actions.SET_IS_SELECTING, payload: true})}
                        >
                            <i className="fa fa-check-square-o"></i>
                            Select
                        </button>
                        <button
                            className={`btn-filter ${showFavoritesOnly ? 'active' : ''}`}
                            onClick={() => dispatch({type: actions.SET_SHOW_FAVORITES_ONLY, payload: !showFavoritesOnly})}
                            title={showFavoritesOnly ? 'Show all images' : 'Show favorites only'}
                        >
                            <i className={`fa ${showFavoritesOnly ? 'fa-heart' : 'fa-heart-o'}`}></i>
                            Favorites Only
                        </button>
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
                {filteredImages.map((image, filteredIndex) => {
                    // Find the actual index in the original images array
                    const actualIndex = images.findIndex(img => img.id === image.id);
                    return <ImageCard key={image.id}
                                      index={actualIndex}
                                      image={image}
                                      onRestoreSettings={onRestoreSettings}
                                      onOpenLightbox={onOpenLightbox}
                                      onDelete={onDelete}
                                      onImageMove={(e, image) => {
                                          e.stopPropagation();
                                          setSelectedImageForMove(image);
                                          setShowFolderSelector(true);
                                      }}
                    />;
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
                                <span className="spinner" style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    marginRight: '8px',
                                    verticalAlign: 'middle'
                                }}></span>
                                Loading...
                            </>
                        ) : (
                            `Load More (${totalImages - images.length} remaining)`
                        )}
                    </button>
                </div>
            )}

            <LocationPicker
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
                            dispatch({
                                type: actions.SET_STATUS,
                                payload: {type: 'success', message: `Moved ${selectedImages.length} images`}
                            });
                            dispatch({type: actions.CLEAR_SELECTION});
                            // Real-time sync will handle UI updates automatically
                        } else if (selectedImageForMove) {
                            await imageAPI.update(selectedImageForMove.id, {folderId: folderId || null});
                            // Real-time sync will handle UI updates automatically
                        }
                    } catch (err) {
                        dispatch({
                            type: actions.SET_STATUS,
                            payload: {type: 'error', message: 'Failed to move images'}
                        });
                    }
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                    setBulkMoveMode(false);
                }}
                currentFolderId={bulkMoveMode ? null : selectedImageForMove?.folder_id}
                currentCharacterId={bulkMoveMode ? null : selectedImageForMove?.character_id}
                title={bulkMoveMode ? `Move ${selectedImages.length} Images` : "Move to Folder"}
                mode="move"
            />
        </>
    );
}

export default ImageGallery;
