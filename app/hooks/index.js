import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import sdAPI from '../utils/sd-api';
import { folderAPI, imageAPI } from '../utils/backend-api';
import debug from '../utils/debug';
import { sendNotification } from '../utils/notifications';
import { buildLoraPrompt } from '../utils/lora-builder';
import { supabase } from '../lib/supabase';
import { useQueueContext } from '../context/QueueContext';
import { useQueue } from './queue';

/**
 * Hook for managing folders
 */
export function useFolders() {
    const { state, dispatch, actions } = useApp();

    const loadFolders = useCallback(async () => {
        try {
            debug.log('Folders', 'Fetching folders...');
            const folders = await folderAPI.getAll();
            debug.log('Folders', 'Received folders', { count: folders.length });
            dispatch({ type: actions.SET_FOLDERS, payload: folders });
            debug.log('Folders', 'Complete');
        } catch (err) {
            debug.error('Folders', 'Error loading folders', err);
        }
    }, [dispatch, actions]);

    const createFolder = useCallback(async (name, character_id) => {
        try {
            await folderAPI.create({ name, character_id });
            await loadFolders();
            sendNotification('Folder created', 'success', dispatch, actions, state.notificationsEnabled);
        } catch (err) {
            sendNotification(err.message, 'error', dispatch, actions, state.notificationsEnabled);
        }
    }, [loadFolders, dispatch, actions, state.notificationsEnabled]);

    const updateFolder = useCallback(async (id, name) => {
        try {
            await folderAPI.update(id, { name });
            await loadFolders();
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Folder updated' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: err.message } });
        }
    }, [loadFolders, dispatch, actions]);

    const deleteFolder = useCallback(async (id) => {
        const message = 'Delete this folder? Images will be moved to unfiled.';

        if (!window.confirm(message)) return;

        try {
            await folderAPI.delete(id);
            await loadFolders();

            if (state.currentFolder === id) {
                dispatch({ type: actions.SET_CURRENT_FOLDER, payload: null });
            }
            if (state.selectedFolder === id) {
                dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
            }

            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Folder deleted' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to delete folder' } });
        }
    }, [loadFolders, state.currentFolder, state.selectedFolder, state.folders, dispatch, actions]);

    return { loadFolders, createFolder, updateFolder, deleteFolder };
}

/**
 * Hook for managing images
 */
export function useImages() {
    const { state, dispatch, actions } = useApp();

    const loadImages = useCallback(async (offset = 0, folderId = state.currentFolder, characterId = state.selectedCharacter) => {
        try {
            debug.log('Images', 'Fetching images', { offset, folderId });
            const data = await imageAPI.getAll({
                folderId: folderId,
                characterId: characterId,
                limit: 50,
                offset
            });
            debug.log('Images', 'Received data', { count: data.images.length, total: data.total });

            if (offset === 0) {
                dispatch({ type: actions.SET_IMAGES, payload: data.images });
            } else {
                // For pagination, we need current images from state at call time
                dispatch({ type: actions.APPEND_IMAGES, payload: data.images });
            }

            dispatch({ type: actions.SET_HAS_MORE, payload: data.hasMore });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: data.total });
            debug.log('Images', 'Complete');
        } catch (err) {
            debug.error('Images', 'Error loading images', err);
        }
    }, [dispatch, actions]);

    const loadMoreImages = useCallback(async () => {
        if (state.isLoadingMore || !state.hasMore) return;

        dispatch({ type: actions.SET_LOADING_MORE, payload: true });
        await loadImages(state.images.length, state.currentFolder);
        dispatch({ type: actions.SET_LOADING_MORE, payload: false });
    }, [state.isLoadingMore, state.hasMore, state.images.length, state.currentFolder, loadImages, dispatch, actions]);

    const deleteImage = useCallback(async (id) => {
        if (!window.confirm('Are you sure you want to delete this image?')) return;

        try {
            await imageAPI.delete(id);

            if (state.lightboxIndex !== null) {
                const currentImage = state.images[state.lightboxIndex];
                if (currentImage && currentImage.id === id) {
                    if (state.images.at(state.lightboxIndex + 1)) {
                        // take the next image
                    } else if (state.images.at(state.lightboxIndex - 1)) {
                        // go back to the previous image
                        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: state.lightboxIndex - 1 });
                    } else {
                        // no more images, reset lightbox
                        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
                    }
                }
            }

            dispatch({ type: actions.REMOVE_IMAGE, payload: id });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: state.totalImages - 1 });
            sendNotification('Image deleted', 'success', dispatch, actions, state.notificationsEnabled);
        } catch (err) {
            sendNotification('Failed to delete image', 'error', dispatch, actions, state.notificationsEnabled);
        }
    }, [state.lightboxIndex, state.images, state.totalImages, state.notificationsEnabled, dispatch, actions]);

    const moveImageToFolder = useCallback(async (imageId, folderId) => {
        try {
            await imageAPI.update(imageId, { folderId: folderId || null });
            await loadImages(0);
            sendNotification('Image moved', 'success', dispatch, actions, state.notificationsEnabled);
        } catch (err) {
            sendNotification('Failed to move image', 'error', dispatch, actions, state.notificationsEnabled);
        }
    }, [loadImages, dispatch, actions, state.notificationsEnabled]);

    return { loadImages, loadMoreImages, deleteImage, moveImageToFolder };
}

/**
 * Hook for image generation
 */
export function useGeneration() {
    const { state, dispatch, actions } = useApp();
    const { triggerQueuePolling, isPolling } = useQueue();
    const { items: queueItems, enqueue, dequeue, isProcessing, setProcessing } = useQueueContext();
    const progressInterval = useRef(null);
    const isProcessingLocal = useRef(false);

    const checkProgress = useCallback(async () => {
        try {
            const data = await sdAPI.getProgress();
            if (data && typeof data.progress === 'number' && !Number.isNaN(data.progress)) {
                dispatch({ type: actions.SET_PROGRESS, payload: Math.round(data.progress * 100) });
            }
            // If async adapter returns { queued: true }, skip updating progress
        } catch (err) {
            // Ignore progress errors
        }
    }, [dispatch, actions]);

    // Process a single generation from the queue
    const processGeneration = useCallback(async (queueItem) => {
        const { config, positivePrompt, selectedModel, negativePrompt, orientation, batchSize, seed, selectedFolder, currentFolder, totalImages, notificationsEnabled, loraSliders, loraToggles, loraStyle, initImage, denoisingStrength, maskImage } = queueItem;

        dispatch({ type: actions.SET_GENERATING, payload: true });
        dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: 'Generating images...' } });
        dispatch({ type: actions.SET_PROGRESS, payload: 0 });

        progressInterval.current = setInterval(checkProgress, 500);

        try {
            // Set model
            await sdAPI.setModel(selectedModel);

            // Build lora prompt additions
            const loraAdditions = buildLoraPrompt(config, loraSliders, loraToggles, loraStyle);
            const finalPrompt = positivePrompt + loraAdditions;

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
                adetailerEnabled: config.adetailer.enabled,
                adetailerModel: config.adetailer.model,
                folder_id: selectedFolder || null,
                loras: {
                    sliders: loraSliders,
                    toggles: loraToggles,
                    style: loraStyle
                },
                generationMode: initImage ? (maskImage ? 'inpaint' : 'img2img') : 'txt2img'
            };

            // Create a job record to receive a per-job webhook token
            let webhookToken = null;
            try {
                const jobResp = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobPayload)
                });
                if (jobResp.ok) {
                    const job = await jobResp.json();
                    webhookToken = job.token;
                }
            } catch (_) {
                // If job creation fails, continue without token (webhook will use global token if configured)
            }

            // Generate images
            const result = initImage
                ? (maskImage
                    ? await sdAPI.inpaintImage({
                        initImage,
                        maskImage,
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
                        adetailerEnabled: config.adetailer.enabled,
                        adetailerModel: config.adetailer.model,
                        __webhookAuthToken: webhookToken || undefined
                    })
                    : await sdAPI.generateImageFromImage({
                        initImage,
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
                        adetailerEnabled: config.adetailer.enabled,
                        adetailerModel: config.adetailer.model,
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
                    adetailerEnabled: config.adetailer.enabled,
                    adetailerModel: config.adetailer.model,
                    __webhookAuthToken: webhookToken || undefined
                });

            // If using async proxy adapter, result will be a queued job
            if (result && result.queued) {
                const jobId = result.jobId || result.raw?.id || 'unknown';
                // Store the job_uuid on the existing job row for traceability
                if (webhookToken && jobId && jobId !== 'unknown') {
                    try {
                        await fetch('/api/jobs', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: webhookToken, job_uuid: jobId })
                        });
                    } catch (_) {
                        // non-fatal
                    }
                }
                sendNotification(`Your generation job was queued (ID: ${jobId}). You'll receive results shortly.`, 'info', dispatch, actions, notificationsEnabled);
            }
        } catch (err) {
            sendNotification('Generation failed: ' + err.message, 'error', dispatch, actions, notificationsEnabled);
        } finally {
            dispatch({ type: actions.SET_PROGRESS, payload: 0 });
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
        }
    }, [checkProgress, dispatch, actions]);

    // Add generation to queue
    const generate = useCallback(async () => {
        const { config, positivePrompt, selectedModel, negativePrompt, orientation, batchSize, seed, selectedFolder, currentFolder, totalImages, notificationsEnabled, loraSliders, loraToggles, loraStyle, initImage, denoisingStrength, maskImage } = state;

        if (!config || !positivePrompt.trim()) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Please enter a positive prompt' } });
            return;
        }

        // Add to queue with all necessary data captured at this moment
        const queueItem = {
            config,
            positivePrompt,
            selectedModel,
            negativePrompt,
            orientation,
            batchSize,
            seed,
            selectedFolder,
            currentFolder,
            totalImages,
            notificationsEnabled,
            loraSliders,
            loraToggles,
            loraStyle,
            initImage,
            denoisingStrength,
            maskImage,
            id: Date.now() + Math.random() // Unique ID for this queue item
        };

        enqueue(queueItem);
        dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: 'Added to queue' } });

        // Ensure SD queue polling is running if not already
        try {
            if (!isPolling()) {
                // Fire-and-forget; it will only start if jobs exist
                triggerQueuePolling();
            }
        } catch (_) { /* non-fatal */ }
    }, [state, dispatch, actions, enqueue]);

    // Process queue
    useEffect(() => {
        if (isProcessingLocal.current || queueItems.length === 0 || state.isGenerating) {
            return;
        }

        isProcessingLocal.current = true;
        setProcessing(true);

        const nextItem = queueItems[0];
        processGeneration(nextItem).finally(() => {
            isProcessingLocal.current = false;
            setProcessing(false);
            // remove processed item
            try { dequeue(); } catch (_) { /* noop */ }
        });
    }, [queueItems, state.isGenerating, processGeneration, setProcessing, dequeue]);

    useEffect(() => {
        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, []);

    return { generate };
}

/**
 * Hook for loading models
 */
export function useModels() {
    const { dispatch, actions } = useApp();

    const loadModels = useCallback(async () => {
        try {
            debug.log('Models', 'Fetching models...');
            const models = await sdAPI.getModels();
            debug.log('Models', 'Received models', { count: models.length });
            dispatch({ type: actions.SET_MODELS, payload: models });
            if (models.length > 0) {
                debug.log('Models', 'Setting default model', { model: models[0].model_name });
                dispatch({ type: actions.SET_SELECTED_MODEL, payload: models[0].model_name });
            }
            debug.log('Models', 'Complete');
        } catch (err) {
            debug.error('Models', 'Error loading models', err);
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to load models: ' + err.message } });
            throw err; // Re-throw so App.js catch block sees it
        }
    }, [dispatch, actions]);

    return { loadModels };
}
