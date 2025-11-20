import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { imageAPI, API_BASE } from '../api/backend';
import FolderSelector from './FolderSelector';

function ImageGallery({ onOpenLightbox, onRestoreSettings, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { images, totalImages, hasMore, isLoadingMore } = state;
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [selectedImageForMove, setSelectedImageForMove] = useState(null);

    const handleDownload = (e, image) => {
        e.stopPropagation();
        imageAPI.download(image);
    };

    const handleCopyToClipboard = async (e, image) => {
        e.stopPropagation();
        try {
            await imageAPI.copyToClipboard(image);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: 'Image copied to clipboard!' }
            });
        } catch (err) {
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to copy image' }
            });
        }
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
            <div className="image-grid">
                {images.map((image, index) => (
                    <div key={image.id} className="image-card">
                        <div className="image-wrapper">
                            <img
                                src={`${API_BASE}${image.url || `/generated/${image.filename}`}`}
                                alt={`Generated ${image.id}`}
                                loading="lazy"
                                onClick={() => onOpenLightbox(index)}
                            />
                            <div className="image-overlay">
                                <button
                                    className="image-btn"
                                    onClick={(e) => handleDownload(e, image)}
                                    title="Download"
                                >
                                    <i className="fa fa-download"></i>
                                </button>
                                <button
                                    className="image-btn secondary"
                                    onClick={(e) => handleCopyToClipboard(e, image)}
                                    title="Copy to clipboard"
                                >
                                    <i className="fa fa-copy"></i>
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
                            </div>
                        </div>
                        <div className="image-info">
                            {new Date(image.created_at).toLocaleString()}
                            {image.seed && image.seed !== -1 && (
                                <span> • Seed: {image.seed}</span>
                            )}
                        </div>
                        {image.folder_name && (
                            <div className="image-tags">
                                <button 
                                    className="image-folder-badge"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImageForMove(image);
                                        setShowFolderSelector(true);
                                    }}
                                    title="Change folder"
                                >
                                    {image.folder_name}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={() => {/* will be handled in parent */}}
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
                }}
                onSelect={async (folderId) => {
                    if (selectedImageForMove) {
                        await imageAPI.update(selectedImageForMove.id, { folderId: folderId || null });
                        window.location.reload();
                    }
                    setShowFolderSelector(false);
                    setSelectedImageForMove(null);
                }}
                currentFolderId={selectedImageForMove?.folder_id}
                title="Move to Folder"
            />
        </>
    );
}

export default ImageGallery;
