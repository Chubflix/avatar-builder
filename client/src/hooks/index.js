import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import sdAPI from '../api/sd';
import { folderAPI, imageAPI } from '../api/backend';
import debug from '../utils/debug';

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

    const createFolder = useCallback(async (name, parent_id = null) => {
        try {
            await folderAPI.create({ name, parent_id });
            await loadFolders();
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Folder created' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: err.message } });
        }
    }, [loadFolders, dispatch, actions]);

    const updateFolder = useCallback(async (id, name, parent_id = null) => {
        try {
            await folderAPI.update(id, { name, parent_id });
            await loadFolders();
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Folder updated' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: err.message } });
        }
    }, [loadFolders, dispatch, actions]);

    const deleteFolder = useCallback(async (id) => {
        // Get folder info to show appropriate message
        const folder = state.folders.find(f => f.id === id);
        const parentFolder = folder?.parent_id ? state.folders.find(f => f.id === folder.parent_id) : null;

        const message = parentFolder
            ? `Delete this folder? Images will be moved to "${parentFolder.name}". Child folders will also be deleted.`
            : 'Delete this folder? Images will be moved to unfiled. Child folders will also be deleted.';

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

    const loadImages = useCallback(async (offset = 0, folderId = state.currentFolder) => {
        try {
            debug.log('Images', 'Fetching images', { offset, folderId });
            const data = await imageAPI.getAll({
                folderId: folderId,
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
                    dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
                }
            }

            dispatch({ type: actions.REMOVE_IMAGE, payload: id });
            dispatch({ type: actions.SET_TOTAL_IMAGES, payload: state.totalImages - 1 });
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Image deleted' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to delete image' } });
        }
    }, [state.lightboxIndex, state.images, state.totalImages, dispatch, actions]);

    const moveImageToFolder = useCallback(async (imageId, folderId) => {
        try {
            await imageAPI.update(imageId, { folderId: folderId || null });
            await loadImages(0);
            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Image moved' } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Failed to move image' } });
        }
    }, [loadImages, dispatch, actions]);

    return { loadImages, loadMoreImages, deleteImage, moveImageToFolder };
}

/**
 * Hook for image generation
 */
export function useGeneration() {
    const { state, dispatch, actions } = useApp();
    const progressInterval = useRef(null);

    const checkProgress = useCallback(async () => {
        try {
            const data = await sdAPI.getProgress();
            dispatch({ type: actions.SET_PROGRESS, payload: Math.round(data.progress * 100) });
        } catch (err) {
            // Ignore progress errors
        }
    }, [dispatch, actions]);

    const generate = useCallback(async () => {
        const { config, positivePrompt, selectedModel, negativePrompt, orientation, batchSize, seed, selectedFolder } = state;

        if (!config || !positivePrompt.trim()) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Please enter a positive prompt' } });
            return;
        }

        dispatch({ type: actions.SET_GENERATING, payload: true });
        dispatch({ type: actions.SET_STATUS, payload: { type: 'info', message: 'Generating images...' } });
        dispatch({ type: actions.SET_PROGRESS, payload: 0 });

        progressInterval.current = setInterval(checkProgress, 500);

        try {
            // Set model
            await sdAPI.setModel(selectedModel);

            // Generate images
            const dims = config.dimensions[orientation];
            const result = await sdAPI.generateImage({
                prompt: positivePrompt,
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
                adetailerModel: config.adetailer.model
            });

            const info = JSON.parse(result.info || '{}');

            // Save images
            const savedImages = [];
            for (let i = 0; i < result.images.length; i++) {
                const imageData = result.images[i];
                const imageSeed = info.all_seeds ? info.all_seeds[i] : info.seed;

                const saved = await imageAPI.save({
                    imageData,
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
                    seed: imageSeed,
                    adetailerEnabled: config.adetailer.enabled,
                    adetailerModel: config.adetailer.model,
                    info,
                    folderId: selectedFolder || null
                });

                savedImages.push(saved);
            }

            // Update gallery if viewing all or same folder
            if (!state.currentFolder || state.currentFolder === selectedFolder) {
                dispatch({ type: actions.ADD_IMAGES, payload: savedImages });
                dispatch({ type: actions.SET_TOTAL_IMAGES, payload: state.totalImages + savedImages.length });
            }

            dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: `Generated and saved ${savedImages.length} image(s)!` } });
        } catch (err) {
            dispatch({ type: actions.SET_STATUS, payload: { type: 'error', message: 'Generation failed: ' + err.message } });
        } finally {
            dispatch({ type: actions.SET_GENERATING, payload: false });
            dispatch({ type: actions.SET_PROGRESS, payload: 0 });
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
            }
        }
    }, [state, checkProgress, dispatch, actions]);

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

    const loadModels = useCallback(async (baseUrl) => {
        try {
            debug.log('Models', 'Setting base URL', { baseUrl });
            sdAPI.setBaseUrl(baseUrl);
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
