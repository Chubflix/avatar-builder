# Client Refactoring Documentation

## Overview

The Avatar Builder client has been completely refactored to follow React best practices with a modular, maintainable architecture.

## Architecture

### Directory Structure

```
client/src/
├── api/
│   ├── sd.js              # Stable Diffusion API client
│   └── backend.js         # Backend API client (folders & images)
├── components/
│   ├── ControlsPanel.js   # Desktop generation controls
│   ├── ImageGallery.js    # Image grid display
│   ├── FolderNav.js       # Folder navigation tabs
│   ├── FolderModal.js     # Create/edit folder modal
│   ├── Lightbox.js        # Full-screen image viewer
│   ├── MobileControls.js  # Mobile-responsive controls
│   └── index.js           # Component exports
├── context/
│   └── AppContext.js      # Global state management with React Context
├── hooks/
│   └── index.js           # Custom hooks for business logic
├── App.js                 # Main application component
├── index.js               # React entry point
└── index.css              # Global styles
```

## Key Improvements

### 1. **API Layer Separation**

All API calls are now centralized in dedicated modules:

#### `api/sd.js` - Stable Diffusion API
```javascript
import sdAPI from './api/sd';

// Get models
const models = await sdAPI.getModels();

// Set model
await sdAPI.setModel('model-name');

// Generate images
const result = await sdAPI.generateImage({
    prompt: 'masterpiece',
    width: 512,
    height: 512,
    // ...other params
});

// Get progress
const progress = await sdAPI.getProgress();
```

#### `api/backend.js` - Backend API
```javascript
import { folderAPI, imageAPI } from './api/backend';

// Folder operations
const folders = await folderAPI.getAll();
const folder = await folderAPI.create({ name: 'Character' });
await folderAPI.update(id, { name: 'New Name' });
await folderAPI.delete(id);

// Image operations
const data = await imageAPI.getAll({ folderId, limit, offset });
const saved = await imageAPI.save({ imageData, ...metadata });
await imageAPI.update(id, { folderId });
await imageAPI.delete(id);
await imageAPI.bulkMove(imageIds, folderId);

// Utility methods
const url = imageAPI.getUrl(image);
imageAPI.download(image);
await imageAPI.copyToClipboard(image);
```

### 2. **State Management with Context**

Global state is managed using React Context API with a reducer pattern:

```javascript
import { useApp } from './context/AppContext';

function MyComponent() {
    const { state, dispatch, actions } = useApp();
    
    // Access state
    const { images, folders, config } = state;
    
    // Dispatch actions
    dispatch({ 
        type: actions.SET_POSITIVE_PROMPT, 
        payload: 'new prompt' 
    });
}
```

#### State Structure
```javascript
{
    // Config
    config: {},
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
    
    // Folders
    folders: [],
    currentFolder: null,
    selectedFolder: '',
    
    // Images
    images: [],
    hasMore: false,
    totalImages: 0,
    isLoadingMore: false,
    
    // UI state
    lightboxIndex: null,
    showMobileSettings: false,
    showFolderModal: false,
    editingFolder: null,
    newFolderName: ''
}
```

### 3. **Custom Hooks for Business Logic**

Complex logic is encapsulated in reusable hooks:

#### `useFolders()` - Folder management
```javascript
const { loadFolders, createFolder, updateFolder, deleteFolder } = useFolders();
```

#### `useImages()` - Image management
```javascript
const { loadImages, loadMoreImages, deleteImage, moveImageToFolder } = useImages();
```

#### `useGeneration()` - Image generation
```javascript
const { generate } = useGeneration();
```

#### `useModels()` - Model loading
```javascript
const { loadModels } = useModels();
```

### 4. **Component-Based UI**

The UI is broken down into focused, reusable components:

#### **ControlsPanel**
Desktop generation controls with:
- Positive/negative prompts
- Folder selection
- Orientation & batch size
- Advanced settings (collapsible)
- Generate button with progress

#### **ImageGallery**
Responsive grid of images with:
- Lazy loading
- Hover overlays with action buttons
- Image metadata display
- Load more pagination

#### **FolderNav**
Folder navigation with:
- All/Unfiled/Custom folder tabs
- Image count badges
- Edit/delete folder actions
- Add new folder button

#### **FolderModal**
Modal for creating/editing folders:
- Name input
- Create/Update/Delete actions
- Validation

#### **Lightbox**
Full-screen image viewer with:
- Keyboard navigation (arrows, escape)
- Touch gestures (swipe)
- Image metadata
- Folder selector
- Action buttons (download, copy, restore, delete)

#### **MobileControls**
Mobile-optimized bottom controls:
- Collapsible settings overlay
- Compact prompt input
- Quick generate button
- Progress indicator

### 5. **Benefits of This Architecture**

#### **Maintainability**
- Clear separation of concerns
- Each file has a single responsibility
- Easy to locate and modify code

#### **Testability**
- API modules can be mocked easily
- Components can be tested in isolation
- Hooks can be tested independently

#### **Reusability**
- Components are self-contained
- Hooks encapsulate reusable logic
- API clients can be used anywhere

#### **Scalability**
- Easy to add new features
- Simple to add new API endpoints
- Components can be composed

#### **Developer Experience**
- Clear file organization
- Type-safe patterns (can add TypeScript later)
- Consistent code style

## Migration Guide

### Before (Monolithic App.js)
```javascript
// Everything in one 1287-line file
function App() {
    const [config, setConfig] = useState(null);
    const [models, setModels] = useState([]);
    // ... 30+ more state variables
    
    const loadModels = async (baseUrl) => { /* ... */ };
    const handleGenerate = async () => { /* ... */ };
    // ... 20+ more functions
    
    return (/* 800+ lines of JSX */);
}
```

### After (Modular Architecture)
```javascript
// Clean, focused App.js
function AppContent() {
    const { state } = useApp();
    const { generate } = useGeneration();
    const { loadFolders } = useFolders();
    // ... focused hooks
    
    return (
        <>
            <ControlsPanel onGenerate={generate} />
            <ImageGallery />
            <Lightbox />
            {/* ... clean component composition */}
        </>
    );
}
```

## Usage Examples

### Adding a New Feature

**Example: Add bulk select for images**

1. **Update State** (`context/AppContext.js`):
```javascript
// Add to initial state
selectedImages: []

// Add action types
SET_SELECTED_IMAGES: 'SET_SELECTED_IMAGES'

// Add to reducer
case ActionTypes.SET_SELECTED_IMAGES:
    return { ...state, selectedImages: action.payload };
```

2. **Add API Method** (`api/backend.js`):
```javascript
// Already exists!
await imageAPI.bulkMove(imageIds, folderId);
```

3. **Create Hook** (`hooks/index.js`):
```javascript
export function useBulkSelect() {
    const { state, dispatch, actions } = useApp();
    
    const toggleSelect = (imageId) => {
        const selected = state.selectedImages.includes(imageId)
            ? state.selectedImages.filter(id => id !== imageId)
            : [...state.selectedImages, imageId];
        dispatch({ type: actions.SET_SELECTED_IMAGES, payload: selected });
    };
    
    const bulkMove = async (folderId) => {
        await imageAPI.bulkMove(state.selectedImages, folderId);
        dispatch({ type: actions.SET_SELECTED_IMAGES, payload: [] });
    };
    
    return { toggleSelect, bulkMove };
}
```

4. **Update Component** (`components/ImageGallery.js`):
```javascript
import { useBulkSelect } from '../hooks';

function ImageGallery() {
    const { toggleSelect } = useBulkSelect();
    
    return (
        <div className="image-card">
            <input 
                type="checkbox" 
                onChange={() => toggleSelect(image.id)}
            />
            {/* ... */}
        </div>
    );
}
```

### Debugging

**Check State:**
```javascript
// In any component
const { state } = useApp();
console.log('Current state:', state);
```

**Check API Calls:**
```javascript
// In api/backend.js or api/sd.js
// Add logging to any method
async getAll() {
    console.log('Fetching images...');
    const response = await fetch(url);
    console.log('Response:', response);
    return data;
}
```

**Check Component Renders:**
```javascript
// In any component
useEffect(() => {
    console.log('Component mounted/updated:', props);
}, [props]);
```

## Performance Considerations

### Current Optimizations

1. **Lazy Loading**: Images load on demand
2. **Pagination**: Only loads 50 images at a time
3. **Memo Prevention**: Uses context to prevent unnecessary re-renders
4. **Local Storage**: Settings persist across sessions

### Future Optimizations

1. **React.memo()**: Memoize components
2. **useMemo()**: Memoize expensive calculations
3. **useCallback()**: Memoize callback functions
4. **Code Splitting**: Lazy load components
5. **Virtual Scrolling**: For large image lists

## Testing Strategy

### Unit Tests (Recommended)

```javascript
// api/backend.test.js
test('imageAPI.getAll returns images', async () => {
    const data = await imageAPI.getAll();
    expect(data).toHaveProperty('images');
});

// hooks/index.test.js
test('useFolders creates folder', async () => {
    const { result } = renderHook(() => useFolders());
    await act(() => result.current.createFolder('Test'));
    // assertions...
});

// components/ImageGallery.test.js
test('ImageGallery renders images', () => {
    render(<ImageGallery />);
    expect(screen.getByText(/images/i)).toBeInTheDocument();
});
```

### Integration Tests

```javascript
// Test complete user flows
test('user can create folder and generate images', async () => {
    render(<App />);
    // Create folder
    fireEvent.click(screen.getByText(/create folder/i));
    fireEvent.change(screen.getByPlaceholderText(/folder name/i), {
        target: { value: 'Test Character' }
    });
    fireEvent.click(screen.getByText(/create/i));
    
    // Generate images
    fireEvent.change(screen.getByPlaceholderText(/positive prompt/i), {
        target: { value: 'test prompt' }
    });
    fireEvent.click(screen.getByText(/generate/i));
    
    // Assertions...
});
```

## Troubleshooting

### Common Issues

**Issue: "Cannot find module './api/backend'"**
- **Solution**: Ensure all files are in correct directories
- **Check**: `ls -la client/src/api/`

**Issue: "useApp must be used within AppProvider"**
- **Solution**: Ensure App is wrapped with AppProvider
- **Check**: `<AppProvider><AppContent /></AppProvider>`

**Issue: State not updating**
- **Solution**: Ensure you're dispatching actions correctly
- **Check**: `dispatch({ type: actions.ACTION_NAME, payload: value })`

**Issue: API calls failing**
- **Solution**: Check network tab in browser devtools
- **Check**: API endpoints match server routes

## Future Enhancements

### Potential Additions

1. **TypeScript**: Add type safety
2. **Redux**: If state becomes more complex
3. **React Query**: For API caching and sync
4. **Storybook**: Component documentation
5. **Jest**: Testing framework
6. **ESLint**: Code quality
7. **Prettier**: Code formatting

### Migration Path

**Adding TypeScript:**
```bash
npm install --save typescript @types/react @types/react-dom
# Rename .js to .tsx
# Add tsconfig.json
```

**Adding Redux:**
```bash
npm install redux react-redux @reduxjs/toolkit
# Create store/
# Convert Context to Redux slices
```

**Adding Tests:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
# Create __tests__/ directories
# Write tests
```

## File Size Comparison

### Before Refactoring
- `App.js`: **1287 lines** (~50KB)
- Total: 1 file

### After Refactoring
- `App.js`: **180 lines** (~8KB)
- `api/sd.js`: **130 lines** (~3KB)
- `api/backend.js`: **230 lines** (~5KB)
- `context/AppContext.js`: **280 lines** (~9KB)
- `hooks/index.js`: **330 lines** (~10KB)
- `components/*.js`: **500 lines total** (~20KB)
- **Total: 12 files, ~1650 lines (~55KB)**

**Benefits:**
- ✅ Average file size: ~138 lines (easy to understand)
- ✅ Clear separation of concerns
- ✅ Better code organization
- ✅ Easier to navigate and maintain

## Conclusion

The refactored architecture provides a solid foundation for:
- **Maintainability**: Easy to understand and modify
- **Scalability**: Simple to add new features
- **Testability**: Components can be tested in isolation
- **Developer Experience**: Clear structure and patterns

The modular approach makes it easy for new developers to understand the codebase and contribute effectively.
