import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { imageAPI, API_BASE } from '../api/backend';
import { useFolders } from '../hooks';
import FolderSelector from './FolderSelector';

function Lightbox({ onClose, onMoveToFolder, onRestoreSettings, onDelete }) {
    const { state, dispatch, actions } = useApp();
    const { lightboxIndex, images } = state;
    const { loadFolders } = useFolders();
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    
    // Load details state from localStorage
    const [showGenerationDetails, setShowGenerationDetails] = useState(() => {
        const saved = localStorage.getItem('lightbox-show-details');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Save details state to localStorage
    useEffect(() => {
        localStorage.setItem('lightbox-show-details', JSON.stringify(showGenerationDetails));
    }, [showGenerationDetails]);

    const minSwipeDistance = 50;
    const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (lightboxIndex === null) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (lightboxIndex > 0) {
                        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex - 1 });
                    }
                    break;
                case 'ArrowRight':
                    if (lightboxIndex < images.length - 1) {
                        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex + 1 });
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, images.length, dispatch, actions, onClose]);

    // Prevent body scroll
    useEffect(() => {
        if (lightboxIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [lightboxIndex]);

    // Touch handlers
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && lightboxIndex < images.length - 1) {
            dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex + 1 });
        } else if (isRightSwipe && lightboxIndex > 0) {
            dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex - 1 });
        }
    };

    const handleMoveToFolder = async (folderId) => {
        await onMoveToFolder(currentImage.id, folderId);
        await loadFolders();
        setShowFolderSelector(false);
    };

    const handleDownload = () => {
        imageAPI.download(currentImage);
    };

    const handleCopyToClipboard = async () => {
        try {
            await imageAPI.copyToClipboard(currentImage);
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

    const handleRestoreWithSeed = () => {
        onRestoreSettings(currentImage, true);
        onClose();
    };

    const handleRestoreWithoutSeed = () => {
        onRestoreSettings(currentImage, false);
        onClose();
    };

    if (!currentImage) return null;

    return (
        <div
            className="lightbox-overlay"
            onClick={onClose}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <div className="lightbox-controls">
                    <button className="lightbox-close" onClick={onClose}>
                        <i className="fa fa-times"></i>
                    </button>

                    <button
                        className="lightbox-info-toggle"
                        onClick={() => setShowGenerationDetails(!showGenerationDetails)}
                        title="Toggle generation details"
                    >
                        <i className="fa fa-info-circle"></i>
                    </button>
                </div>

                {lightboxIndex > 0 && (
                    <button
                        className="lightbox-nav lightbox-prev"
                        onClick={() => dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex - 1 })}
                    >
                        <i className="fa fa-chevron-left"></i>
                    </button>
                )}
                {lightboxIndex < images.length - 1 && (
                    <button
                        className="lightbox-nav lightbox-next"
                        onClick={() => dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: lightboxIndex + 1 })}
                    >
                        <i className="fa fa-chevron-right"></i>
                    </button>
                )}

                <div className="lightbox-main-content">
                    <div className="lightbox-image-container">
                        <img
                            src={`${API_BASE}${currentImage.url || `/generated/${currentImage.filename}`}`}
                            alt={`Generated ${currentImage.id}`}
                        />
                    </div>

                    {showGenerationDetails && (
                        <div className="lightbox-details-sidebar">
                            <div className="settings-display" style={{ marginBottom: '1rem' }}>
                                <div><strong>Positive Prompt:</strong></div>
                                <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                                    {currentImage.positive_prompt || 'N/A'}
                                </p>
                                {currentImage.negative_prompt && (
                                    <>
                                        <div style={{ marginTop: '0.5rem' }}><strong>Negative Prompt:</strong></div>
                                        <p style={{ fontSize: '0.7rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                                            {currentImage.negative_prompt}
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="settings-display">
                                <div><strong>Model:</strong> {currentImage.model || 'N/A'}</div>
                                <div><strong>Dimensions:</strong> {currentImage.width}×{currentImage.height}</div>
                                <div><strong>Sampler:</strong> {currentImage.sampler_name || 'N/A'}</div>
                                <div><strong>Scheduler:</strong> {currentImage.scheduler || 'N/A'}</div>
                                <div><strong>Steps:</strong> {currentImage.steps || 'N/A'}</div>
                                <div><strong>CFG Scale:</strong> {currentImage.cfg_scale || 'N/A'}</div>
                                {currentImage.seed && currentImage.seed !== -1 && (
                                    <div><strong>Seed:</strong> {currentImage.seed}</div>
                                )}
                                {currentImage.adetailer_enabled && (
                                    <div><strong>ADetailer:</strong> {currentImage.adetailer_model || 'Enabled'}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lightbox-content-wrapper">
                    <div className="lightbox-info">
                        <div className="lightbox-meta">
                            <span>{new Date(currentImage.created_at).toLocaleString()}</span>
                            <span> • {currentImage.width}x{currentImage.height}</span>
                            <span> • {lightboxIndex + 1} / {images.length}</span>
                        </div>

                        <div className="lightbox-folder-info">
                            <span className="folder-label">Folder:</span>
                            <button
                                className="folder-select-btn"
                                onClick={() => setShowFolderSelector(true)}
                            >
                                {currentImage.folder_path || 'Unfiled'}
                                <i className="fa fa-chevron-down"></i>
                            </button>
                        </div>

                        <div className="lightbox-actions">
                            <button
                                className="image-btn"
                                onClick={handleDownload}
                                title="Download"
                            >
                                <i className="fa fa-download"></i> <span className="btn-label">Download</span>
                            </button>
                            <button
                                className="image-btn secondary"
                                onClick={handleCopyToClipboard}
                                title="Copy to clipboard"
                            >
                                <i className="fa fa-copy"></i> <span className="btn-label">Copy</span>
                            </button>
                            <button
                                className="image-btn secondary"
                                onClick={handleRestoreWithSeed}
                                title="Restore with seed"
                            >
                                <i className="fa fa-undo"></i> <span className="btn-label">Restore</span>
                            </button>
                            <button
                                className="image-btn secondary"
                                onClick={handleRestoreWithoutSeed}
                                title="Restore without seed"
                            >
                                <i className="fa fa-random"></i> <span className="btn-label">New Seed</span>
                            </button>
                            <button
                                className="image-btn danger"
                                onClick={() => onDelete(currentImage.id)}
                                title="Delete"
                            >
                                <i className="fa fa-trash"></i> <span className="btn-label">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <FolderSelector
                show={showFolderSelector}
                onClose={() => setShowFolderSelector(false)}
                onSelect={handleMoveToFolder}
                currentFolderId={currentImage?.folder_id}
                title="Move to Folder"
            />
        </div>
    );
}

export default Lightbox;
