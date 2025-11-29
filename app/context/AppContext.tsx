import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Types
export type Orientation = 'portrait' | 'landscape' | 'square' | string;

export interface DefaultsConfig {
  positivePrompt: string;
  negativePrompt: string;
  orientation: Orientation;
  batchSize: number;
}

export interface GeneratorConfig {
    scheduler: string;
    samplerName: string;
}

export interface AdetailerConfig {
    model: string;
    enabled: boolean;
}

export interface Dimension {
    width: number;
    height: number;
}

export interface Config {
  defaults: DefaultsConfig;
  generation?: GeneratorConfig | null;
  dimensions?: {
      [key: Orientation | string]: Dimension
  };
  adetailer_list: AdetailerConfig[];
  // Allow extra keys without breaking
  [key: string]: any;
}

export interface ImageItem {
  id: string | number;
  [key: string]: any;
}

export interface CharacterItem {
  [key: string]: any;
}

export interface FolderItem {
  id?: string | number | null;
  name?: string;
  parentId?: string | number | null;
  [key: string]: any;
}

export interface LoraSliderState {
  enabled: boolean;
  value: number;
}

export interface LocksState {
  [key: string]: boolean | undefined;
}

export interface AppState {
  // Config
  config: Config | null;
  settingsLoaded: boolean;

  // Models
  models: string[];
  selectedModel: string;

  // Generation settings
  positivePrompt: string;
  negativePrompt: string;
  orientation: Orientation;
  batchSize: number;
  seed: number;
  showAdvanced: boolean;

  // Img2Img
  initImage: string | null;
  denoisingStrength: number;
  // Inpaint
  maskImage?: string | null;
  showInpaintModal?: boolean;

  // Generation state
  isGenerating: boolean;
  progress: number;
  status: string | null;

  // Queue state moved to QueueContext

  // Characters
  characters: CharacterItem[];
  selectedCharacter: CharacterItem | null;
  showCharacterModal: boolean;
  editingCharacter: CharacterItem | null;

  // Folders
  folders: FolderItem[];
  currentFolder: FolderItem | null;
  selectedFolder: string;

  // Images
  images: ImageItem[];
  hasMore: boolean;
  totalImages: number;
  isLoadingMore: boolean;

  // Selection
  selectedImages: Array<string | number>;
  isSelecting: boolean;
  lastClickedIndex: number | null;

  // UI state
  lightboxIndex: number | null;
  showMobileSettings: boolean;
  showMobilePrompt: boolean;
  showFolderModal: boolean;
  editingFolder: FolderItem | null;
  newFolderName: string;
  parentFolderId: string | number | null;
  showAppSettings: boolean;
  showPromptModal: boolean;
  showQueueManager: boolean;
  showConfigModal: boolean;
  showCharacterStudio: boolean;

  // App settings
  notificationsEnabled: boolean;
  showImageInfo: boolean;
  hideNsfw: boolean;
  showFavoritesOnly: boolean;
  // Feature toggles
  tagAutocompleteEnabled: boolean;

  // Lora settings
  loraSliders: Record<string, LoraSliderState>;
  loraToggles: Record<string, boolean>;
  loraStyle: string;

  // Locks
  locks: LocksState;
}

// Cookie utilities
const setCookie = (name: string, value: string, days = 365) => {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

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

  // Img2Img
  SET_INIT_IMAGE: 'SET_INIT_IMAGE',
  SET_DENOISING_STRENGTH: 'SET_DENOISING_STRENGTH',
  // Inpaint
  SET_MASK_IMAGE: 'SET_MASK_IMAGE',
  SET_SHOW_INPAINT_MODAL: 'SET_SHOW_INPAINT_MODAL',

  // Generation state
  SET_GENERATING: 'SET_GENERATING',
  SET_PROGRESS: 'SET_PROGRESS',
  SET_STATUS: 'SET_STATUS',

  // Queue state moved to QueueContext

  // Characters
  SET_CHARACTERS: 'SET_CHARACTERS',
  SET_SELECTED_CHARACTER: 'SET_SELECTED_CHARACTER',
  SET_SHOW_CHARACTER_MODAL: 'SET_SHOW_CHARACTER_MODAL',
  SET_EDITING_CHARACTER: 'SET_EDITING_CHARACTER',

  // Folders
  SET_FOLDERS: 'SET_FOLDERS',
  SET_CURRENT_FOLDER: 'SET_CURRENT_FOLDER',
  SET_SELECTED_FOLDER: 'SET_SELECTED_FOLDER',

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
  SELECT_IMAGE_RANGE: 'SELECT_IMAGE_RANGE',
  SELECT_ALL_IMAGES: 'SELECT_ALL_IMAGES',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  SET_IS_SELECTING: 'SET_IS_SELECTING',
  SET_LAST_CLICKED_INDEX: 'SET_LAST_CLICKED_INDEX',

  // UI state
  SET_LIGHTBOX_INDEX: 'SET_LIGHTBOX_INDEX',
  SET_SHOW_MOBILE_SETTINGS: 'SET_SHOW_MOBILE_SETTINGS',
  SET_SHOW_MOBILE_PROMPT: 'SET_SHOW_MOBILE_PROMPT',
  SET_SHOW_FOLDER_MODAL: 'SET_SHOW_FOLDER_MODAL',
  SET_EDITING_FOLDER: 'SET_EDITING_FOLDER',
  SET_NEW_FOLDER_NAME: 'SET_NEW_FOLDER_NAME',
  SET_PARENT_FOLDER_ID: 'SET_PARENT_FOLDER_ID',
  SET_SHOW_APP_SETTINGS: 'SET_SHOW_APP_SETTINGS',
  SET_SHOW_PROMPT_MODAL: 'SET_SHOW_PROMPT_MODAL',
  SET_SHOW_QUEUE_MANAGER: 'SET_SHOW_QUEUE_MANAGER',
  SET_SHOW_CONFIG_MODAL: 'SET_SHOW_CONFIG_MODAL',
  SET_SHOW_CHARACTER_STUDIO: 'SET_SHOW_CHARACTER_STUDIO',

  // App settings
  SET_NOTIFICATIONS_ENABLED: 'SET_NOTIFICATIONS_ENABLED',
  SET_SHOW_IMAGE_INFO: 'SET_SHOW_IMAGE_INFO',
  SET_HIDE_NSFW: 'SET_HIDE_NSFW',
  SET_SHOW_FAVORITES_ONLY: 'SET_SHOW_FAVORITES_ONLY',
  SET_TAG_AUTOCOMPLETE_ENABLED: 'SET_TAG_AUTOCOMPLETE_ENABLED',

  // Bulk actions
  RESET_TO_DEFAULTS: 'RESET_TO_DEFAULTS',

  // Lora settings
  SET_LORA_SLIDER: 'SET_LORA_SLIDER',
  TOGGLE_LORA_SLIDER: 'TOGGLE_LORA_SLIDER',
  SET_LORA_TOGGLE: 'SET_LORA_TOGGLE',
  SET_LORA_STYLE: 'SET_LORA_STYLE',

  // Locks
  TOGGLE_LOCK: 'TOGGLE_LOCK',
  SET_LOCKS: 'SET_LOCKS',
} as const;

export type ActionType = keyof typeof ActionTypes;

export interface Action<T = any> {
  type: ActionType;
  payload?: T;
}

// Initial state
const initialState: AppState = {
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

  // Img2Img
  initImage: null,
  denoisingStrength: 0.5,
  // Inpaint
  maskImage: null,
  showInpaintModal: false,

  // Generation state
  isGenerating: false,
  progress: 0,
  status: null,

  // Queue state moved to QueueContext

  // Characters
  characters: [],
  selectedCharacter: null,
  showCharacterModal: false,
  editingCharacter: null,

  // Folders
  folders: [],
  currentFolder: null,
  selectedFolder: '',

  // Images
  images: [],
  hasMore: false,
  totalImages: 0,
  isLoadingMore: false,

  // Selection
  selectedImages: [],
  isSelecting: false,
  lastClickedIndex: null,

  // UI state
  lightboxIndex: null,
  showMobileSettings: false,
  showMobilePrompt: false,
  showFolderModal: false,
  editingFolder: null,
  newFolderName: '',
  parentFolderId: null,
  showAppSettings: false,
  showPromptModal: false,
  showQueueManager: false,
  showConfigModal: false,
  showCharacterStudio: false,

  // App settings
  notificationsEnabled: true,
  showImageInfo: true,
  hideNsfw: false,
  showFavoritesOnly: false,
  tagAutocompleteEnabled: true,

  // Lora settings
  loraSliders: {},
  loraToggles: {},
  loraStyle: '',

  // Locks
  locks: {},
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload as Config };
    case 'SET_SETTINGS_LOADED':
      return { ...state, settingsLoaded: Boolean(action.payload) };
    case 'SET_MODELS':
      return { ...state, models: (action.payload as string[]) ?? [] };
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: (action.payload as string) ?? '' };
    case 'SET_POSITIVE_PROMPT':
      return { ...state, positivePrompt: (action.payload as string) ?? '' };
    case 'SET_NEGATIVE_PROMPT':
      return { ...state, negativePrompt: (action.payload as string) ?? '' };
    case 'SET_ORIENTATION':
      return { ...state, orientation: (action.payload as Orientation) ?? 'portrait' };
    case 'SET_BATCH_SIZE':
      return { ...state, batchSize: Number(action.payload) };
    case 'SET_SEED':
      return { ...state, seed: Number(action.payload) };
    case 'SET_SHOW_ADVANCED':
      return { ...state, showAdvanced: Boolean(action.payload) };
    case 'SET_INIT_IMAGE':
      return { ...state, initImage: (action.payload as string) ?? null };
    case 'SET_DENOISING_STRENGTH':
      return { ...state, denoisingStrength: Number(action.payload) };
    case 'SET_MASK_IMAGE':
      return { ...state, maskImage: (action.payload as string) ?? null };
    case 'SET_SHOW_INPAINT_MODAL':
      return { ...state, showInpaintModal: Boolean(action.payload) };
    case 'SET_GENERATING':
      return { ...state, isGenerating: Boolean(action.payload) };
    case 'SET_PROGRESS':
      return { ...state, progress: Number(action.payload) };
    case 'SET_STATUS':
      return { ...state, status: (action.payload as string) ?? null };
    // queue: handled in QueueContext
    case 'SET_CHARACTERS':
      return { ...state, characters: (action.payload as CharacterItem[]) ?? [] };
    case 'SET_SELECTED_CHARACTER':
      return { ...state, selectedCharacter: (action.payload as CharacterItem) ?? null };
    case 'SET_SHOW_CHARACTER_MODAL':
      return { ...state, showCharacterModal: Boolean(action.payload) };
    case 'SET_EDITING_CHARACTER':
      return { ...state, editingCharacter: (action.payload as CharacterItem) ?? null };
    case 'SET_FOLDERS':
      return { ...state, folders: (action.payload as FolderItem[]) ?? [] };
    case 'SET_CURRENT_FOLDER':
      return { ...state, currentFolder: (action.payload as FolderItem | null) ?? null };
    case 'SET_SELECTED_FOLDER':
      return { ...state, selectedFolder: (action.payload as string) ?? '' };
    case 'SET_IMAGES':
      return { ...state, images: (action.payload as ImageItem[]) ?? [] };
    case 'ADD_IMAGES':
      return { ...state, images: [ ...(action.payload as ImageItem[]), ...state.images ] };
    case 'APPEND_IMAGES':
      return { ...state, images: [ ...state.images, ...(action.payload as ImageItem[]) ] };
    case 'REMOVE_IMAGE':
      return { ...state, images: state.images.filter(img => img.id !== (action.payload as any)) };
    case 'UPDATE_IMAGE':
      return {
        ...state,
        images: state.images.map(img =>
          (img.id === (action.payload as ImageItem).id ? (action.payload as ImageItem) : img)
        )
      };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: Boolean(action.payload) };
    case 'SET_TOTAL_IMAGES':
      return { ...state, totalImages: Number(action.payload) };
    case 'SET_LOADING_MORE':
      return { ...state, isLoadingMore: Boolean(action.payload) };
    case 'SET_SELECTED_IMAGES':
      return { ...state, selectedImages: (action.payload as Array<string | number>) ?? [] };
    case 'TOGGLE_IMAGE_SELECTION': {
      const imageId = action.payload as string | number;
      const isSelected = state.selectedImages.includes(imageId);
      return {
        ...state,
        selectedImages: isSelected
          ? state.selectedImages.filter(id => id !== imageId)
          : [...state.selectedImages, imageId]
      };
    }
    case 'SELECT_IMAGE_RANGE': {
      const { startIndex, endIndex } = (action.payload as { startIndex: number; endIndex: number });
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      const rangeIds = state.images.slice(start, end + 1).map(img => img.id);
      const newSelection = Array.from(new Set([...state.selectedImages, ...rangeIds]));
      return { ...state, selectedImages: newSelection as Array<string | number> };
    }
    case 'SELECT_ALL_IMAGES':
      return { ...state, selectedImages: state.images.map(img => img.id) };
    case 'CLEAR_SELECTION':
      return { ...state, selectedImages: [], isSelecting: false, lastClickedIndex: null };
    case 'SET_IS_SELECTING':
      return { ...state, isSelecting: Boolean(action.payload) };
    case 'SET_LAST_CLICKED_INDEX':
      return { ...state, lastClickedIndex: (action.payload as number) ?? null };
    case 'SET_LIGHTBOX_INDEX':
      return { ...state, lightboxIndex: (action.payload as number) ?? null };
    case 'SET_SHOW_MOBILE_SETTINGS':
      return { ...state, showMobileSettings: Boolean(action.payload) };
    case 'SET_SHOW_MOBILE_PROMPT':
      return { ...state, showMobilePrompt: Boolean(action.payload) };
    case 'SET_SHOW_FOLDER_MODAL':
      return { ...state, showFolderModal: Boolean(action.payload) };
    case 'SET_EDITING_FOLDER':
      return { ...state, editingFolder: (action.payload as FolderItem) ?? null };
    case 'SET_NEW_FOLDER_NAME':
      return { ...state, newFolderName: (action.payload as string) ?? '' };
    case 'SET_PARENT_FOLDER_ID':
      return { ...state, parentFolderId: (action.payload as any) ?? null };
    case 'SET_SHOW_APP_SETTINGS':
      return { ...state, showAppSettings: Boolean(action.payload) };
    case 'SET_SHOW_PROMPT_MODAL':
      return { ...state, showPromptModal: Boolean(action.payload) };
    case 'SET_SHOW_QUEUE_MANAGER':
      return { ...state, showQueueManager: Boolean(action.payload) };
    case 'SET_SHOW_CONFIG_MODAL':
      return { ...state, showConfigModal: Boolean(action.payload) };
    case 'SET_SHOW_CHARACTER_STUDIO':
      return { ...state, showCharacterStudio: Boolean(action.payload) };
    case 'SET_NOTIFICATIONS_ENABLED':
      return { ...state, notificationsEnabled: Boolean(action.payload) };
    case 'SET_SHOW_IMAGE_INFO':
      return { ...state, showImageInfo: Boolean(action.payload) };
    case 'SET_HIDE_NSFW':
      return { ...state, hideNsfw: Boolean(action.payload) };
    case 'SET_TAG_AUTOCOMPLETE_ENABLED':
      return { ...state, tagAutocompleteEnabled: Boolean(action.payload) };
    case 'SET_SHOW_FAVORITES_ONLY':
      return { ...state, showFavoritesOnly: Boolean(action.payload) };
    case 'RESET_TO_DEFAULTS':
      return {
        ...state,
        positivePrompt: state.config?.defaults.positivePrompt || '',
        negativePrompt: state.config?.defaults.negativePrompt || '',
        orientation: state.config?.defaults.orientation || 'portrait',
        batchSize: state.config?.defaults.batchSize || 1,
        seed: -1,
      };
    case 'SET_LORA_SLIDER':
      return {
        ...state,
        loraSliders: {
          ...state.loraSliders,
          [(action.payload as { name: string; value: number }).name]: {
            enabled: state.loraSliders[(action.payload as { name: string }).name]?.enabled || false,
            value: (action.payload as { name: string; value: number }).value,
          },
        },
      };
    case 'TOGGLE_LORA_SLIDER': {
      const p = action.payload as { name: string; defaultValue: number };
      const cur = state.loraSliders[p.name];
      return {
        ...state,
        loraSliders: {
          ...state.loraSliders,
          [p.name]: {
            enabled: !cur?.enabled,
            value: cur?.value ?? p.defaultValue,
          },
        },
      };
    }
    case 'SET_LORA_TOGGLE': {
      const p = action.payload as { name: string; enabled: boolean };
      return {
        ...state,
        loraToggles: {
          ...state.loraToggles,
          [p.name]: p.enabled,
        },
      };
    }
    case 'SET_LORA_STYLE':
      return { ...state, loraStyle: (action.payload as string) ?? '' };
    case 'TOGGLE_LOCK':
      return {
        ...state,
        locks: {
          ...state.locks,
          [(action.payload as string)]: !state.locks[(action.payload as string)],
        },
      };
    case 'SET_LOCKS':
      return { ...state, locks: (action.payload as LocksState) ?? {} };
    default:
      return state;
  }
}

// Context
export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: typeof ActionTypes;
  loadSettings: (config: Config) => boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load settings from localStorage
  const loadSettings = useCallback((config: Config) => {
    if (typeof window === 'undefined') return false;

    const STORAGE_KEY = 'avatar-builder-settings';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        dispatch({ type: 'SET_POSITIVE_PROMPT', payload: settings.positivePrompt || config.defaults.positivePrompt });
        dispatch({ type: 'SET_NEGATIVE_PROMPT', payload: settings.negativePrompt || config.defaults.negativePrompt });
        dispatch({ type: 'SET_SELECTED_MODEL', payload: settings.selectedModel || '' });
        dispatch({ type: 'SET_ORIENTATION', payload: settings.orientation || config.defaults.orientation });
        dispatch({ type: 'SET_BATCH_SIZE', payload: settings.batchSize || config.defaults.batchSize });
        dispatch({ type: 'SET_SEED', payload: settings.seed !== undefined ? settings.seed : -1 });
        dispatch({ type: 'SET_SHOW_ADVANCED', payload: settings.showAdvanced || false });

        // Load selectedFolder from cookie instead of localStorage
        const selectedFolderFromCookie = getCookie('selectedFolder');
        dispatch({ type: 'SET_SELECTED_FOLDER', payload: selectedFolderFromCookie || '' });

        dispatch({ type: 'SET_CURRENT_FOLDER', payload: settings.currentFolder || null });
        dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', payload: settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true });
        dispatch({ type: 'SET_SHOW_IMAGE_INFO', payload: settings.showImageInfo !== undefined ? settings.showImageInfo : true });
        dispatch({ type: 'SET_HIDE_NSFW', payload: settings.hideNsfw !== undefined ? settings.hideNsfw : false });
        dispatch({ type: 'SET_TAG_AUTOCOMPLETE_ENABLED', payload: settings.tagAutocompleteEnabled !== undefined ? settings.tagAutocompleteEnabled : true });
        dispatch({ type: 'SET_LOCKS', payload: settings.locks !== undefined ? settings.locks : {} });

        // Load lora settings
        if (settings.loraSliders) {
          Object.keys(settings.loraSliders).forEach((name: string) => {
            const slider = settings.loraSliders[name];
            dispatch({ type: 'SET_LORA_SLIDER', payload: { name, value: slider.value } });
            if (slider.enabled) {
              dispatch({ type: 'TOGGLE_LORA_SLIDER', payload: { name, defaultValue: slider.value } });
            }
          });
        }
        if (settings.loraToggles) {
          Object.keys(settings.loraToggles).forEach((name: string) => {
            dispatch({ type: 'SET_LORA_TOGGLE', payload: { name, enabled: settings.loraToggles[name] } });
          });
        }
        if (settings.loraStyle) {
          dispatch({ type: 'SET_LORA_STYLE', payload: settings.loraStyle });
        }

        return true;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    return false;
  }, []);

  // Save settings to localStorage (excluding selectedFolder which uses cookie)
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
      currentFolder: state.currentFolder,
      notificationsEnabled: state.notificationsEnabled,
      showImageInfo: state.showImageInfo,
      hideNsfw: state.hideNsfw,
      tagAutocompleteEnabled: state.tagAutocompleteEnabled,
      loraSliders: state.loraSliders,
      loraToggles: state.loraToggles,
      loraStyle: state.loraStyle,
      locks: state.locks,
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
    state.currentFolder,
    state.notificationsEnabled,
    state.showImageInfo,
    state.hideNsfw,
    state.tagAutocompleteEnabled,
    state.loraSliders,
    state.loraToggles,
    state.loraStyle,
    state.settingsLoaded,
    state.locks,
  ]);

  // Save selectedFolder to cookie
  useEffect(() => {
    if (typeof window === 'undefined' || !state.settingsLoaded) return;
    setCookie('selectedFolder', state.selectedFolder || '', 365);
  }, [state.selectedFolder, state.settingsLoaded]);


  const value: AppContextValue = {
    state,
    dispatch,
    actions: ActionTypes,
    loadSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the context
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export { ActionTypes };
