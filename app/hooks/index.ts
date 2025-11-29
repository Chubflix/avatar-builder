// @ts-nocheck
import {useCallback} from 'react';
import {useApp} from '../context/AppContext';
import sdAPI from '../utils/sd-api';
import {folderAPI, imageAPI} from '../utils/backend-api';
import debug from '../utils/debug';
import {sendNotification} from '../utils/notifications';
import {buildLoraPrompt} from '../utils/lora-builder';
import {useQueue} from './queue';
import {notifyJobQueued} from '../utils/queue-notifications';

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
 * Helper to create a job record in the database
 */
async function createJobRecord(jobPayload: any): Promise<string | null> {
    try {
        const jobResp = await fetch('/api/jobs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(jobPayload)
        });
        if (jobResp.ok) {
            const job = await jobResp.json();
            return job.token;
        }
    } catch (_) {
        // If job creation fails, continue without token
    }
    return null;
}

/**
 * Helper to update job with UUID after submission
 */
async function updateJobWithUUID(webhookToken: string, jobId: string) {
    try {
        await fetch('/api/jobs', {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token: webhookToken, job_uuid: jobId})
        });
    } catch (_) {
        // non-fatal
    }
}

/**
 * Hook for image generation
 */
export function useGeneration() {
    const {state, dispatch, actions} = useApp();
    const {triggerQueuePolling} = useQueue();

    /**
     * Generate with a custom SD API payload
     * Useful for advanced features like Regional Prompter
     */
    const generateWithPayload = useCallback(async (
        sdPayload: any,
        jobMetadata: {
            positivePrompt: string;
            negativePrompt?: string;
            model?: string;
            orientation?: string;
            width: number;
            height: number;
            batchSize?: number;
            folder_id?: string | null;
            generation_type?: string;
            [key: string]: any;
        },
        endpoint: string = '/sdapi/v1/txt2img'
    ) => {
        const {config, selectedModel, notificationsEnabled} = state;

        try {
            // Create job record with metadata
            const webhookToken = await createJobRecord({
                ...jobMetadata,
                model: jobMetadata.model || selectedModel,
                samplerName: sdPayload.sampler_name || config?.generation?.samplerName,
                scheduler: sdPayload.scheduler || config?.generation?.scheduler,
                steps: sdPayload.steps || config?.generation?.steps,
                cfgScale: sdPayload.cfg_scale || config?.generation?.cfgScale,
                seed: sdPayload.seed || -1,
                batchSize: jobMetadata.batchSize || sdPayload.batch_size || 1,
                folder_id: jobMetadata.folder_id || null
            });

            // Add webhook token to payload
            const finalPayload = {
                ...sdPayload,
                __webhookAuthToken: webhookToken || undefined
            };

            // Submit to SD API
            const result = await sdAPI.generateWithCustomPayload(finalPayload, endpoint);

            // Handle async response
            if (result && result.queued) {
                const jobId = result.jobId || result.raw?.id || 'unknown';

                // Update job with UUID
                if (webhookToken && jobId && jobId !== 'unknown') {
                    await updateJobWithUUID(webhookToken, jobId);
                }

                sendNotification(`Job queued (ID: ${jobId})`, 'info', dispatch, actions, notificationsEnabled);
                notifyJobQueued(jobId);
                triggerQueuePolling();

                return {success: true, jobId, result};
            }

            return {success: false, error: 'No queued response'};
        } catch (err: any) {
            sendNotification('Generation failed: ' + err.message, 'error', dispatch, actions, notificationsEnabled);
            return {success: false, error: err.message};
        }
    }, [state, dispatch, actions, triggerQueuePolling]);

    // Submit generation job to SD API (original method)
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

        if (!config || !positivePrompt.trim()) {
            dispatch({type: actions.SET_STATUS, payload: {type: 'error', message: 'Please enter a positive prompt'}});
            return;
        }

        try {
            // Build lora prompt additions
            const loraAdditions = buildLoraPrompt(config, loraSliders, loraToggles, loraStyle);
            const finalPrompt = positivePrompt + loraAdditions;

            // Determine ADetailer settings from the adetailer_list (not the single legacy field)
            const adList = Array.isArray((config as any).adetailer_list) ? (config as any).adetailer_list : [];
            const enabledModels: string[] = adList
                .filter((i: any) => i && i.enabled && typeof i.model === 'string' && i.model.trim().length > 0)
                .map((i: any) => i.model.trim());
            const adetailerEnabledFromList = enabledModels.length > 0;
            const adetailerModelFromList = enabledModels[0] || null;

            // If using inpaint (initImage + maskImage), ensure mask exists in DB and S3 and get mask_id
            let maskId = null;
            const initB64 = typeof initImage === 'string' ? initImage : (initImage?.base64 || null);
            const maskB64 = typeof maskImage === 'string' ? maskImage : (maskImage?.base64 || null);
            const maskIdInput = typeof maskImage === 'object' ? (maskImage?.id || null) : null;
            if (initB64 && maskB64) {
                try {
                    const resp = await fetch('/api/masks', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({id: maskIdInput || undefined, base64: maskB64})
                    });
                    if (resp.ok) {
                        const saved = await resp.json();
                        maskId = saved.id;
                    }
                } catch (_) {
                    // Non-fatal: generation can still proceed; webhook just won't attach a mask
                }
            }

            // Prepare original metadata payload to persist with the queued job
            const dims = config.dimensions[orientation];
            const jobPayload = {
                positivePrompt,
                negativePrompt,
                model: selectedModel,
                orientation,
                width: dims.width,
                height: dims.height,
                batchSize,
                samplerName: config.generation.samplerName,
                scheduler: config.generation.scheduler,
                steps: config.generation.steps,
                cfgScale: config.generation.cfgScale,
                seed,
                adetailerEnabled: adetailerEnabledFromList,
                adetailerModel: adetailerModelFromList,
                adetailerModels: enabledModels,
                folder_id: selectedFolder || null,
                loras: {
                    sliders: loraSliders,
                    toggles: loraToggles,
                    style: loraStyle
                },
                generation_type: initB64 ? (maskB64 ? 'inpaint' : 'img2img') : 'txt2img',
                parent_image_id: null, // TODO: set when restoring from an image
                mask_id: maskId || null,
            };

            // Create a job record to receive a per-job webhook token
            const webhookToken = await createJobRecord(jobPayload);

            // Submit job to SD API
            const result = initB64
                ? (maskB64
                    ? await sdAPI.inpaintImage({
                        initImage: initB64,
                        maskImage: maskB64,
                        prompt: finalPrompt,
                        negativePrompt,
                        width: dims.width,
                        height: dims.height,
                        batchSize,
                        samplerName: config.generation.samplerName,
                        scheduler: config.generation.scheduler,
                        steps: config.generation.steps,
                        cfgScale: config.generation.cfgScale,
                        seed,
                        denoisingStrength: typeof denoisingStrength === 'number' ? denoisingStrength : 0.5,
                        adetailerModels: enabledModels,
                        __webhookAuthToken: webhookToken || undefined
                    })
                    : await sdAPI.generateImageFromImage({
                        initImage: initB64,
                        prompt: finalPrompt,
                        negativePrompt,
                        width: dims.width,
                        height: dims.height,
                        batchSize,
                        samplerName: config.generation.samplerName,
                        scheduler: config.generation.scheduler,
                        steps: config.generation.steps,
                        cfgScale: config.generation.cfgScale,
                        seed,
                        denoisingStrength: typeof denoisingStrength === 'number' ? denoisingStrength : 0.5,
                        adetailerModels: enabledModels,
                        __webhookAuthToken: webhookToken || undefined
                    }))
                : await sdAPI.generateImage({
                    prompt: finalPrompt,
                    negativePrompt,
                    width: dims.width,
                    height: dims.height,
                    batchSize,
                    samplerName: config.generation.samplerName,
                    scheduler: config.generation.scheduler,
                    steps: config.generation.steps,
                    cfgScale: config.generation.cfgScale,
                    seed,
                    adetailerModels: enabledModels,
                    __webhookAuthToken: webhookToken || undefined
                });

            // If using async proxy adapter, result will be a queued job
            if (result && result.queued) {
                const jobId = result.jobId || result.raw?.id || 'unknown';

                // Update job with UUID
                if (webhookToken && jobId && jobId !== 'unknown') {
                    await updateJobWithUUID(webhookToken, jobId);
                }

                sendNotification(`Job queued (ID: ${jobId})`, 'info', dispatch, actions, notificationsEnabled);
                notifyJobQueued(jobId);
                triggerQueuePolling();
            }
        } catch (err) {
            sendNotification('Generation failed: ' + err.message, 'error', dispatch, actions, notificationsEnabled);
        }
    }, [state, dispatch, actions, triggerQueuePolling]);

    return {generate, generateWithPayload};
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