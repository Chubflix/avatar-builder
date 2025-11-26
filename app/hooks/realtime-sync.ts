// @ts-nocheck
/**
 * Comprehensive real-time synchronization hooks (TypeScript)
 * Listens for all CRUD events across images, folders, and characters
 */

import { useApp } from "@/app/context/AppContext";
import { useEffect } from "react";
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
                payload: imageAPI.getById(data.id)
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
        };

        channel.subscribe('image_updated', onImageUpdated);
        channel.subscribe('image_moved', onImageMoved);
        channel.subscribe('image_deleted', onImageDeleted);

        return () => {
            try { channel.unsubscribe('image_updated', onImageUpdated); } catch (_) {}
            try { channel.unsubscribe('image_moved', onImageMoved); } catch (_) {}
            try { channel.unsubscribe('image_deleted', onImageDeleted); } catch (_) {}
            try { realtime.channels.release('images'); } catch (_) {}
        };
    }, [state.images, state.currentFolder, state.totalImages, dispatch, actions]);
}

/**
 * Hook to sync folder CRUD operations in real-time
 */
export function useFolderSync() {
    const { dispatch, actions } = useApp();

    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('FolderSync', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('folders');

        const onFolderCreated = async (_payload) => {
            try {
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            } catch (err) {
                debug.warn('FolderSync', 'Failed to refresh folders after create', err);
            }
        };

        const onFolderDeleted = async (_payload) => {
            try {
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            } catch (err) {
                debug.warn('FolderSync', 'Failed to refresh folders after delete', err);
            }
        };

        channel.subscribe('folder_created', onFolderCreated);
        channel.subscribe('folder_deleted', onFolderDeleted);

        return () => {
            try { channel.unsubscribe('folder_created', onFolderCreated); } catch (_) {}
            try { channel.unsubscribe('folder_deleted', onFolderDeleted); } catch (_) {}
            try { realtime.channels.release('folders'); } catch (_) {}
        };
    }, [dispatch, actions]);
}

/**
 * Hook to sync character-related operations (optional extension)
 */
export function useCharacterSync() {
    const { /* state,*/ dispatch, actions } = useApp();

    useEffect(() => {
        const realtime = getAblyRealtime();
        if (!realtime) {
            debug.warn('CharacterSync', 'Ably not configured; skipping subscription');
            return () => {};
        }

        const channel = realtime.channels.get('characters');

        const onCharacterUpdated = async (_payload) => {
            try {
                // No dedicated endpoint here; folders list contains character nesting for most views
                const folders = await folderAPI.getAll();
                dispatch({ type: actions.SET_FOLDERS, payload: folders });
            } catch (err) {
                debug.warn('CharacterSync', 'Failed to refresh data after character update', err);
            }
        };

        channel.subscribe('character_updated', onCharacterUpdated);

        return () => {
            try { channel.unsubscribe('character_updated', onCharacterUpdated); } catch (_) {}
            try { realtime.channels.release('characters'); } catch (_) {}
        };
    }, [dispatch, actions]);
}
