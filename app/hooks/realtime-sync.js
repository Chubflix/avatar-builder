/**
 * Comprehensive real-time synchronization hooks
 * Listens for all CRUD events across images, folders, and characters
 */

import { useApp } from "@/app/context/AppContext";
import { useEffect, useRef } from "react";
import { getAblyRealtime } from "@/app/lib/ably";
import debug from "@/app/utils/debug";
import { imageAPI, folderAPI } from "@/app/utils/backend-api";

/**
 * Hook to sync image operations in real-time
 * Handles: updated (favorite/nsfw), moved, deleted
 */
export function useImageSync() {
    const { state, dispatch, actions } = useApp();

    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('ImageSync', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('images');

        // Image updated (favorite/nsfw flags changed)
        const onImageUpdated = (payload) => {
            const data = payload?.data ?? payload;
            debug.log('ImageSync', 'image_updated', data);

            if (!data?.id) return;

            // Update image in local state
            dispatch({
                type: actions.UPDATE_IMAGE,
                payload: {
                    id: data.id,
                    is_favorite: data.is_favorite,
                    is_nsfw: data.is_nsfw
                }
            });
        };

        // Image moved to different folder
        const onImageMoved = async (payload) => {
            const data = payload?.data ?? payload;
            debug.log('ImageSync', 'image_moved', data);

            if (!data?.id) return;

            // Check if image exists in current view
            const imageExists = state.images.some(img => img.id === data.id);

            // If viewing "All Images" (no folder filter), just update the image's folder
            if (state.currentFolder === null) {
                try {
                    const image = await imageAPI.getById(data.id);
                    if (image) {
                        dispatch({ type: actions.UPDATE_IMAGE, payload: image });
                    }
                } catch (err) {
                    debug.warn('ImageSync', 'Failed to fetch moved image', err);
                }
                return;
            }

            // Viewing a specific folder
            const isMovingToCurrentFolder = String(state.currentFolder) === String(data.folder_id);
            const isMovingFromCurrentFolder = imageExists && !isMovingToCurrentFolder;

            if (isMovingFromCurrentFolder) {
                // Image moved OUT of current folder → remove it
                debug.log('ImageSync', 'Removing image moved out of current folder', data.id);
                dispatch({ type: actions.REMOVE_IMAGE, payload: data.id });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: Math.max(0, state.totalImages - 1) });
            } else if (isMovingToCurrentFolder && !imageExists) {
                // Image moved INTO current folder and not already in view → add it
                debug.log('ImageSync', 'Adding image moved into current folder', data.id);
                try {
                    const image = await imageAPI.getById(data.id);
                    if (image) {
                        dispatch({ type: actions.ADD_IMAGES, payload: [image] });
                        dispatch({ type: actions.SET_TOTAL_IMAGES, payload: state.totalImages + 1 });
                    }
                } catch (err) {
                    debug.warn('ImageSync', 'Failed to fetch moved image', err);
                }
            } else if (isMovingToCurrentFolder && imageExists) {
                // Image already in current folder (moved within same folder) → update it
                debug.log('ImageSync', 'Updating image moved within current folder', data.id);
                try {
                    const image = await imageAPI.getById(data.id);
                    if (image) {
                        dispatch({ type: actions.UPDATE_IMAGE, payload: image });
                    }
                } catch (err) {
                    debug.warn('ImageSync', 'Failed to fetch moved image', err);
                }
            }
        };

        // Image deleted
        const onImageDeleted = (payload) => {
            const data = payload?.data ?? payload;
            debug.log('ImageSync', 'image_deleted', data);

            if (!data?.id) return;

            dispatch({ type: actions.REMOVE_IMAGE, payload: data.id });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: Math.max(0, state.totalImages - 1) });

            // Close lightbox if deleted image was being viewed
            if (state.lightboxIndex !== null) {
                const currentImage = state.images[state.lightboxIndex];
                if (currentImage && currentImage.id === data.id) {
                    dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
                }
            }
        };

        channel.subscribe('image_updated', onImageUpdated);
        channel.subscribe('image_moved', onImageMoved);
        channel.subscribe('image_deleted', onImageDeleted);
        debug.log('ImageSync', 'Subscribed to image events');

        return () => {
            try {
                channel.unsubscribe('image_updated', onImageUpdated);
                channel.unsubscribe('image_moved', onImageMoved);
                channel.unsubscribe('image_deleted', onImageDeleted);
                realtime.channels.release('images');
            } catch (_) { /* noop */ }
        };
    }, [state.currentFolder, state.images, state.lightboxIndex, state.totalImages, dispatch, actions]);
}

/**
 * Hook to sync folder operations in real-time
 * Handles: created, updated, deleted
 */
export function useFolderSync() {
    const { state, dispatch, actions } = useApp();

    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('FolderSync', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('folders');

        // Folder created
        const onFolderCreated = async (payload) => {
            const data = payload?.data ?? payload;
            debug.log('FolderSync', 'folder_created', data);

            if (!data?.id) return;

            // Refresh folders list
            try {
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            } catch (err) {
                debug.warn('FolderSync', 'Failed to refresh folders', err);
            }
        };

        // Folder updated
        const onFolderUpdated = async (payload) => {
            const data = payload?.data ?? payload;
            debug.log('FolderSync', 'folder_updated', data);

            if (!data?.id) return;

            // Refresh folders list
            try {
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            } catch (err) {
                debug.warn('FolderSync', 'Failed to refresh folders', err);
            }
        };

        // Folder deleted
        const onFolderDeleted = async (payload) => {
            const data = payload?.data ?? payload;
            debug.log('FolderSync', 'folder_deleted', data);

            if (!data?.id) return;

            // Refresh folders list
            try {
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });

                // If viewing deleted folder, switch to all images
                if (state.currentFolder === data.id) {
                    dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
                }
                if (state.selectedFolder === data.id) {
                    dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
                }
            } catch (err) {
                debug.warn('FolderSync', 'Failed to refresh folders', err);
            }
        };

        channel.subscribe('folder_created', onFolderCreated);
        channel.subscribe('folder_updated', onFolderUpdated);
        channel.subscribe('folder_deleted', onFolderDeleted);
        debug.log('FolderSync', 'Subscribed to folder events');

        return () => {
            try {
                channel.unsubscribe('folder_created', onFolderCreated);
                channel.unsubscribe('folder_updated', onFolderUpdated);
                channel.unsubscribe('folder_deleted', onFolderDeleted);
                realtime.channels.release('folders');
            } catch (_) { /* noop */ }
        };
    }, [state.currentFolder, state.selectedFolder, dispatch, actions]);
}

/**
 * Hook to sync character operations in real-time
 * Handles: created, updated, deleted
 */
export function useCharacterSync() {
    const { state, dispatch, actions } = useApp();

    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('CharacterSync', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('characters');

        // Refresh characters from API
        const refreshCharacters = async () => {
            try {
                const response = await fetch('/api/characters');
                if (response.ok) {
                    const characters = await response.json();
                    dispatch({ type: actions.SET_CHARACTERS, payload: characters });
                }
            } catch (err) {
                debug.warn('CharacterSync', 'Failed to refresh characters', err);
            }
        };

        // Character created
        const onCharacterCreated = (payload) => {
            const data = payload?.data ?? payload;
            debug.log('CharacterSync', 'character_created', data);
            refreshCharacters();
        };

        // Character updated
        const onCharacterUpdated = (payload) => {
            const data = payload?.data ?? payload;
            debug.log('CharacterSync', 'character_updated', data);
            refreshCharacters();
        };

        // Character deleted
        const onCharacterDeleted = (payload) => {
            const data = payload?.data ?? payload;
            debug.log('CharacterSync', 'character_deleted', data);

            // Clear selected character if it was deleted
            if (state.selectedCharacter?.id === data.id) {
                dispatch({ type: actions.SET_SELECTED_CHARACTER, payload: null });
            }

            refreshCharacters();
        };

        channel.subscribe('character_created', onCharacterCreated);
        channel.subscribe('character_updated', onCharacterUpdated);
        channel.subscribe('character_deleted', onCharacterDeleted);
        debug.log('CharacterSync', 'Subscribed to character events');

        return () => {
            try {
                channel.unsubscribe('character_created', onCharacterCreated);
                channel.unsubscribe('character_updated', onCharacterUpdated);
                channel.unsubscribe('character_deleted', onCharacterDeleted);
                realtime.channels.release('characters');
            } catch (_) { /* noop */ }
        };
    }, [state.selectedCharacter, dispatch, actions]);
}
