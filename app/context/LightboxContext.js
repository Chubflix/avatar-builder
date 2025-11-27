import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LightboxContext = createContext(null);

/**
 * Hook to access Lightbox context
 * Must be used within a LightboxProvider
 */
export function useLightbox() {
    const context = useContext(LightboxContext);
    if (!context) {
        throw new Error('useLightbox must be used within a LightboxProvider');
    }
    return context;
}

/**
 * LightboxProvider manages generic lightbox UI state and behavior
 * This context is implementation-agnostic and can be reused for any lightbox use case
 * Business logic handlers should be passed directly to sub-components as props
 */
export function LightboxProvider({
    children,
    images,
    filteredImages,
    currentImage,
    filteredLightboxIndex,
    lightboxIndex,
    hasMore,
    isLoadingMore,
    onClose,
    onNavigate,
    onLoadMore
}) {
    // UI State
    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });

    // Zoom state
    const [isZoomed, setIsZoomed] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isMousePanning, setIsMousePanning] = useState(false);

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

    // Build a linear ancestry chain from original -> ... -> current
    const comparisonChain = useMemo(() => {
        if (!currentImage) return [];
        const byId = new Map(images.map(img => [img.id, img]));

        const chain = [];
        let cursor = currentImage;
        while (cursor) {
            chain.unshift(cursor);
            const parentId = cursor.parent_image_id || null;
            if (!parentId) break;
            const parent = byId.get(parentId);
            if (!parent) {
                chain.unshift({ id: `missing-${parentId}`, __missing: true });
                break;
            }
            cursor = parent;
        }
        return chain;
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
        const midIndex = Math.floor((chain.length - 1) / 2);
        const mid = chain[midIndex];
        const items = [original];
        if (mid.id !== original.id && mid.id !== last.id) items.push(mid);
        if (items.length < 2 && chain.length > 2) items.push(chain[1]);
        items.push(last);
        const unique = [];
        const seen = new Set();
        for (const it of items) {
            if (!seen.has(it.id)) { seen.add(it.id); unique.push(it); }
        }
        const moreCount = Math.max(0, chain.length - unique.length);
        return { items: unique.slice(0, 3), moreCount };
    }, [comparisonChain]);

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
    }, [filteredLightboxIndex, filteredImages, hasMore, isLoadingMore, onLoadMore]);

    // Keyboard navigation - only generic lightbox controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!currentImage) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (filteredLightboxIndex > 0) {
                        onNavigate(filteredLightboxIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                    if (filteredLightboxIndex < filteredImages.length - 1) {
                        onNavigate(filteredLightboxIndex + 1);
                    }
                    break;
                case 'ArrowDown':
                    onClose();
                    break;
                case 'i':
                    setShowGenerationDetails(!showGenerationDetails);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentImage, filteredLightboxIndex, filteredImages, showGenerationDetails, onClose, onNavigate]);

    // Prevent body scroll
    useEffect(() => {
        if (currentImage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [currentImage]);

    // Reset zoom when image changes
    useEffect(() => {
        setIsZoomed(false);
        setPanPosition({ x: 0, y: 0 });
    }, [currentImage]);

    // Touch handlers
    const handleTouchStart = (e) => {
        const touch = e.targetTouches[0];

        if (isZoomed) {
            setIsPanning(true);
            setPanStart({
                x: touch.clientX - panPosition.x,
                y: touch.clientY - panPosition.y
            });
        } else {
            setTouchEnd({ x: null, y: null });
            setTouchStart({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    };

    const handleTouchMove = (e) => {
        const touch = e.targetTouches[0];

        if (isZoomed && isPanning) {
            e.preventDefault();
            setPanPosition({
                x: touch.clientX - panStart.x,
                y: touch.clientY - panStart.y
            });
        } else if (!isZoomed) {
            setTouchEnd({
                x: touch.clientX,
                y: touch.clientY
            });
        }
    };

    const handleTouchEnd = () => {
        if (isZoomed) {
            setIsPanning(false);
            return;
        }

        if (!touchStart.x || !touchStart.y || !touchEnd.x || !touchEnd.y) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;

        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontalSwipe) {
            const isLeftSwipe = distanceX > minSwipeDistance;
            const isRightSwipe = distanceX < -minSwipeDistance;

            if (isLeftSwipe && filteredLightboxIndex < filteredImages.length - 1) {
                onNavigate(filteredLightboxIndex + 1);
            } else if (isRightSwipe && filteredLightboxIndex > 0) {
                onNavigate(filteredLightboxIndex - 1);
            }
        } else {
            const isUpSwipe = distanceY > minSwipeDistance;
            const isDownSwipe = distanceY < -minSwipeDistance;

            if (isUpSwipe) {
                if (!showGenerationDetails) {
                    setShowGenerationDetails(true);
                }
            } else if (isDownSwipe) {
                if (showGenerationDetails) {
                    setShowGenerationDetails(false);
                } else {
                    onClose();
                }
            }
        }
    };

    // Zoom toggle
    const handleToggleZoom = () => {
        if (showGenerationDetails) return;
        setIsZoomed(prev => {
            const next = !prev;
            if (!next) {
                setPanPosition({ x: 0, y: 0 });
            }
            return next;
        });
    };

    // Mouse handlers for panning when zoomed
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

    // Add mouse up listener to window
    useEffect(() => {
        if (isMousePanning) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isMousePanning]);

    const value = {
        // Data
        images,
        filteredImages,
        currentImage,
        filteredLightboxIndex,
        lightboxIndex,
        hasMore,
        isLoadingMore,

        // Generic lightbox UI state
        isZoomed,
        panPosition,
        isPanning,
        isMousePanning,
        showGenerationDetails,
        setShowGenerationDetails,
        comparisonSelection,

        // Generic UI handlers
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleToggleZoom,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,

        // Navigation actions
        onClose,
        onNavigate,
        onLoadMore
    };

    return (
        <LightboxContext.Provider value={value}>
            {children}
        </LightboxContext.Provider>
    );
}
