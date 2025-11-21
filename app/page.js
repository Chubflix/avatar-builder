'use client';

import { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useFolders, useImages, useGeneration, useModels } from './hooks';
import debug from './utils/debug';

// Components
import ControlsPanel from './components/ControlsPanel';
import ImageGallery from './components/ImageGallery';
import FolderNav from './components/FolderNav';
import FolderModal from './components/FolderModal';
import Lightbox from './components/Lightbox';
import MobileControls from './components/MobileControls';
import PWAManager from './components/PWAManager';
import AppSettings from './components/AppSettings';
import PromptModal from './components/PromptModal';

// Import CSS
import './folder-picker.css';
import './folder-styles.css';
import './lightbox-details.css';

function AppContent() {
    const { state, dispatch, actions, loadSettings } = useApp();
    const { loadFolders, createFolder, updateFolder, deleteFolder } = useFolders();
    const { loadImages, loadMoreImages, deleteImage, moveImageToFolder } = useImages();
    const { generate } = useGeneration();
    const { loadModels } = useModels();
    const isInitialized = useRef(false);
    const currentFolderRef = useRef(null);
    const skipGalleryToSaveSync = useRef(false);
    const skipSaveToGallerySync = useRef(false);

    const { config, settingsLoaded, currentFolder, selectedFolder, folders, includeSubfolders } = state;
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    // Keep ref in sync with current folder
    useEffect(() => {
        currentFolderRef.current = currentFolder;
    }, [currentFolder]);

    // Load config on mount (only once)
    useEffect(() => {
        if (isInitialized.current) {
            debug.log('App', 'Already initialized, skipping');
            return;
        }

        let mounted = true;

        async function initialize() {
            try {
                debug.log('App', 'Starting initialization...');
                debug.log('App', 'Fetching /api/config...');
                const response = await fetch('/api/config');
                debug.log('App', 'Config response received', { status: response.status });

                const data = await response.json();
                debug.log('App', 'Config data parsed', data);

                if (!mounted) {
                    debug.warn('App', 'Component unmounted before config could be set, aborting');
                    return;
                }

                // Mark as initialized AFTER we know component is still mounted
                isInitialized.current = true;

                debug.log('App', 'Setting config in state...');
                dispatch({ type: actions.SET_CONFIG, payload: data });

                debug.log('App', 'Loading settings...');
                const loaded = loadSettings(data);
                debug.log('App', 'Settings loaded from localStorage', { loaded });

                if (!loaded) {
                    debug.log('App', 'Using default settings from config');
                    dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: data.defaults.positivePrompt });
                    dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: data.defaults.negativePrompt });
                    dispatch({ type: actions.SET_ORIENTATION, payload: data.defaults.orientation });
                    dispatch({ type: actions.SET_BATCH_SIZE, payload: data.defaults.batchSize });
                }

                debug.log('App', 'Setting settings loaded flag...');
                dispatch({ type: actions.SET_SETTINGS_LOADED, payload: true });

                // Load models, folders, and images (continue even if some fail)
                debug.log('App', 'Loading SD models', { baseUrl: data.api.baseUrl });
                try {
                    await loadModels(data.api.baseUrl);
                    debug.log('App', 'Models loaded successfully');
                } catch (err) {
                    debug.error('App', 'Failed to load models', err);
                    dispatch({
                        type: actions.SET_STATUS,
                        payload: { type: 'error', message: 'Failed to load SD models: ' + err.message }
                    });
                }

                debug.log('App', 'Loading folders...');
                try {
                    await loadFolders();
                    debug.log('App', 'Folders loaded successfully');
                } catch (err) {
                    debug.error('App', 'Failed to load folders', err);
                }

                setIsLoadingConfig(false);
                debug.log('App', 'Initialization complete!');
            } catch (err) {
                if (!mounted) {
                    debug.warn('App', 'Component unmounted during error, aborting');
                    return;
                }
                debug.error('App', 'Failed during initialization', err);
                dispatch({
                    type: actions.SET_STATUS,
                    payload: { type: 'error', message: 'Failed to load config: ' + err.message }
                });
                setIsLoadingConfig(false);
            }
        }

        initialize();

        return () => {
            debug.log('App', 'Component cleanup - setting mounted=false');
            mounted = false;
        };
    }, [dispatch, actions, loadSettings, loadModels, loadFolders, loadImages]);

    // Reload images when folder changes or includeSubfolders toggle changes
    useEffect(() => {
        if (settingsLoaded && isInitialized.current) {
            loadImages(0, currentFolderRef.current);
        }
    }, [currentFolder, includeSubfolders, settingsLoaded, loadImages]);

    // Sync gallery filter → save folder (when user changes gallery filter)
    useEffect(() => {
        if (settingsLoaded && isInitialized.current) {
            // Skip if this change was triggered by save folder sync
            if (skipGalleryToSaveSync.current) {
                skipGalleryToSaveSync.current = false;
                return;
            }

            // If viewing all images or unfiled, set save folder to unfiled ('')
            if (currentFolder === null || currentFolder === 'unfiled') {
                skipSaveToGallerySync.current = true;
                dispatch({ type: actions.SET_SELECTED_FOLDER, payload: '' });
            } else {
                // Otherwise set save folder to current gallery folder
                skipSaveToGallerySync.current = true;
                dispatch({ type: actions.SET_SELECTED_FOLDER, payload: currentFolder });
            }
        }
    }, [currentFolder, settingsLoaded, dispatch, actions]);

    // Sync save folder → gallery filter (when user changes save folder)
    useEffect(() => {
        if (settingsLoaded && isInitialized.current) {
            // Skip if this change was triggered by gallery filter sync
            if (skipSaveToGallerySync.current) {
                skipSaveToGallerySync.current = false;
                return;
            }

            // If save folder is unfiled (''), show unfiled images
            if (selectedFolder === '' || selectedFolder === null) {
                skipGalleryToSaveSync.current = true;
                dispatch({ type: actions.SET_CURRENT_FOLDER, payload: 'unfiled' });
            } else {
                // Otherwise show the selected folder's images
                skipGalleryToSaveSync.current = true;
                dispatch({ type: actions.SET_CURRENT_FOLDER, payload: selectedFolder });
            }
        }
    }, [selectedFolder, settingsLoaded, dispatch, actions]);

    // Handlers
    const handleResetDefaults = () => {
        dispatch({ type: actions.RESET_TO_DEFAULTS });
        dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Settings reset to defaults' } });
    };

    const handleOpenFolderModal = (folder) => {
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: folder });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: folder?.name || '' });
        dispatch({ type: actions.SET_PARENT_FOLDER_ID, payload: folder?.parent_id || null });
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
    };

    const handleSaveFolder = async (folderId, name, parentFolderId) => {
        if (!name.trim()) return;

        if (folderId) {
            await updateFolder(folderId, name, parentFolderId);
        } else {
            await createFolder(name, parentFolderId);
        }

        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: '' });
        dispatch({ type: actions.SET_PARENT_FOLDER_ID, payload: null });

        await loadFolders();
    };

    const handleOpenLightbox = (index) => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: index });
    };

    const handleCloseLightbox = () => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
    };

    const handleRestoreSettings = (image, withSeed) => {
        dispatch({type: actions.SET_POSITIVE_PROMPT, payload: image.positive_prompt || ''});
        dispatch({type: actions.SET_NEGATIVE_PROMPT, payload: image.negative_prompt || ''});
        if (!state.locks.model) {
            dispatch({type: actions.SET_SELECTED_MODEL, payload: image.model || ''});
        }
        dispatch({ type: actions.SET_ORIENTATION, payload: image.orientation || 'portrait' });
        dispatch({ type: actions.SET_BATCH_SIZE, payload: image.batch_size || 1 });
        dispatch({ type: actions.SET_SEED, payload: withSeed ? (image.seed || -1) : -1 });

        // Restore lora settings if present
        if (image.loras) {
            const loras = typeof image.loras === 'string' ? JSON.parse(image.loras) : image.loras;

            // Reset all lora settings first
            if (config?.loras) {
                // Reset sliders
                config.loras.filter(l => l.type === 'slider').forEach(lora => {
                    const savedSlider = loras.sliders?.[lora.name];
                    if (savedSlider) {
                        dispatch({
                            type: actions.SET_LORA_SLIDER,
                            payload: { name: lora.name, value: savedSlider.value }
                        });
                        // Set enabled state
                        const currentEnabled = state.loraSliders[lora.name]?.enabled || false;
                        if (savedSlider.enabled !== currentEnabled) {
                            dispatch({
                                type: actions.TOGGLE_LORA_SLIDER,
                                payload: { name: lora.name, defaultValue: savedSlider.value }
                            });
                        }
                    } else {
                        // Reset to default if not in saved data
                        dispatch({
                            type: actions.SET_LORA_SLIDER,
                            payload: { name: lora.name, value: lora.defaultValue }
                        });
                        // Disable if currently enabled
                        if (state.loraSliders[lora.name]?.enabled) {
                            dispatch({
                                type: actions.TOGGLE_LORA_SLIDER,
                                payload: { name: lora.name, defaultValue: lora.defaultValue }
                            });
                        }
                    }
                });

                // Reset toggles
                config.loras.filter(l => l.type === 'toggle').forEach(lora => {
                    const savedEnabled = loras.toggles?.[lora.name] || false;
                    dispatch({
                        type: actions.SET_LORA_TOGGLE,
                        payload: { name: lora.name, enabled: savedEnabled }
                    });
                });
            }

            // Restore style
            dispatch({ type: actions.SET_LORA_STYLE, payload: loras.style || '' });
        } else {
            // Reset all loras if no lora data in image
            if (config?.loras) {
                config.loras.filter(l => l.type === 'slider').forEach(lora => {
                    dispatch({
                        type: actions.SET_LORA_SLIDER,
                        payload: { name: lora.name, value: lora.defaultValue }
                    });
                    if (state.loraSliders[lora.name]?.enabled) {
                        dispatch({
                            type: actions.TOGGLE_LORA_SLIDER,
                            payload: { name: lora.name, defaultValue: lora.defaultValue }
                        });
                    }
                });
                config.loras.filter(l => l.type === 'toggle').forEach(lora => {
                    dispatch({
                        type: actions.SET_LORA_TOGGLE,
                        payload: { name: lora.name, enabled: false }
                    });
                });
                dispatch({ type: actions.SET_LORA_STYLE, payload: '' });
            }
        }

        const message = withSeed ? 'Settings restored from image (with seed)' : 'Settings restored from image (random seed)';
        dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message } });
    };

    const handleMoveToFolder = async (imageId, folderId) => {
        await moveImageToFolder(imageId, folderId);
        await loadFolders();
    };

    const handleDeleteImage = async (imageId) => {
        await deleteImage(imageId);
        await loadFolders();
    };

    if (isLoadingConfig) {
        return (
            <>
                <nav className="nav">
                    <div className="nav-content">
                        <a href="../" className="nav-brand">Chubflix</a>
                        <span className="nav-title">Avatar Builder</span>
                    </div>
                </nav>
                <div className="main-container">
                    <div className="empty-state">
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '1rem' }}>Loading configuration...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* PWA Manager */}
            <PWAManager />

            {/* Navigation */}
            <nav className="nav">
                <div className="nav-content">
                    <a href="../" className="nav-brand">Chubflix</a>
                    <div className="nav-right">
                        <span className="nav-title">Avatar Builder</span>
                        <button
                            className="btn-settings"
                            onClick={() => dispatch({ type: actions.SET_SHOW_APP_SETTINGS, payload: true })}
                            title="Settings"
                        >
                            <i className="fa fa-cog"></i>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Container */}
            <div className="main-container">
                <div className="app-container">
                    {/* Desktop Controls */}
                    <ControlsPanel
                        onGenerate={generate}
                        onResetDefaults={handleResetDefaults}
                        onOpenFolderModal={handleOpenFolderModal}
                    />

                    {/* Results Panel */}
                    <div className="results-panel">
                        <FolderNav onOpenFolderModal={handleOpenFolderModal} />

                        <div className="results-header">
                            <h2>
                                {currentFolder === null ? 'All Images' :
                                 currentFolder === 'unfiled' ? 'Unfiled Images' :
                                 folders.find(f => f.id === currentFolder)?.name || 'Images'}
                            </h2>
                            <span className="results-count">{state.totalImages} image(s)</span>
                        </div>

                        <ImageGallery
                            onOpenLightbox={handleOpenLightbox}
                            onRestoreSettings={handleRestoreSettings}
                            onDelete={handleDeleteImage}
                            onLoadMore={loadMoreImages}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Controls */}
            <MobileControls
                onGenerate={generate}
                onResetDefaults={handleResetDefaults}
            />

            {/* Modals */}
            <FolderModal
                onSave={handleSaveFolder}
                onDelete={deleteFolder}
            />

            <PromptModal
                onGenerate={generate}
            />

            <Lightbox
                onClose={handleCloseLightbox}
                onMoveToFolder={handleMoveToFolder}
                onRestoreSettings={handleRestoreSettings}
                onDelete={handleDeleteImage}
            />

            {/* App Settings */}
            <AppSettings />
        </>
    );
}

export default function Page() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
