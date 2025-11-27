'use client';

import { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useFolders } from '../hooks';
import { imageAPI } from '../utils/backend-api';
import { sendNotification } from '../utils/notifications';
import { useImagesRealtime } from '@/app/hooks/realtime';
import { useImageSync } from '@/app/hooks/realtime-sync';
import ImageGallery from './ImageGallery';
import GalleryLightbox from './GalleryLightbox';

/**
 * Container component that manages state and API calls for ImageGallery and Lightbox.
 * This component handles all business logic, state management, and API interactions,
 * while the presentational components focus purely on rendering UI.
 */
function GalleryWithLightboxContainer({ onRestoreSettings }) {
    const { state, dispatch, actions } = useApp();
    const { loadFolders } = useFolders();
    // Enable realtime image events within the container
    useImagesRealtime();
    useImageSync();
    const {
        images,
        totalImages,
        hasMore,
        isLoadingMore,
        selectedImages,
        isSelecting,
        hideNsfw,
        showFavoritesOnly,
        lightboxIndex,
        lastClickedIndex,
        showImageInfo,
        folders,
        characters
    } = state;

    // === Image Loading (moved from useImages hook into this container) ===

    const loadImages = useCallback(async (offset = 0, folderId = state.currentFolder, characterId = state.selectedCharacter) => {
        try {
            const data = await imageAPI.getAll({
                folderId: folderId,
                character_id: characterId,
                limit: 50,
                offset
            });

            if (offset === 0) {
                dispatch({ type: actions.SET_IMAGES, payload: data.images });
            } else {
                dispatch({ type: actions.APPEND_IMAGES, payload: data.images });
            }

            dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: data.total });
        } catch (err) {
            // Use unified notification helper
            sendNotification('Failed to load images', 'error', dispatch, actions, state.notificationsEnabled);
        }
    }, [dispatch, actions, state.currentFolder, state.selectedCharacter, state.notificationsEnabled]);

    const loadMoreImages = useCallback(async () => {
        if (state.isLoadingMore || !state.hasMore) return;
        dispatch({ type: actions.SET_LOADING_MORE, payload: true });
        try {
            await loadImages(state.images.length);
        } finally {
            dispatch({ type: actions.SET_LOADING_MORE, payload: false });
        }
    }, [state.isLoadingMore, state.hasMore, state.images.length, dispatch, actions, loadImages]);

    // Initial and reactive loads when folder/character changes
    useEffect(() => {
        if (state.settingsLoaded) {
            loadImages(0, state.currentFolder, state.selectedCharacter);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.settingsLoaded, state.currentFolder, state.selectedCharacter]);

    // Filter images based on NSFW and favorites settings
    let filteredImages = images;
    if (hideNsfw) {
        filteredImages = filteredImages.filter(img => !img.is_nsfw);
    }
    if (showFavoritesOnly) {
        filteredImages = filteredImages.filter(img => img.is_favorite);
    }

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
        dispatch({ type: actions.SET_IS_SELECTING, payload: value });
    };

    // === ImageCard Handlers ===

    const handleToggleSelection = (imageId, imageIndex, shiftKey) => {
        // Check if shift key is pressed and we have a previous click
        if (shiftKey && lastClickedIndex !== null) {
            // Select range from lastClickedIndex to current index
            dispatch({
                type: actions.SELECT_IMAGE_RANGE,
                payload: { startIndex: lastClickedIndex, endIndex: imageIndex }
            });
        } else {
            // Normal toggle
            dispatch({ type: actions.TOGGLE_IMAGE_SELECTION, payload: imageId });
        }

        // Update last clicked index
        dispatch({ type: actions.SET_LAST_CLICKED_INDEX, payload: imageIndex });
    };

    const handleToggleFavoriteOnCard = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_favorite: !image.is_favorite
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

    const handleToggleNsfwOnCard = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_nsfw: !image.is_nsfw
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

    const handleFilterByFolder = (folderId) => {
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folderId });
    };

    const handleFilterByCharacter = (character) => {
        dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: character });
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
    };

    const handleFilterUnfiled = () => {
        dispatch({ type: actions.SET_CURRENT_FOLDER, payload: 'unfiled' });
    };

    const handleToggleFavoritesOnly = () => {
        dispatch({ type: actions.SET_SHOW_FAVORITES_ONLY, payload: !showFavoritesOnly });
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
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `Downloaded ${selectedImages.length} images` }
            });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to download images' } });
        }
    };

    const handleBulkDelete = async () => {
        if (typeof window === 'undefined') return;
        if (!window.confirm(`Delete ${selectedImages.length} selected images?`)) return;

        try {
            await imageAPI.bulkDelete(selectedImages);
            selectedImages.forEach(id => {
                dispatch({ type: actions.REMOVE_IMAGE, payload: id });
            });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: totalImages - selectedImages.length });
            dispatch({ type: actions.CLEAR_SELECTION });
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `Deleted ${selectedImages.length} images` }
            });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to delete images' } });
        }
    };

    const handleBulkMove = async (folderId) => {
        try {
            await imageAPI.bulkMove(selectedImages, folderId || null);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `Moved ${selectedImages.length} images` }
            });
            dispatch({ type: actions.CLEAR_SELECTION });
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            sendNotification('Failed to move images', 'error', dispatch, actions, state.notificationsEnabled);
        }
    };

    const handleBulkSetNSFW = async (value) => {
        if (selectedImages.length === 0) return;
        // Optimistic update
        try {
            const ids = [...selectedImages];
            const currentImages = [...images];
            ids.forEach(id => {
                const img = currentImages.find(i => i.id === id);
                if (img) {
                    dispatch({ type: actions.UPDATE_IMAGE, payload: { ...img, is_nsfw: !!value } });
                }
            });

            // Persist server-side
            await Promise.all(ids.map(async (id) => {
                const img = currentImages.find(i => i.id === id);
                if (!img) return;
                const updated = await imageAPI.updateFlags(img, { is_nsfw: !!value });
                // Ensure canonical server response is applied
                dispatch({ type: actions.UPDATE_IMAGE, payload: updated });
            }));

            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'success', message: `Marked ${selectedImages.length} image(s) as ${value ? 'NSFW' : 'SFW'}` }
            });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to update NSFW on some images' } });
        }
    };

    const handleImageMove = async (image, folderId) => {
        try {
            await imageAPI.update(image.id, { folderId: folderId || null });
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            sendNotification('Failed to move image', 'error', dispatch, actions, state.notificationsEnabled);
        }
    };

    const handleDeleteImage = async (imageId) => {
        try {
            await imageAPI.delete(imageId);
            dispatch({ type: actions.REMOVE_IMAGE, payload: imageId });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: totalImages - 1 });
            sendNotification('Image deleted', 'success', dispatch, actions, state.notificationsEnabled);
        } catch (err) {
            sendNotification('Failed to delete image', 'error', dispatch, actions, state.notificationsEnabled);
        }
    };

    // === Lightbox Handlers ===

    const handleOpenLightbox = (index) => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: index });
    };

    const handleCloseLightbox = () => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
    };

    const handleNavigate = (newFilteredIndex) => {
        if (newFilteredIndex >= 0 && newFilteredIndex < filteredImages.length) {
            const targetImage = filteredImages[newFilteredIndex];
            const originalIndex = images.findIndex(img => img.id === targetImage.id);
            if (originalIndex !== -1) {
                dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: originalIndex });
            }
        }
    };

    const handleMoveToFolder = async (imageId, folderId) => {
        try {
            await imageAPI.update(imageId, { folderId: folderId || null });
            await loadFolders();
            // Real-time sync will handle UI updates automatically
        } catch (err) {
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to move image' }
            });
        }
    };

    const handleDownload = (image) => {
        imageAPI.download(image);
    };

    const handleCopyToClipboard = async (image) => {
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

    const handleToggleFavorite = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_favorite: !image.is_favorite
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

    const handleToggleNsfw = async (image) => {
        try {
            const updatedImage = await imageAPI.updateFlags(image, {
                is_nsfw: !image.is_nsfw
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

    const handleSetInitImage = async (image) => {
        try {
            const res = await fetch(image.url);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                dispatch({ type: actions.SET_INIT_IMAGE, payload: reader.result });
                dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'success', message: 'Set current image as Img2Img source' }
                });
                handleCloseLightbox();
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Failed to set init image:', err);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to use image as source' }
            });
        }
    };

    const handleStartInpaint = async (image) => {
        try {
            const res = await fetch(image.url);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                dispatch({ type: actions.SET_INIT_IMAGE, payload: reader.result });
                dispatch({ type: actions.SET_MASK_IMAGE, payload: null });
                dispatch({ type: actions.SET_SHOW_INPAINT_MODAL, payload: true });
                handleCloseLightbox();
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error('Failed to start inpaint:', err);
            dispatch({
                type: actions.SET_STATUS,
                payload: { type: 'error', message: 'Failed to start inpaint' }
            });
        }
    };

    const handleSetModel = (model) => {
        dispatch({ type: actions.SET_SELECTED_MODEL, payload: model });
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

export default GalleryWithLightboxContainer;