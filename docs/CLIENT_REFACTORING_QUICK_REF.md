# Client Refactoring - Quick Reference

## File Structure

```
src/
├── api/
│   ├── sd.js              → Stable Diffusion API
│   └── backend.js         → Backend API (folders/images)
├── components/
│   ├── ControlsPanel.js   → Desktop controls
│   ├── ImageGallery.js    → Image grid
│   ├── FolderNav.js       → Folder tabs
│   ├── FolderModal.js     → Create/edit modal
│   ├── Lightbox.js        → Full-screen viewer
│   └── MobileControls.js  → Mobile controls
├── context/
│   └── AppContext.js      → Global state
├── hooks/
│   └── index.js           → Custom hooks
└── App.js                 → Main component
```

## Quick Imports

```javascript
// API
import sdAPI from './api/sd';
import { folderAPI, imageAPI } from './api/backend';

// Context
import { useApp } from './context/AppContext';

// Hooks
import { useFolders, useImages, useGeneration, useModels } from './hooks';

// Components
import { ControlsPanel, ImageGallery, Lightbox } from './components';
```

## Common Patterns

### Access State
```javascript
const { state } = useApp();
const { images, folders, config } = state;
```

### Update State
```javascript
const { dispatch, actions } = useApp();
dispatch({ type: actions.SET_POSITIVE_PROMPT, payload: 'text' });
```

### Use Hooks
```javascript
const { loadFolders, createFolder } = useFolders();
const { loadImages, deleteImage } = useImages();
const { generate } = useGeneration();
```

### Call APIs
```javascript
// Stable Diffusion
const models = await sdAPI.getModels();
await sdAPI.setModel('model-name');
const result = await sdAPI.generateImage({...});

// Backend
const folders = await folderAPI.getAll();
await folderAPI.create({ name: 'Test' });
const images = await imageAPI.getAll({ folderId });
await imageAPI.save({ imageData, ...metadata });
```

## State Actions

| Action | Payload | Description |
|--------|---------|-------------|
| SET_CONFIG | config object | Set app configuration |
| SET_MODELS | array | Set available models |
| SET_POSITIVE_PROMPT | string | Update positive prompt |
| SET_NEGATIVE_PROMPT | string | Update negative prompt |
| SET_ORIENTATION | 'portrait'/'landscape' | Set image orientation |
| SET_GENERATING | boolean | Toggle generation state |
| SET_FOLDERS | array | Set folder list |
| SET_CURRENT_FOLDER | string/null | Change active folder |
| SET_IMAGES | array | Replace image list |
| ADD_IMAGES | array | Prepend images |
| REMOVE_IMAGE | string (id) | Delete image |
| SET_LIGHTBOX_INDEX | number/null | Open/close lightbox |
| RESET_TO_DEFAULTS | - | Reset all settings |

## Component Props

### ControlsPanel
```javascript
<ControlsPanel
    onGenerate={() => {}}
    onResetDefaults={() => {}}
    onOpenFolderModal={(folder) => {}}
/>
```

### ImageGallery
```javascript
<ImageGallery
    onOpenLightbox={(index) => {}}
    onRestoreSettings={(image, withSeed) => {}}
    onDelete={(imageId) => {}}
    onLoadMore={() => {}}
/>
```

### Lightbox
```javascript
<Lightbox
    onClose={() => {}}
    onMoveToFolder={(imageId, folderId) => {}}
    onRestoreSettings={(image, withSeed) => {}}
    onDelete={(imageId) => {}}
/>
```

### FolderNav
```javascript
<FolderNav
    onOpenFolderModal={(folder) => {}}
/>
```

### FolderModal
```javascript
<FolderModal
    onSave={(folderId, name) => {}}
    onDelete={(folderId) => {}}
/>
```

## API Reference

### sdAPI
```javascript
// Methods
sdAPI.setBaseUrl(url)
await sdAPI.getModels()
await sdAPI.setModel(modelName)
await sdAPI.getProgress()
await sdAPI.generateImage({ prompt, ...params })
```

### folderAPI
```javascript
// Methods
await folderAPI.getAll()
await folderAPI.create({ name, description })
await folderAPI.update(id, { name, description })
await folderAPI.delete(id)
```

### imageAPI
```javascript
// Methods
await imageAPI.getAll({ folderId, limit, offset })
await imageAPI.save({ imageData, ...metadata })
await imageAPI.update(id, { folderId })
await imageAPI.delete(id)
await imageAPI.bulkMove(imageIds, folderId)

// Utilities
imageAPI.getUrl(image)
imageAPI.download(image)
await imageAPI.copyToClipboard(image)
```

## Hook Returns

### useFolders()
```javascript
{
    loadFolders: async () => void
    createFolder: async (name) => void
    updateFolder: async (id, name) => void
    deleteFolder: async (id) => void
}
```

### useImages()
```javascript
{
    loadImages: async (offset) => void
    loadMoreImages: async () => void
    deleteImage: async (id) => void
    moveImageToFolder: async (imageId, folderId) => void
}
```

### useGeneration()
```javascript
{
    generate: async () => void
}
```

### useModels()
```javascript
{
    loadModels: async (baseUrl) => void
}
```

## Testing Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests (if configured)
npm test

# Check for issues
npm run lint
```

## Debugging Tips

### Check State
```javascript
const { state } = useApp();
console.log('State:', state);
```

### Check API Calls
```javascript
// Add to API methods
console.log('Request:', url, body);
console.log('Response:', data);
```

### Check Re-renders
```javascript
useEffect(() => {
    console.log('Component rendered');
}, [deps]);
```

## Common Tasks

### Add New State Variable
1. Add to `initialState` in `AppContext.js`
2. Add action type to `ActionTypes`
3. Add case to `appReducer`
4. Use in components: `const { state } = useApp()`

### Add New API Endpoint
1. Add method to `api/backend.js` or `api/sd.js`
2. Use in hooks or components
3. Handle errors appropriately

### Add New Component
1. Create file in `components/`
2. Export from `components/index.js`
3. Import in `App.js` or other components
4. Pass props as needed

### Add New Hook
1. Create function in `hooks/index.js`
2. Use `useApp()` for state access
3. Return methods and values
4. Export and use in components

## Performance Tips

- Use `React.memo()` for expensive components
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for callback functions
- Lazy load components with `React.lazy()`
- Implement virtual scrolling for large lists

## Migration Checklist

- [x] Extract API calls to `api/` modules
- [x] Create Context for state management
- [x] Create custom hooks for business logic
- [x] Split UI into focused components
- [x] Update App.js to use new architecture
- [x] Test all features work
- [x] Document changes

## Resources

- **Full Documentation**: `CLIENT_REFACTORING.md`
- **React Context**: https://react.dev/reference/react/useContext
- **Custom Hooks**: https://react.dev/learn/reusing-logic-with-custom-hooks
- **Component Patterns**: https://react.dev/learn/thinking-in-react
