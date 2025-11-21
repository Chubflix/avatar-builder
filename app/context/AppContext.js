import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Action types
const ActionTypes = {
    // Config
    SET_CONFIG: 'SET_CONFIG',
    SET_SETTINGS_LOADED: 'SET_SETTINGS_LOADED',

    // Models
    SET_MODELS: 'SET_MODELS',
    SET_SELECTED_MODEL: 'SET_SELECTED_MODEL',

    // Generation settings
    SET_POSITIVE_PROMPT: 'SET_POSITIVE_PROMPT',
    SET_NEGATIVE_PROMPT: 'SET_NEGATIVE_PROMPT',
    SET_ORIENTATION: 'SET_ORIENTATION',
    SET_BATCH_SIZE: 'SET_BATCH_SIZE',
    SET_SEED: 'SET_SEED',
    SET_SHOW_ADVANCED: 'SET_SHOW_ADVANCED',

    // Generation state
    SET_GENERATING: 'SET_GENERATING',
    SET_PROGRESS: 'SET_PROGRESS',
    SET_STATUS: 'SET_STATUS',

    // Queue state
    ADD_TO_QUEUE: 'ADD_TO_QUEUE',
    REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
    CLEAR_QUEUE: 'CLEAR_QUEUE',
    SET_PROCESSING_QUEUE: 'SET_PROCESSING_QUEUE',

    // Folders
    SET_FOLDERS: 'SET_FOLDERS',
    SET_CURRENT_FOLDER: 'SET_CURRENT_FOLDER',
    SET_SELECTED_FOLDER: 'SET_SELECTED_FOLDER',
    TOGGLE_INCLUDE_SUBFOLDERS: 'TOGGLE_INCLUDE_SUBFOLDERS',

    // Images
    SET_IMAGES: 'SET_IMAGES',
    ADD_IMAGES: 'ADD_IMAGES',
    APPEND_IMAGES: 'APPEND_IMAGES',
    REMOVE_IMAGE: 'REMOVE_IMAGE',
    UPDATE_IMAGE: 'UPDATE_IMAGE',
    SET_HAS_MORE: 'SET_HAS_MORE',
    SET_TOTAL_IMAGES: 'SET_TOTAL_IMAGES',
    SET_LOADING_MORE: 'SET_LOADING_MORE',

    // Selection
    SET_SELECTED_IMAGES: 'SET_SELECTED_IMAGES',
    TOGGLE_IMAGE_SELECTION: 'TOGGLE_IMAGE_SELECTION',
    SELECT_ALL_IMAGES: 'SELECT_ALL_IMAGES',
    CLEAR_SELECTION: 'CLEAR_SELECTION',
    SET_IS_SELECTING: 'SET_IS_SELECTING',

    // UI state
    SET_LIGHTBOX_INDEX: 'SET_LIGHTBOX_INDEX',
    SET_SHOW_MOBILE_SETTINGS: 'SET_SHOW_MOBILE_SETTINGS',
    SET_SHOW_FOLDER_MODAL: 'SET_SHOW_FOLDER_MODAL',
    SET_EDITING_FOLDER: 'SET_EDITING_FOLDER',
    SET_NEW_FOLDER_NAME: 'SET_NEW_FOLDER_NAME',
    SET_PARENT_FOLDER_ID: 'SET_PARENT_FOLDER_ID',
    SET_SHOW_APP_SETTINGS: 'SET_SHOW_APP_SETTINGS',

    // App settings
    SET_NOTIFICATIONS_ENABLED: 'SET_NOTIFICATIONS_ENABLED',

    // Bulk actions
    RESET_TO_DEFAULTS: 'RESET_TO_DEFAULTS'
};

// Initial state
const initialState = {
    // Config
    config: null,
    settingsLoaded: false,

    // Models
    models: [],
    selectedModel: '',

    // Generation settings
    positivePrompt: '',
    negativePrompt: '',
    orientation: 'portrait',
    batchSize: 1,
    seed: -1,
    showAdvanced: false,

    // Generation state
    isGenerating: false,
    progress: 0,
    status: null,

    // Queue state
    generationQueue: [],
    isProcessingQueue: false,

    // Folders
    folders: [],
    currentFolder: null,
    selectedFolder: '',
    includeSubfolders: true,

    // Images
    images: [],
    hasMore: false,
    totalImages: 0,
    isLoadingMore: false,

    // Selection
    selectedImages: [],
    isSelecting: false,

    // UI state
    lightboxIndex: null,
    showMobileSettings: false,
    showFolderModal: false,
    editingFolder: null,
    newFolderName: '',
    parentFolderId: null,
    showAppSettings: false,

    // App settings
    notificationsEnabled: true
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
        case ActionTypes.SET_CONFIG:
            return { ...state, config: action.payload };
        case ActionTypes.SET_SETTINGS_LOADED:
            return { ...state, settingsLoaded: action.payload };
        case ActionTypes.SET_MODELS:
            return { ...state, models: action.payload };
        case ActionTypes.SET_SELECTED_MODEL:
            return { ...state, selectedModel: action.payload };
        case ActionTypes.SET_POSITIVE_PROMPT:
            return { ...state, positivePrompt: action.payload };
        case ActionTypes.SET_NEGATIVE_PROMPT:
            return { ...state, negativePrompt: action.payload };
        case ActionTypes.SET_ORIENTATION:
            return { ...state, orientation: action.payload };
        case ActionTypes.SET_BATCH_SIZE:
            return { ...state, batchSize: action.payload };
        case ActionTypes.SET_SEED:
            return { ...state, seed: action.payload };
        case ActionTypes.SET_SHOW_ADVANCED:
            return { ...state, showAdvanced: action.payload };
        case ActionTypes.SET_GENERATING:
            return { ...state, isGenerating: action.payload };
        case ActionTypes.SET_PROGRESS:
            return { ...state, progress: action.payload };
        case ActionTypes.SET_STATUS:
            return { ...state, status: action.payload };
        case ActionTypes.ADD_TO_QUEUE:
            return { ...state, generationQueue: [...state.generationQueue, action.payload] };
        case ActionTypes.REMOVE_FROM_QUEUE:
            return { ...state, generationQueue: state.generationQueue.slice(1) };
        case ActionTypes.CLEAR_QUEUE:
            return { ...state, generationQueue: [] };
        case ActionTypes.SET_PROCESSING_QUEUE:
            return { ...state, isProcessingQueue: action.payload };
        case ActionTypes.SET_FOLDERS:
            return { ...state, folders: action.payload };
        case ActionTypes.SET_CURRENT_FOLDER:
            return { ...state, currentFolder: action.payload };
        case ActionTypes.SET_SELECTED_FOLDER:
            return { ...state, selectedFolder: action.payload };
        case ActionTypes.TOGGLE_INCLUDE_SUBFOLDERS:
            return { ...state, includeSubfolders: !state.includeSubfolders };
        case ActionTypes.SET_IMAGES:
            return { ...state, images: action.payload };
        case ActionTypes.ADD_IMAGES:
            return { ...state, images: [...action.payload, ...state.images] };
        case ActionTypes.APPEND_IMAGES:
            return { ...state, images: [...state.images, ...action.payload] };
        case ActionTypes.REMOVE_IMAGE:
            return { ...state, images: state.images.filter(img => img.id !== action.payload) };
        case ActionTypes.UPDATE_IMAGE:
            return {
                ...state,
                images: state.images.map(img =>
                    img.id === action.payload.id ? action.payload : img
                )
            };
        case ActionTypes.SET_HAS_MORE:
            return { ...state, hasMore: action.payload };
        case ActionTypes.SET_TOTAL_IMAGES:
            return { ...state, totalImages: action.payload };
        case ActionTypes.SET_LOADING_MORE:
            return { ...state, isLoadingMore: action.payload };
        case ActionTypes.SET_SELECTED_IMAGES:
            return { ...state, selectedImages: action.payload };
        case ActionTypes.TOGGLE_IMAGE_SELECTION:
            const imageId = action.payload;
            const isSelected = state.selectedImages.includes(imageId);
            return {
                ...state,
                selectedImages: isSelected
                    ? state.selectedImages.filter(id => id !== imageId)
                    : [...state.selectedImages, imageId]
            };
        case ActionTypes.SELECT_ALL_IMAGES:
            return { ...state, selectedImages: state.images.map(img => img.id) };
        case ActionTypes.CLEAR_SELECTION:
            return { ...state, selectedImages: [], isSelecting: false };
        case ActionTypes.SET_IS_SELECTING:
            return { ...state, isSelecting: action.payload };
        case ActionTypes.SET_LIGHTBOX_INDEX:
            return { ...state, lightboxIndex: action.payload };
        case ActionTypes.SET_SHOW_MOBILE_SETTINGS:
            return { ...state, showMobileSettings: action.payload };
        case ActionTypes.SET_SHOW_FOLDER_MODAL:
            return { ...state, showFolderModal: action.payload };
        case ActionTypes.SET_EDITING_FOLDER:
            return { ...state, editingFolder: action.payload };
        case ActionTypes.SET_NEW_FOLDER_NAME:
            return { ...state, newFolderName: action.payload };
        case ActionTypes.SET_PARENT_FOLDER_ID:
            return { ...state, parentFolderId: action.payload };
        case ActionTypes.SET_SHOW_APP_SETTINGS:
            return { ...state, showAppSettings: action.payload };
        case ActionTypes.SET_NOTIFICATIONS_ENABLED:
            return { ...state, notificationsEnabled: action.payload };
        case ActionTypes.RESET_TO_DEFAULTS:
            return {
                ...state,
                positivePrompt: state.config?.defaults.positivePrompt || '',
                negativePrompt: state.config?.defaults.negativePrompt || '',
                orientation: state.config?.defaults.orientation || 'portrait',
                batchSize: state.config?.defaults.batchSize || 1,
                seed: -1
            };
        default:
            return state;
    }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Load settings from localStorage
    const loadSettings = useCallback((config) => {
        if (typeof window === 'undefined') return false;

        const STORAGE_KEY = 'avatar-builder-settings';
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                dispatch({ type: ActionTypes.SET_POSITIVE_PROMPT, payload: settings.positivePrompt || config.defaults.positivePrompt });
                dispatch({ type: ActionTypes.SET_NEGATIVE_PROMPT, payload: settings.negativePrompt || config.defaults.negativePrompt });
                dispatch({ type: ActionTypes.SET_SELECTED_MODEL, payload: settings.selectedModel || '' });
                dispatch({ type: ActionTypes.SET_ORIENTATION, payload: settings.orientation || config.defaults.orientation });
                dispatch({ type: ActionTypes.SET_BATCH_SIZE, payload: settings.batchSize || config.defaults.batchSize });
                dispatch({ type: ActionTypes.SET_SEED, payload: settings.seed !== undefined ? settings.seed : -1 });
                dispatch({ type: ActionTypes.SET_SHOW_ADVANCED, payload: settings.showAdvanced || false });
                dispatch({ type: ActionTypes.SET_SELECTED_FOLDER, payload: settings.selectedFolder || '' });
                dispatch({ type: ActionTypes.SET_CURRENT_FOLDER, payload: settings.currentFolder || null });
                dispatch({ type: ActionTypes.SET_NOTIFICATIONS_ENABLED, payload: settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true });
                return true;
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
        return false;
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        if (typeof window === 'undefined' || !state.settingsLoaded) return;

        const STORAGE_KEY = 'avatar-builder-settings';
        const settings = {
            positivePrompt: state.positivePrompt,
            negativePrompt: state.negativePrompt,
            selectedModel: state.selectedModel,
            orientation: state.orientation,
            batchSize: state.batchSize,
            seed: state.seed,
            showAdvanced: state.showAdvanced,
            selectedFolder: state.selectedFolder,
            currentFolder: state.currentFolder,
            notificationsEnabled: state.notificationsEnabled
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    }, [
        state.positivePrompt,
        state.negativePrompt,
        state.selectedModel,
        state.orientation,
        state.batchSize,
        state.seed,
        state.showAdvanced,
        state.selectedFolder,
        state.currentFolder,
        state.notificationsEnabled,
        state.settingsLoaded
    ]);

    const value = {
        state,
        dispatch,
        actions: ActionTypes,
        loadSettings
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the context
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

export { ActionTypes };