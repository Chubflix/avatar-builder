'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { imageAPI } from '../utils/backend-api';
import { useRealtimeImages } from '@/app/hooks/images/realtime';
import ImageGallery from './ImageGallery';
import GalleryLightbox from './GalleryLightbox';
import debug from "@/app/utils/debug";

/**
 * Container component that manages state and API calls for ImageGallery and Lightbox.
 * This component handles all business logic, state management, and API interactions,
 * while the presentational components focus purely on rendering UI.
 */
function GalleryWithLightboxContainer({
    onRestoreSettings,
    currentFolder,
    selectedCharacter,
    onCurrentFolderChange: setCurrentFolder,
    onSelectedCharacterChange: setSelectedCharacter,
    onNotify: notify,
    onStatus: setStatus,
    onInitMask: setInitMask,
    onInitImage: setInitImage,
    onTotalImagesChange,
    hideNsfw,
    folders,
    characters,
    settingsLoaded,
    onSetModel,
    onReloadFolders,
    showImageInfoPreference,
}) {
    debug.log("GalleryWithLightboxContainer", "render");

    // Localize gallery/lightbox state to this container
    const [images, setImages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [showImageInfo, setShowImageInfo] = useState(showImageInfoPreference);
    const [totalImages, setTotalImages] = useState(0);

    // Enable realtime image events within the container
    useRealtimeImages({
        selectedFolder: currentFolder,
        selectedCharacter: selectedCharacter,
        images: images,
        onAddImage: useCallback((image) => {
            setImages((prev) => [image, ...prev]);
            setTotalImages(prev => {
                const next = prev + 1;
                if (onTotalImagesChange) onTotalImagesChange(next);
                return next;
            });
        }, [onTotalImagesChange]),
        onUpdateImage: useCallback((image) => {
            setImages(prev => prev.map(img => (String(img.id) === String(image.id) ? image : img)));
        }, []),
        onRemoveImage: useCallback((id) => {
            setImages(prev => prev.filter(img => String(img.id) !== String(id)));
            setTotalImages(prev => {
                const next = Math.max(0, (prev || 0) - 1);
                if (onTotalImagesChange) onTotalImagesChange(next);
                return next;
            });
        }, [onTotalImagesChange]),
    });

    // Keep local showImageInfo in sync with preference changes from parent
    useEffect(() => {
        setShowImageInfo(showImageInfoPreference);
    }, [showImageInfoPreference]);

    const loadImages = useCallback(async (offset = 0, folderId = currentFolder, characterId = selectedCharacter) => {
        try {
            const data = await imageAPI.getAll({
                folderId: folderId,
                character_id: characterId,
                limit: 50,
                offset
            });

            if (offset === 0) {
                setImages(data.images || []);
            } else {
                setImages(prev => ([...prev, ...((data.images) || [])]));
            }

            setHasMore(!!data.hasMore);
            const nextTotal = Number(data.total || 0);
            setTotalImages(nextTotal);
            if (onTotalImagesChange) onTotalImagesChange(nextTotal);
        } catch (err) {
            // Notify via page-level handler
            if (notify) notify('Failed to load images', 'error');
        }
    }, [currentFolder, selectedCharacter, notify, onTotalImagesChange]);

    const loadMoreImages = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            await loadImages(images.length);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, images.length, loadImages]);

    // Initial and reactive loads when folder/character changes
    useEffect(() => {
        if (settingsLoaded) {
            loadImages(0, currentFolder, selectedCharacter);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsLoaded, currentFolder, selectedCharacter]);

    // Filter images based on NSFW and favorites settings
    const filteredImages = useMemo(() => {
        let list = images;
        if (hideNsfw) list = list.filter(img => !img.is_nsfw);
        if (showFavoritesOnly) list = list.filter(img => img.is_favorite);
        return list;
    }, [images, hideNsfw, showFavoritesOnly]);

    // Calculate lightbox state from filtered images
    const currentImageFromOriginal = lightboxIndex !== null ? images[lightboxIndex] : null;
    const filteredLightboxIndex = currentImageFromOriginal
        ? filteredImages.findIndex(img => img.id === currentImageFromOriginal.id)
        : null;
    const currentImage = filteredLightboxIndex !== null && filteredLightboxIndex !== -1
        ? filteredImages[filteredLightboxIndex]
        : null;

    // === Gallery Handlers ===

    const handleToggleSelecting = (value) => {
        setIsSelecting(!!value);
    };

    // === ImageCard Handlers ===

    const handleToggleSelection = (imageId, imageIndex, shiftKey) => {
        // Check if shift key is pressed and we have a previous click
        if (shiftKey && lastClickedIndex !== null) {
            const start = Math.min(lastClickedIndex, imageIndex);
            const end = Math.max(lastClickedIndex, imageIndex);
            const rangeIds = images.slice(start, end + 1).map(img => img.id);
            setSelectedImages(prev => Array.from(new Set([...(prev || []), ...rangeIds])));
        } else {
            setSelectedImages(prev => (prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]));
        }

        // Update last clicked index
        setLastClickedIndex(imageIndex);
    };

    const handleToggleFavoriteOnCard = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_favorite: !image.is_favorite
            });
            setImages(prev => prev.map(img => (img.id === updatedImage.id ? updatedImage : img)));
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            setStatus && setStatus({ type: 'error', message: 'Failed to update favorite' });
        }
    };

    const handleToggleNsfwOnCard = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_nsfw: !image.is_nsfw
            });
            setImages(prev => prev.map(img => (img.id === updatedImage.id ? updatedImage : img)));
        } catch (error) {
            console.error('Failed to toggle NSFW:', error);
            setStatus && setStatus({ type: 'error', message: 'Failed to update NSFW flag' });
        }
    };

    const handleFilterByFolder = (folderId) => {
        setCurrentFolder && setCurrentFolder(folderId);
    };

    const handleFilterByCharacter = (character) => {
        setSelectedCharacter && setSelectedCharacter(character);
        setCurrentFolder && setCurrentFolder(null);
    };

    const handleFilterUnfiled = () => {
        setCurrentFolder && setCurrentFolder('unfiled');
    };

    const handleToggleFavoritesOnly = () => {
        setShowFavoritesOnly(prev => !prev);
    };

    const handleSelectAll = () => {
        setSelectedImages(images.map(img => img.id));
    };

    const handleClearSelection = () => {
        setSelectedImages([]);
        setIsSelecting(false);
        setLastClickedIndex(null);
    };

    const handleBulkDownload = async () => {
        try {
            await imageAPI.downloadZip(selectedImages);
            setStatus && setStatus({ type: 'success', message: `Downloaded ${selectedImages.length} images` });
        } catch (err) {
            setStatus && setStatus({ type: 'error', message: 'Failed to download images' });
        }
    };

    const handleBulkDelete = async () => {
        if (typeof window === 'undefined') return;
        if (!window.confirm(`Delete ${selectedImages.length} selected images?`)) return;

        try {
            await imageAPI.bulkDelete(selectedImages);
            setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
            const nextTotal = Math.max(0, Number(totalImages || 0) - selectedImages.length);
            setTotalImages(nextTotal);
            if (onTotalImagesChange) onTotalImagesChange(nextTotal);
            setSelectedImages([]);
            setIsSelecting(false);
            setLastClickedIndex(null);
            setStatus && setStatus({ type: 'success', message: `Deleted ${selectedImages.length} images` });
        } catch (err) {
            setStatus && setStatus({ type: 'error', message: 'Failed to delete images' });
        }
    };

    const handleBulkMove = async (folderId) => {
        try {
            await imageAPI.bulkMove(selectedImages, folderId || null);
            setStatus && setStatus({ type: 'success', message: `Moved ${selectedImages.length} images` });
            setSelectedImages([]);
            setIsSelecting(false);
            setLastClickedIndex(null);
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            if (notify) notify('Failed to move images', 'error');
        }
    };

    const handleBulkSetNSFW = async (value) => {
        if (selectedImages.length === 0) return;
        // Optimistic update
        try {
            const ids = [...selectedImages];
            setImages(prev => prev.map(img => (ids.includes(img.id) ? { ...img, is_nsfw: !!value } : img)));

            // Persist server-side
            await Promise.all(ids.map(async (id) => {
                const img = (images || []).find(i => i.id === id);
                if (!img) return;
                const updated = await imageAPI.updateFlags(img, { is_nsfw: !!value });
                // Ensure canonical server response is applied
                setImages(prev => prev.map(it => (it.id === updated.id ? updated : it)));
            }));

            setStatus && setStatus({ type: 'success', message: `Marked ${selectedImages.length} image(s) as ${value ? 'NSFW' : 'SFW'}` });
        } catch (err) {
            setStatus && setStatus({ type: 'error', message: 'Failed to update NSFW on some images' });
        }
    };

    const handleImageMove = async (image, folderId) => {
        try {
            await imageAPI.update(image.id, { folderId: folderId || null });
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            if (notify) notify('Failed to move image', 'error');
        }
    };

    const handleDeleteImage = async (imageId) => {
        try {
            await imageAPI.delete(imageId);
            setImages(prev => prev.filter(img => img.id !== imageId));
            const nextTotal = Math.max(0, Number(totalImages || 0) - 1);
            setTotalImages(nextTotal);
            if (onTotalImagesChange) onTotalImagesChange(nextTotal);
            if (notify) notify('Image deleted', 'success');
        } catch (err) {
            if (notify) notify('Failed to delete image', 'error');
        }
    };

    // === Lightbox Handlers ===

    const handleOpenLightbox = (index) => {
        setLightboxIndex(index);
    };

    const handleCloseLightbox = () => {
        setLightboxIndex(null);
    };

    const handleNavigate = (newFilteredIndex) => {
        if (newFilteredIndex >= 0 && newFilteredIndex < filteredImages.length) {
            const targetImage = filteredImages[newFilteredIndex];
            const originalIndex = images.findIndex(img => img.id === targetImage.id);
            if (originalIndex !== -1) {
                setLightboxIndex(originalIndex);
            }
        }
    };

    const handleMoveToFolder = async (imageId, folderId) => {
        try {
            await imageAPI.update(imageId, { folderId: folderId || null });
            if (onReloadFolders) await onReloadFolders();
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            setStatus && setStatus({ type: 'error', message: 'Failed to move image' });
        }
    };

    const handleDownload = (image) => {
        imageAPI.download(image);
    };

    const handleCopyToClipboard = async (image) => {
        try {
            await imageAPI.copyToClipboard(image);
            setStatus && setStatus({ type: 'success', message: 'Image copied to clipboard!' });
        } catch (err) {
            setStatus && setStatus({ type: 'error', message: 'Failed to copy image' });
        }
    };

    const handleToggleFavorite = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_favorite: !image.is_favorite
            });
            // Update local list to avoid global context dependency
            setImages(prev => prev.map(img => (img.id === updatedImage.id ? updatedImage : img)));
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            setStatus && setStatus({ type: 'error', message: 'Failed to update favorite' });
        }
    };

    const handleToggleNsfw = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_nsfw: !image.is_nsfw
            });
            // Update local list to avoid global context dependency
            setImages(prev => prev.map(img => (img.id === updatedImage.id ? updatedImage : img)));
        } catch (error) {
            console.error('Failed to toggle NSFW:', error);
            setStatus && setStatus({ type: 'error', message: 'Failed to update NSFW flag' });
        }
    };

    const handleSetInitImage = async (image) => {
        try {
            const res = await fetch(image.url);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                setInitImage && setInitImage(reader.result, { openInpaint: false });
                setInitMask && setInitMask(null);
                setStatus && setStatus({ type: 'success', message: 'Set current image as Img2Img source' });
                handleCloseLightbox();
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Failed to set init image:', err);
            setStatus && setStatus({ type: 'error', message: 'Failed to use image as source' });
        }
    };

    const handleStartInpaint = async (image) => {
        try {
            const res = await fetch(image.url);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                setInitImage && setInitImage(reader.result, { openInpaint: true });
                setInitMask && setInitMask(null);
                handleCloseLightbox();
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Failed to start inpaint:', err);
            setStatus && setStatus({ type: 'error', message: 'Failed to start inpaint' });
        }
    };

    const handleSetModel = (model) => {
        if (onSetModel) onSetModel(model);
    };

    // Custom keyboard shortcuts for this specific lightbox implementation (d, f, h keys)
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e) => {
            const image = currentImage;
            if (!image) return;

            switch (e.key) {
                case 'd':
                    // noinspection JSIgnoredPromiseFromCall
                    handleDeleteImage(image.id);
                    break;
                case 'f':
                    // noinspection JSIgnoredPromiseFromCall
                    handleToggleFavorite(image);
                    break;
                case 'h':
                    // noinspection JSIgnoredPromiseFromCall
                    handleToggleNsfw(image);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, currentImage]);

    return (
        <>
            <ImageGallery
                images={images}
                filteredImages={filteredImages}
                totalImages={totalImages}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                selectedImages={selectedImages}
                isSelecting={isSelecting}
                hideNsfw={hideNsfw}
                showFavoritesOnly={showFavoritesOnly}
                lastClickedIndex={lastClickedIndex}
                showImageInfo={showImageInfo}
                folders={folders}
                characters={characters}
                onOpenLightbox={handleOpenLightbox}
                onRestoreSettings={onRestoreSettings}
                onDelete={handleDeleteImage}
                onLoadMore={loadMoreImages}
                onImageMove={handleImageMove}
                onToggleSelecting={handleToggleSelecting}
                onToggleFavoritesOnly={handleToggleFavoritesOnly}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onBulkDownload={handleBulkDownload}
                onBulkDelete={handleBulkDelete}
                onBulkMove={handleBulkMove}
                onBulkSetNSFW={handleBulkSetNSFW}
                onDownload={handleDownload}
                onToggleSelection={handleToggleSelection}
                onToggleFavoriteOnCard={handleToggleFavoriteOnCard}
                onToggleNsfwOnCard={handleToggleNsfwOnCard}
                onFilterByFolder={handleFilterByFolder}
                onFilterByCharacter={handleFilterByCharacter}
                onFilterUnfiled={handleFilterUnfiled}
            />

            {lightboxIndex !== null && (
                <GalleryLightbox
                    images={images}
                    filteredImages={filteredImages}
                    currentImage={currentImage}
                    filteredLightboxIndex={filteredLightboxIndex}
                    lightboxIndex={lightboxIndex}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onClose={handleCloseLightbox}
                    onNavigate={handleNavigate}
                    onLoadMore={loadMoreImages}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleNsfw={handleToggleNsfw}
                    onSetModel={handleSetModel}
                    onMoveToFolder={handleMoveToFolder}
                    onDownload={handleDownload}
                    onCopyToClipboard={handleCopyToClipboard}
                    onSetInitImage={handleSetInitImage}
                    onStartInpaint={handleStartInpaint}
                    onRestoreSettings={onRestoreSettings}
                    onDelete={handleDeleteImage}
                />
            )}
        </>
    );
}

export default React.memo(GalleryWithLightboxContainer);