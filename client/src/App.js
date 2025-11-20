import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { useFolders, useImages, useGeneration, useModels } from './hooks';

// Components
import ControlsPanel from './components/ControlsPanel';
import ImageGallery from './components/ImageGallery';
import FolderNav from './components/FolderNav';
import FolderModal from './components/FolderModal';
import Lightbox from './components/Lightbox';
import MobileControls from './components/MobileControls';

function AppContent() {
    const { state, dispatch, actions, loadSettings } = useApp();
    const { loadFolders, createFolder, updateFolder, deleteFolder } = useFolders();
    const { loadImages, loadMoreImages, deleteImage, moveImageToFolder } = useImages();
    const { generate } = useGeneration();
    const { loadModels } = useModels();
    const isInitialized = useRef(false);
    const currentFolderRef = useRef(null);

    const { config, settingsLoaded, currentFolder, folders } = state;

    // Keep ref in sync with current folder
    useEffect(() => {
        currentFolderRef.current = currentFolder;
    }, [currentFolder]);

    // Load config on mount (only once)
    useEffect(() => {
        if (isInitialized.current) return;
        
        let mounted = true;
        isInitialized.current = true;

        async function initialize() {
            try {
                const response = await fetch('/config.json');
                const data = await response.json();
                
                if (!mounted) return;
                
                dispatch({ type: actions.SET_CONFIG, payload: data });

                const loaded = loadSettings(data);
                if (!loaded) {
                    dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: data.defaults.positivePrompt });
                    dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: data.defaults.negativePrompt });
                    dispatch({ type: actions.SET_ORIENTATION, payload: data.defaults.orientation });
                    dispatch({ type: actions.SET_BATCH_SIZE, payload: data.defaults.batchSize });
                }

                dispatch({ type: actions.SET_SETTINGS_LOADED, payload: true });
                
                // Load models, folders, and images
                await loadModels(data.api.baseUrl);
                await loadFolders();
                await loadImages();
            } catch (err) {
                if (!mounted) return;
                dispatch({ 
                    type: actions.SET_STATUS, 
                    payload: { type: 'error', message: 'Failed to load config: ' + err.message }
                });
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, [dispatch, actions, loadSettings, loadModels, loadFolders, loadImages]);

    // Reload images when folder changes
    useEffect(() => {
        if (settingsLoaded && isInitialized.current) {
            loadImages(0, currentFolderRef.current);
        }
    }, [currentFolder, settingsLoaded]);

    // Handlers
    const handleResetDefaults = () => {
        dispatch({ type: actions.RESET_TO_DEFAULTS });
        dispatch({ type: actions.SET_STATUS, payload: { type: 'success', message: 'Settings reset to defaults' } });
    };

    const handleOpenFolderModal = (folder) => {
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: folder });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: folder?.name || '' });
        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: true });
    };

    const handleSaveFolder = async (folderId, name) => {
        if (!name.trim()) return;

        if (folderId) {
            await updateFolder(folderId, name);
        } else {
            await createFolder(name);
        }

        dispatch({ type: actions.SET_SHOW_FOLDER_MODAL, payload: false });
        dispatch({ type: actions.SET_EDITING_FOLDER, payload: null });
        dispatch({ type: actions.SET_NEW_FOLDER_NAME, payload: '' });

        await loadFolders();
    };

    const handleOpenLightbox = (index) => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: index });
    };

    const handleCloseLightbox = () => {
        dispatch({ type: actions.SET_LIGHTBOX_INDEX, payload: null });
    };

    const handleRestoreSettings = (image, withSeed) => {
        dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: image.positive_prompt || '' });
        dispatch({ type: actions.SET_NEGATIVE_PROMPT, payload: image.negative_prompt || '' });
        dispatch({ type: actions.SET_SELECTED_MODEL, payload: image.model || '' });
        dispatch({ type: actions.SET_ORIENTATION, payload: image.orientation || 'portrait' });
        dispatch({ type: actions.SET_BATCH_SIZE, payload: image.batch_size || 1 });
        dispatch({ type: actions.SET_SEED, payload: withSeed ? (image.seed || -1) : -1 });

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

    if (!config) {
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
            {/* Navigation */}
            <nav className="nav">
                <div className="nav-content">
                    <a href="../" className="nav-brand">Chubflix</a>
                    <span className="nav-title">Avatar Builder</span>
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

            <Lightbox
                onClose={handleCloseLightbox}
                onMoveToFolder={handleMoveToFolder}
                onRestoreSettings={handleRestoreSettings}
                onDelete={handleDeleteImage}
            />
        </>
    );
}

function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

export default App;
