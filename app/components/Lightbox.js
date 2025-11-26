import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { imageAPI, API_BASE } from '../utils/backend-api';
import { useFolders } from '../hooks';
import LocationPicker from './LocationPicker';

function Lightbox({ onClose, onMoveToFolder, onRestoreSettings, onDelete, onLoadMore }) {
    const { state, dispatch, actions } = useApp();
    const { lightboxIndex, images, hideNsfw, showFavoritesOnly, hasMore, isLoadingMore } = state;
    const { loadFolders } = useFolders();

    // Filter images based on NSFW and favorites settings
    let filteredImages = images;
    if (hideNsfw) {
        filteredImages = filteredImages.filter(img => !img.is_nsfw);
    }
    if (showFavoritesOnly) {
        filteredImages = filteredImages.filter(img => img.is_favorite);
    }
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
    const [showFolderSelector, setShowFolderSelector] = useState(false);

    // Zoom state
    const [isZoomed, setIsZoomed] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    // Removed double-tap zoom; state no longer needed
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isMousePanning, setIsMousePanning] = useState(false);

    // Comparison mode state
    const [showComparison, setShowComparison] = useState(false);

    // Load details state from localStorage
    const [showGenerationDetails, setShowGenerationDetails] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('lightbox-show-details');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Save details state to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('lightbox-show-details', JSON.stringify(showGenerationDetails));
    }, [showGenerationDetails]);

    const minSwipeDistance = 50;

    // Find the current image in the filtered array
    // lightboxIndex refers to the original images array
    const currentImageFromOriginal = lightboxIndex !== null ? images[lightboxIndex] : null;

    // Find the index of this image in the filtered array
    const filteredLightboxIndex = currentImageFromOriginal
        ? filteredImages.findIndex(img => img.id === currentImageFromOriginal.id)
        : null;

    // Use the filtered index for display
    const currentImage = filteredLightboxIndex !== null && filteredLightboxIndex !== -1
        ? filteredImages[filteredLightboxIndex]
        : null;

    // Build a linear ancestry chain from original -> ... -> current
    const comparisonChain = useMemo(() => {
        if (!currentImage) return [];
        // Map of images by id for quick lookup (from already loaded images in state)
        const byId = new Map(images.map(img => [img.id, img]));

        const chain = [];
        let cursor = currentImage;
        // Walk back to the root/original
        while (cursor) {
            chain.unshift(cursor);
            const parentId = cursor.parent_image_id || cursor.image_id || null;
            if (!parentId) break;
            const parent = byId.get(parentId);
            if (!parent) {
                // parent not loaded; stop here but mark that there are more
                chain.unshift({ id: `missing-${parentId}`, __missing: true });
                break;
            }
            cursor = parent;
        }
        return chain;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentImage, images]);

    // Select up to 3 items ensuring original and current are present
    const comparisonSelection = useMemo(() => {
        const chain = comparisonChain;
        if (!chain.length) return { items: [], moreCount: 0 };
        const original = chain[0];
        const last = chain[chain.length - 1];
        if (chain.length <= 3) {
            return { items: chain, moreCount: 0 };
        }
        // Include original and current, pick one representative from the middle
        const midIndex = Math.floor((chain.length - 1) / 2);
        const mid = chain[midIndex];
        // If mid equals original or current, pick another near-middle
        const items = [original];
        if (mid.id !== original.id && mid.id !== last.id) items.push(mid);
        if (items.length < 2 && chain.length > 2) items.push(chain[1]);
        items.push(last);
        // Ensure items are unique and keep order original -> ... -> current
        const unique = [];
        const seen = new Set();
        for (const it of items) {
            if (!seen.has(it.id)) { seen.add(it.id); unique.push(it); }
        }
        const moreCount = Math.max(0, chain.length - unique.length);
        return { items: unique.slice(0, 3), moreCount };
    }, [comparisonChain]);

    // Helper function to navigate to next/previous image in filtered array
    const navigateToFilteredIndex = (newFilteredIndex) => {
        if (newFilteredIndex >= 0 && newFilteredIndex < filteredImages.length) {
            const targetImage = filteredImages[newFilteredIndex];
            const originalIndex = images.findIndex(img => img.id === targetImage.id);
            if (originalIndex !== -1) {
                dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: originalIndex });
            }
        }
    };

    // If current image is filtered out, navigate like deletion: try next, then previous, then close
    useEffect(() => {
        if (lightboxIndex !== null && (!currentImage || filteredLightboxIndex === -1)) {
            // Current image is filtered out, try to find next available image from current position

            // Look forward from current position
            let nextValidIndex = null;
            for (let i = lightboxIndex + 1; i < images.length; i++) {
                const img = images[i];
                const passesNsfwFilter = !hideNsfw || !img.is_nsfw;
                const passesFavFilter = !showFavoritesOnly || img.is_favorite;
                if (passesNsfwFilter && passesFavFilter) {
                    nextValidIndex = i;
                    break;
                }
            }

            if (nextValidIndex !== null) {
                // Found a next valid image, navigate to it
                dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: nextValidIndex });
            } else {
                // No next image, look backward from current position
                let prevValidIndex = null;
                for (let i = lightboxIndex - 1; i >= 0; i--) {
                    const img = images[i];
                    const passesNsfwFilter = !hideNsfw || !img.is_nsfw;
                    const passesFavFilter = !showFavoritesOnly || img.is_favorite;
                    if (passesNsfwFilter && passesFavFilter) {
                        prevValidIndex = i;
                        break;
                    }
                }

                if (prevValidIndex !== null) {
                    // Found a previous valid image, navigate to it
                    dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: prevValidIndex });
                } else {
                    // No valid images left, close lightbox
                    onClose();
                }
            }
        }
    }, [currentImage, filteredLightboxIndex, lightboxIndex, images, hideNsfw, showFavoritesOnly, dispatch, actions, onClose]);

    // Infinite scroll: Load more images when reaching second-to-last image
    useEffect(() => {
        if (
            filteredLightboxIndex !== null &&
            filteredLightboxIndex === filteredImages.length - 2 &&
            hasMore &&
            !isLoadingMore &&
            onLoadMore
        ) {
            onLoadMore();
        }
    }, [filteredLightboxIndex, filteredImages.length, hasMore, isLoadingMore, onLoadMore]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (lightboxIndex === null) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (filteredLightboxIndex > 0) {
                        navigateToFilteredIndex(filteredLightboxIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                    if (filteredLightboxIndex < filteredImages.length - 1) {
                        navigateToFilteredIndex(filteredLightboxIndex + 1);
                    }
                    break;
                case 'ArrowDown':
                    dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
                    break;
                case 'i':
                    setShowGenerationDetails(!showGenerationDetails);
                    break;
                case 'd':
                    onDelete(currentImage.id);
                    break;
                case 'f':
                    handleToggleFavorite({ stopPropagation: () => {} });
                    break;
                case 'h':
                    handleToggleNsfw({ stopPropagation: () => {} });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, showGenerationDetails, images.length, dispatch, actions, onClose]);

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

    // Reset zoom when image changes
    useEffect(() => {
        setIsZoomed(false);
        setPanPosition({ x: 0, y: 0 });
    }, [lightboxIndex]);

    // Touch handlers
    const onTouchStart = (e) => {
        const touch = e.targetTouches[0];

        if (isZoomed) {
            // When zoomed, start panning
            setIsPanning(true);
            setPanStart({
                x: touch.clientX - panPosition.x,
                y: touch.clientY - panPosition.y
            });
        } else {
            // When not zoomed, track for swipe gestures
            setTouchEnd({ x: null, y: null });
            setTouchStart({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    };

    const onTouchMove = (e) => {
        const touch = e.targetTouches[0];

        if (isZoomed && isPanning) {
            // Pan the zoomed image
            e.preventDefault();
            setPanPosition({
                x: touch.clientX - panStart.x,
                y: touch.clientY - panStart.y
            });
        } else if (!isZoomed) {
            // Track for swipe gestures
            setTouchEnd({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    };

    const onTouchEnd = () => {
        if (isZoomed) {
            setIsPanning(false);
            return;
        }

        if (!touchStart.x || !touchStart.y || !touchEnd.x || !touchEnd.y) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;

        // Determine if it's primarily a horizontal or vertical swipe
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontalSwipe) {
            // Horizontal swipes for navigation
            const isLeftSwipe = distanceX > minSwipeDistance;
            const isRightSwipe = distanceX < -minSwipeDistance;

            if (isLeftSwipe && filteredLightboxIndex < filteredImages.length - 1) {
                navigateToFilteredIndex(filteredLightboxIndex + 1);
            } else if (isRightSwipe && filteredLightboxIndex > 0) {
                navigateToFilteredIndex(filteredLightboxIndex - 1);
            }
        } else {
            // Vertical swipes
            const isUpSwipe = distanceY > minSwipeDistance;
            const isDownSwipe = distanceY < -minSwipeDistance;

            if (isUpSwipe) {
                // Swipe up: open generation details if closed
                if (!showGenerationDetails) {
                    setShowGenerationDetails(true);
                }
            } else if (isDownSwipe) {
                // Swipe down: close generation details if open, otherwise close lightbox
                if (showGenerationDetails) {
                    setShowGenerationDetails(false);
                } else {
                    onClose();
                }
            }
        }
    };

    // Zoom toggle via button (double-tap/click removed)
    const handleToggleZoom = (e) => {
        if (e) e.stopPropagation();
        if (showGenerationDetails) return; // Disabled when details are shown
        setIsZoomed(prev => {
            const next = !prev;
            if (!next) {
                // Reset pan when zooming out
                setPanPosition({ x: 0, y: 0 });
            }
            return next;
        });
    };

    // Mouse handlers for panning when zoomed (desktop)
    const handleMouseDown = (e) => {
        if (!isZoomed) return;
        e.preventDefault();
        setIsMousePanning(true);
        setPanStart({
            x: e.clientX - panPosition.x,
            y: e.clientY - panPosition.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isZoomed || !isMousePanning) return;
        e.preventDefault();
        setPanPosition({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y
        });
    };

    const handleMouseUp = () => {
        setIsMousePanning(false);
    };

    // Add mouse up listener to window to catch when mouse is released outside the image
    useEffect(() => {
        if (isMousePanning) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isMousePanning]);

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

    const handleToggleFavorite = async (e) => {
        e.stopPropagation();
        try {
            const updatedImage = await imageAPI.updateFlags(currentImage, {
                is_favorite: !currentImage.is_favorite
            });
            dispatch({ type: actions.UPDATE_IMAGE, payload: updatedImage });
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to update favorite' }
            });
        }
    };

    const handleToggleNsfw = async (e) => {
        e.stopPropagation();
        try {
            const updatedImage = await imageAPI.updateFlags(currentImage, {
                is_nsfw: !currentImage.is_nsfw
            });
            dispatch({ type: actions.UPDATE_IMAGE, payload: updatedImage });
        } catch (error) {
            console.error('Failed to toggle NSFW:', error);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to update NSFW flag' }
            });
        }
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
                {!isZoomed && (
                    <div className="lightbox-flag-controls">
                        <button
                            className={`lightbox-control-btn favorite-btn ${currentImage.is_favorite ? 'active' : ''}`}
                            onClick={handleToggleFavorite}
                            title={currentImage.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <i className={`fa ${currentImage.is_favorite ? 'fa-heart' : 'fa-heart-o'}`}></i>
                        </button>
                        <button
                            className={`lightbox-control-btn nsfw-btn ${currentImage.is_nsfw ? 'active' : ''}`}
                            onClick={handleToggleNsfw}
                            title={currentImage.is_nsfw ? 'Mark as SFW' : 'Mark as NSFW'}
                        >
                            <i className={`fa ${currentImage.is_nsfw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                )}

                <div className="lightbox-controls">
                    <button className="lightbox-close" onClick={onClose}>
                        <i className="fa fa-times"></i>
                    </button>

                    {currentImage && (currentImage.parent_image_id || currentImage.image_id) && (
                        <button
                            className="lightbox-control-btn"
                            onClick={(e) => { e.stopPropagation(); setShowComparison(v => !v); }}
                            title={showComparison ? 'Hide comparison' : 'Show comparison with original'}
                            aria-label="Toggle comparison"
                        >
                            <i className={`fa ${showComparison ? 'fa-columns' : 'fa-columns'}`}></i>
                        </button>
                    )}

                    <button
                        className="lightbox-control-btn zoom-btn"
                        onClick={handleToggleZoom}
                        disabled={showGenerationDetails}
                        title={showGenerationDetails ? 'Close details to enable zoom' : (isZoomed ? 'Zoom out' : 'Zoom in')}
                        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                    >
                        <i className={`fa ${isZoomed ? 'fa-search-minus' : 'fa-search-plus'}`}></i>
                    </button>

                    <button
                        className="lightbox-info-toggle"
                        onClick={() => setShowGenerationDetails(!showGenerationDetails)}
                        title="Toggle generation details"
                    >
                        <i className="fa fa-info-circle"></i>
                    </button>
                </div>

                {filteredLightboxIndex > 0 && (
                    <button
                        className="lightbox-nav lightbox-prev"
                        onClick={() => navigateToFilteredIndex(filteredLightboxIndex - 1)}
                    >
                        <i className="fa fa-chevron-left"></i>
                    </button>
                )}
                {filteredLightboxIndex < filteredImages.length - 1 && (
                    <button
                        className="lightbox-nav lightbox-next"
                        onClick={() => navigateToFilteredIndex(filteredLightboxIndex + 1)}
                    >
                        <i className="fa fa-chevron-right"></i>
                    </button>
                )}

                <div className="lightbox-main-content">
                    {showComparison && comparisonSelection.items.length > 0 && (
                        <div className="lightbox-compare-strip">
                            {/* Render from original to current, inserting mask tiles between inpaint transitions */}
                            {comparisonSelection.items.map((img, idx) => {
                                const tiles = [];
                                const isMissing = img.__missing;
                                const prev = idx > 0 ? comparisonSelection.items[idx - 1] : null;
                                const isInpaintStep = prev && !prev.__missing && img && !img.__missing && img.generation_type === 'inpaint';
                                // Mask tile between prev and current if inpaint
                                if (prev && isInpaintStep) {
                                    const maskSrc = img.mask_url || null;
                                    tiles.push(
                                        <div key={`mask-${prev.id}-${img.id}`} className="compare-mask-tile" title="Inpaint mask">
                                            {maskSrc ? (
                                                <img src={maskSrc} alt="Mask" />
                                            ) : (
                                                <div className="mask-placeholder">Mask</div>
                                            )}
                                        </div>
                                    );
                                }
                                tiles.push(
                                    <div
                                        key={`img-${img.id}-${idx}`}
                                        className={`compare-image-tile ${isMissing ? 'missing' : ''} ${img.id === currentImage.id ? 'current' : ''}`}
                                        onClick={() => {
                                            if (isMissing) return;
                                            const originalIndex = images.findIndex(i => i.id === img.id);
                                            if (originalIndex !== -1) {
                                                dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: originalIndex });
                                            }
                                        }}
                                    >
                                        {isMissing ? (
                                            <div className="missing-placeholder">...</div>
                                        ) : (
                                            <img
                                                src={img.url}
                                                alt={`Image ${img.id}`}
                                            />
                                        )}
                                    </div>
                                );
                                return <React.Fragment key={`frag-${img.id}-${idx}`}>{tiles}</React.Fragment>;
                            })}
                            {comparisonSelection.moreCount > 0 && (
                                <div className="compare-more">+{comparisonSelection.moreCount} more</div>
                            )}
                        </div>
                    )}
                    <div className="lightbox-image-container">
                        <img
                            src={currentImage.url}
                            alt={`Generated ${currentImage.id}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            style={{
                                transform: isZoomed
                                    ? `scale(2) translate(${panPosition.x / 2}px, ${panPosition.y / 2}px)`
                                    : 'scale(1)',
                                transition: (isPanning || isMousePanning) ? 'none' : 'transform 0.3s ease',
                                cursor: isZoomed ? 'move' : 'default',
                                touchAction: isZoomed ? 'none' : 'auto',
                                userSelect: 'none'
                            }}
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
                                <div><strong>Model:</strong> <span className="selectable-setting" onClick={() => dispatch({ type: actions.SET_SELECTED_MODEL, payload: currentImage.model })} title="Set as current model">
                                    {currentImage.model || 'N/A'}
                                </span></div>
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
                            {currentImage.loras && (() => {
                                const loras = typeof currentImage.loras === 'string'
                                    ? JSON.parse(currentImage.loras)
                                    : currentImage.loras;

                                const hasActiveSliders = loras.sliders && Object.values(loras.sliders).some(s => s.enabled);
                                const hasActiveToggles = loras.toggles && Object.values(loras.toggles).some(t => t);
                                const hasStyle = loras.style && loras.style !== '';

                                if (!hasActiveSliders && !hasActiveToggles && !hasStyle) {
                                    return null;
                                }

                                return (
                                    <div className="settings-display" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ marginBottom: '0.75rem' }}><strong>Loras:</strong></div>

                                        {hasStyle && (
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Style:</div>
                                                <div style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>{loras.style}</div>
                                            </div>
                                        )}

                                        {hasActiveSliders && (
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sliders:</div>
                                                {Object.entries(loras.sliders)
                                                    .filter(([_, slider]) => slider.enabled)
                                                    .map(([name, slider]) => (
                                                        <div key={name} style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>
                                                            {name}: {slider.value?.toFixed(1)}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}

                                        {hasActiveToggles && (
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggles:</div>
                                                {Object.entries(loras.toggles)
                                                    .filter(([_, enabled]) => enabled)
                                                    .map(([name]) => (
                                                        <div key={name} style={{ fontSize: '0.85rem', marginTop: '0.125rem' }}>
                                                            {name}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                                onClick={async () => {
                                    try {
                                        const res = await fetch(currentImage.url);
                                        const blob = await res.blob();
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            dispatch({ type: actions.SET_INIT_IMAGE, payload: reader.result });
                                            // Clear any existing mask; user can create a new one for this source
                                            dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                                            dispatch({
                                                type: actions.SET_STATUS,
                                                payload: { type: 'success', message: 'Set current image as Img2Img source' }
                                            });
                                            // Close lightbox per request
                                            onClose();
                                        };
                                        reader.readAsDataURL(blob);
                                    } catch (err) {
                                        console.error('Failed to set init image:', err);
                                        dispatch({
                                            type: actions.SET_STATUS,
                                            payload: { type: 'error', message: 'Failed to use image as source' }
                                        });
                                    }
                                }}
                                title="Use as Img2Img source"
                            >
                                <i className="fa fa-file-image-o"></i> <span className="btn-label">Img2Img</span>
                            </button>
                            <button
                                className="image-btn secondary"
                                onClick={async () => {
                                    try {
                                        const res = await fetch(currentImage.url);
                                        const blob = await res.blob();
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            dispatch({ type: actions.SET_INIT_IMAGE, payload: reader.result });
                                            // Reset previous mask and open modal to paint a new one
                                            dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                                            dispatch({ type: actions.SET_SHOW_INPAINT_MODAL, payload: true });
                                            // Close lightbox per request
                                            onClose();
                                        };
                                        reader.readAsDataURL(blob);
                                    } catch (err) {
                                        console.error('Failed to start inpaint:', err);
                                        dispatch({
                                            type: actions.SET_STATUS,
                                            payload: { type: 'error', message: 'Failed to start inpaint' }
                                        });
                                    }
                                }}
                                title="Inpaint: paint a mask and regenerate"
                            >
                                <i className="fa fa-paint-brush"></i> <span className="btn-label">Inpaint</span>
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

            <LocationPicker
                show={showFolderSelector}
                onClose={() => setShowFolderSelector(false)}
                onSelect={handleMoveToFolder}
                currentFolderId={currentImage?.folder_id}
                currentCharacterId={currentImage?.character_id}
                title="Move to Folder"
                mode="move"
            />
        </div>
    );
}

export default Lightbox;
