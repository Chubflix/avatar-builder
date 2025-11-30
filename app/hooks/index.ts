// @ts-nocheck
import {useCallback} from 'react';
import {useApp} from '../context/AppContext';
import sdAPI from '../utils/sd-api';
import {folderAPI} from '../utils/backend-api';
import debug from '../utils/debug';
import {sendNotification} from '../utils/notifications';
import {useQueue} from './queue';
import {notifyJobQueued} from '../utils/queue-notifications';
import {generateImage} from "@/app/utils/generate";

/**
 * Hook for managing folders
 */
export function useFolders() {
    const {state, dispatch, actions} = useApp();

    const loadFolders = useCallback(async () => {
        try {
            debug.log('Folders', 'Fetching folders...');
            const folders = await folderAPI.getAll();
            debug.log('Folders', 'Received folders', {count: folders.length});
            dispatch({type: actions.SET_FOLDERS, payload: folders});
            debug.log('Folders', 'Complete');
        } catch (err) {
            debug.error('Folders', 'Error loading folders', err);
        }
    }, [dispatch, actions]);

    const createFolder = useCallback(async (name, character_id) => {
        try {
            await folderAPI.create({name, character_id});
            await loadFolders();
            sendNotification('Folder created', 'success', dispatch, actions, state.notificationsEnabled);
        } catch (err) {
            sendNotification(err.message, 'error', dispatch, actions, state.notificationsEnabled);
        }
    }, [loadFolders, dispatch, actions, state.notificationsEnabled]);

    const updateFolder = useCallback(async (id, name) => {
        try {
            await folderAPI.update(id, {name});
            await loadFolders();
            dispatch({type: actions.SET_STATUS, payload: {type: 'success', message: 'Folder updated'}});
        } catch (err) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: err.message}});
        }
    }, [loadFolders, dispatch, actions]);

    const deleteFolder = useCallback(async (id) => {
        const message = 'Delete this folder? Images will be moved to unfiled.';

        if (!window.confirm(message)) return;

        try {
            await folderAPI.delete(id);
            await loadFolders();

            if (state.currentFolder === id) {
                dispatch({type: actions.SET_CURRENT_FOLDER, payload: null});
            }
            if (state.selectedFolder === id) {
                dispatch({type: actions.SET_SELECTED_FOLDER, payload: ''});
            }

            dispatch({type: actions.SET_STATUS, payload: {type: 'success', message: 'Folder deleted'}});
        } catch (err) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: 'Failed to delete folder'}});
        }
    }, [loadFolders, state.currentFolder, state.selectedFolder, state.folders, dispatch, actions]);

    return {loadFolders, createFolder, updateFolder, deleteFolder};
}

/**
 * Hook for image generation
 */
export function useGeneration() {
    const {state, dispatch, actions} = useApp();
    const {triggerQueuePolling} = useQueue();

    // Submit generation job to SD API
    const generate = useCallback(async () => {
        const {
            config,
            positivePrompt,
            selectedModel,
            negativePrompt,
            orientation,
            batchSize,
            seed,
            selectedFolder,
            notificationsEnabled,
            loraSliders,
            loraToggles,
            loraStyle,
            initImage,
            denoisingStrength,
            maskImage
        } = state;

        return await generateImage({
            config,
            positivePrompt,
            selectedModel,
            negativePrompt,
            orientation,
            batchSize,
            seed,
            selectedFolder,
            loraSliders,
            loraToggles,
            loraStyle,
            initImage,
            denoisingStrength,
            maskImage,

            onJobQueued: (jobId) => {
                notifyJobQueued(jobId);
                triggerQueuePolling();
            },

            onNotification: (message, type) => {
                sendNotification(message, type, dispatch, actions, notificationsEnabled);
            },

            onError: (error) => {
                sendNotification(error, 'error', dispatch, actions, notificationsEnabled);
            }
        });
    }, [state, dispatch, actions]);

    return {generate};
}

/**
 * Hook for app settings and admin checks
 */
export function useSettings() {
    const {dispatch, actions} = useApp();

    const loadUserSettings = useCallback(async () => {
        try {
            const response = await fetch('/api/settings/user');
            if (!response.ok) { // noinspection ExceptionCaughtLocallyJS
                throw new Error('Failed to load user settings');
            }
            const settings = await response.json();
            dispatch({type: actions.SET_USER_SETTINGS, payload: settings});
            return settings;
        } catch (err) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: err.message}});
            return null;
        }
    }, [dispatch, actions]);

    const updateUserSettings = useCallback(async (settings) => {
        const response = await fetch('/api/settings/user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error('Failed to update user settings');
        const updated = await response.json();
        dispatch({type: actions.SET_USER_SETTINGS, payload: updated});
        return updated;
    }, [dispatch, actions]);

    const loadGlobalSettings = useCallback(async (key) => {
        const response = await fetch(`/api/settings/global?key=${encodeURIComponent(key)}`);
        if (!response.ok) throw new Error('Failed to load global settings');
        return await response.json();
    }, []);

    const updateGlobalSettings = useCallback(async (key, value, description = '') => {
        const configResponse = await fetch('/api/settings/global', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({key, value, description})
        });
        if (!configResponse.ok) throw new Error('Failed to update global settings');
        return await configResponse.json();
    }, []);

    const checkIsAdmin = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/check');
            if (!response.ok) return false;
            const data = await response.json();
            // Accept both camelCase and snake_case from the API for robustness
            // Also fall back to role === 'admin' if provided
            if (typeof data?.isAdmin !== 'undefined') return !!data.isAdmin;
            if (typeof data?.is_admin !== 'undefined') return !!data.is_admin;
            if (typeof data?.role === 'string') return data.role === 'admin';
            return false;
        } catch (_) {
            return false;
        }
    }, []);

    return {loadUserSettings, updateUserSettings, loadGlobalSettings, updateGlobalSettings, checkIsAdmin};
}


/**
 * Hook for loading models
 */
export function useModels() {
    const {dispatch, actions} = useApp();

    const loadModels = useCallback(async () => {
        try {
            debug.log('Models', 'Fetching models...');
            const models = await sdAPI.getModels();
            debug.log('Models', 'Received models', {count: models.length});
            dispatch({type: actions.SET_MODELS, payload: models});
            if (models.length > 0) {
                debug.log('Models', 'Setting default model', {model: models[0].model_name});
                dispatch({type: actions.SET_SELECTED_MODEL, payload: models[0].model_name});
            }
            debug.log('Models', 'Complete');
        } catch (err) {
            debug.error('Models', 'Error loading models', err);
            dispatch({
                type: actions.SET_STATUS,
                payload: {type: 'error', message: 'Failed to load models: ' + err.message}
            });
            throw err; // Re-throw so App.js catch block sees it
        }
    }, [dispatch, actions]);

    return {loadModels};
}