import React, {useState} from 'react';
import {useApp} from '../context/AppContext';
import {imageAPI} from '../utils/backend-api';
import FolderSelector from './FolderSelector';
import ImageCard from './ImageCard';

function ImageGallery({onOpenLightbox, onRestoreSettings, onDelete, onLoadMore}) {
    const {state, dispatch, actions} = useApp();
    const {images, totalImages, hasMore, isLoadingMore, selectedImages, isSelecting} = state;
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);
    const [bulkMoveMode, setBulkMoveMode] = useState(false);

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
                        {state.currentFolder && (
                            <button
                                className="btn-select"
                                onClick={() => dispatch({type: actions.TOGGLE_INCLUDE_SUBFOLDERS})}
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
                    return <ImageCard key={image.id}
                                      index={index}
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
                            dispatch({
                                type: actions.SET_STATUS,
                                payload: {type: 'success', message: `Moved ${selectedImages.length} images`}
                            });
                            dispatch({type: actions.CLEAR_SELECTION});
                            window.location.reload();
                        } else if (selectedImageForMove) {
                            await imageAPI.update(selectedImageForMove.id, {folderId: folderId || null});
                            window.location.reload();
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
                title={bulkMoveMode ? `Move ${selectedImages.length} Images` : "Move to Folder"}
            />
        </>
    );
}

export default ImageGallery;
