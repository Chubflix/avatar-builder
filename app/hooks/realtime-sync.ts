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
