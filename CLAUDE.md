# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avatar Builder is a Next.js 14 application for generating character images using Stable Diffusion WebUI Forge API. It features folder-based image organization, persistent storage via SQLite, and a Chubflix-styled UI.

**Stack**: Next.js 14 (App Router), React 18, better-sqlite3, Docker Compose for deployment

**Important**: The application was recently migrated from a separate React/Express architecture to a unified Next.js application. The legacy `client/` and `server/` directories still exist but are not used in production. See `NEXTJS_MIGRATION.md` for migration details.

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Start development server (with hot-reload)
npm run dev              # Application: localhost:3000

# Production build
npm run build            # Creates optimized build
npm start                # Runs production build

# Linting
npm run lint             # Run ESLint
```

### Docker Deployment
```bash
# Production deployment
docker-compose up -d --build

# Development with hot-reload
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f
docker-compose logs -f avatar-builder

# Stop containers
docker-compose down

# Stop and remove data volume (DESTRUCTIVE)
docker-compose down -v

# Access running container
docker exec -it avatar-builder sh
```

See `DOCKER_DEPLOYMENT.md` for comprehensive Docker documentation.

## Configuration

The application uses a single `config.json` file in the project root, served via the `/api/config` endpoint.

### Key Settings
- `api.baseUrl`: Stable Diffusion API endpoint (requires `--api` flag)
  - **Important**: SD API calls are made from the browser (client-side), so this URL must be accessible from the user's browser
  - When running in Docker: use `http://host.docker.internal:7860` if SD is on host machine
- `defaults`: Initial UI values (prompts, orientation, batch size)
- `generation`: SD generation parameters (sampler, steps, CFG scale)
- `adetailer`: Face detail enhancement settings
- `dimensions`: Image sizes per orientation (portrait/landscape/square)

### Environment Variables
- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 3000)
- `DATA_DIR`: Data directory path (default: `./data`)
- `GENERATED_DIR`: Generated images directory (default: `./data/generated`)
- `DB_PATH`: SQLite database path (default: `./data/avatar-builder.db`)

## Architecture

### Next.js App Directory Structure
```
app/
├── layout.js                 # Root layout
├── page.js                   # Main page (client component with 'use client')
├── api/                      # API Route Handlers
│   ├── config/route.js       # GET /api/config
│   ├── folders/
│   │   ├── route.js          # GET/POST /api/folders
│   │   └── [id]/route.js     # PUT/DELETE /api/folders/:id
│   └── images/
│       ├── route.js          # GET/POST /api/images
│       ├── [id]/route.js     # PUT/DELETE /api/images/:id
│       ├── bulk-move/route.js       # POST /api/images/bulk-move
│       ├── bulk-delete/route.js     # POST /api/images/bulk-delete
│       ├── download-zip/route.js    # POST /api/images/download-zip
│       └── serve/[...path]/route.js # GET /generated/*
├── lib/
│   └── db.js                 # Server-side database operations
├── context/
│   └── AppContext.js         # Global state (React Context API)
├── hooks/
│   └── index.js              # Custom hooks (useFolders, useImages, useGeneration, useModels)
├── utils/
│   ├── backend-api.js        # Client-side API calls to Next.js routes
│   ├── sd-api.js             # Client-side Stable Diffusion API calls
│   └── debug.js              # Debug logger utility
├── components/
│   ├── ControlsPanel.js      # Desktop generation controls
│   ├── MobileControls.js     # Mobile-optimized controls
│   ├── FolderNav.js          # Folder navigation sidebar
│   ├── FolderSelector.js     # Folder dropdown selector
│   ├── FolderModal.js        # Create/edit folder dialog
│   ├── ImageGallery.js       # Grid view with infinite scroll
│   └── Lightbox.js           # Fullscreen image view & actions
└── *.css                     # Component-specific styles
```

### Database & Migrations
```
server/migrations/            # SQL schema migrations (still used)
├── 001_initial_schema.sql
├── 002_add_character_folders.sql
└── 003_organize_files_by_folder.sql

data/                         # Persistent data directory
├── avatar-builder.db         # SQLite database
└── generated/                # Generated images (organized by folder)
    └── <folder-name>/        # Folder-specific images
```

**Key Patterns**:
- **Next.js App Router**: File-based routing with Server/Client Components
- **Client Components**: Use `'use client'` directive for browser-only code (page.js, all components)
- **API Routes**: Next.js Route Handlers replace Express endpoints
- **State Management**: Single AppContext with useReducer (no Redux)
- **Custom Hooks**: Encapsulate API logic (folders, images, generation, models)
- **Refs for Stability**: `currentFolderRef` prevents useEffect loops during folder changes
- **Infinite Scroll**: Loads 50 images at a time via `loadMoreImages(offset)`
- **SSR Considerations**: All `localStorage` and `window` access guarded by `typeof window !== 'undefined'`

**Database Schema**:
- `character_folders`: Stores folder metadata (id, name, description)
- `generations`: Stores image metadata (id, filename, folder_id, prompts, settings, file_migrated)
- `migrations`: Tracks applied migrations

**Key Server Concepts**:
1. **Folder-Based File Organization**: Images stored in `data/generated/<sanitized-folder-name>/`
2. **Migration System**: Runs SQL migrations on startup, tracks in `migrations` table
3. **File Migration**: `file_migrated` flag prevents re-organizing existing images on restart
4. **Helper Functions**:
   - `getImagePath(folderId, filename)`: Returns absolute file path
   - `ensureFolderDirectory(folderId)`: Creates folder directory if missing
   - `getImageUrl(folderId, filename)`: Returns URL path for client
   - `organizeExistingFiles()`: Moves unfiled images to their folder directories

### API Endpoints

**Folders**:
- `GET /api/folders` → List all folders
- `POST /api/folders { name, description }` → Create folder + directory
- `PUT /api/folders/:id { name, description }` → Rename folder + directory
- `DELETE /api/folders/:id` → Delete folder (moves images to root)

**Images**:
- `GET /api/images?limit=50&offset=0&folder_id=<uuid>` → Paginated images with URLs
- `POST /api/images` → Save image (base64 + metadata, writes to folder directory)
- `PUT /api/images/:id { folderId }` → Move image to different folder (updates DB + moves file)
- `DELETE /api/images/:id` → Delete image (DB + file)
- `POST /api/images/bulk-move { imageIds[], folderId }` → Move multiple images
- `POST /api/images/bulk-delete { imageIds[] }` → Delete multiple images
- `POST /api/images/download-zip { imageIds[] }` → Create and download ZIP of selected images

**Static Files**:
- `GET /generated/[...path]` → Serves generated images via API route with security checks

**Config**:
- `GET /api/config` → Returns config.json contents

## Important Implementation Details

### Next.js SSR Considerations

**Critical**: The application uses Next.js which performs Server-Side Rendering (SSR). Browser APIs like `localStorage` and `window` don't exist during SSR and will cause runtime errors if accessed.

**Always guard browser API access:**
```javascript
// ✅ CORRECT: Check for browser environment first
if (typeof window !== 'undefined') {
    const value = localStorage.getItem('key');
    window.someMethod();
}

// ✅ CORRECT: In useState initializer
const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return localStorage.getItem('key') || defaultValue;
});

// ✅ CORRECT: In useEffect (runs client-side only)
useEffect(() => {
    // Safe to use localStorage and window here
    localStorage.setItem('key', value);
}, [value]);

// ❌ WRONG: Direct access during module initialization or render
const value = localStorage.getItem('key'); // ReferenceError during SSR
window.myFunction(); // ReferenceError during SSR
```

**Files that handle browser APIs:**
- `app/utils/debug.js` - Debug logger with localStorage
- `app/context/AppContext.js` - Settings persistence with localStorage
- `app/components/Lightbox.js` - Lightbox settings with localStorage

**Client-side API calls:**
- `app/utils/sd-api.js` - Stable Diffusion API calls (must run in browser)
- All components use `'use client'` directive to ensure client-side execution

### Folder Name Sanitization
Folder names are sanitized for filesystem compatibility:
```javascript
// Example: "Alice's Character" → "alice-s-character"
const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
```
This prevents path traversal attacks and ensures cross-platform compatibility.

### Image Migration System
On first startup after adding folder features:
1. Check for images with `folder_id` but `file_migrated = 0`
2. Move each image from `/generated/uuid.png` to `/generated/<folder>/uuid.png`
3. Mark as `file_migrated = 1`
4. Idempotent: safe to restart during migration

### URL Resolution
Client-side image URL handling:
```javascript
// Prefers image.url if set, falls back to old format
const imageUrl = image.url || `/generated/${image.filename}`;
```
This maintains backwards compatibility with pre-folder images.

### State Management Pattern
```javascript
// Access state and actions via useApp() hook
const { state, dispatch, actions } = useApp();

// Update state
dispatch({ type: actions.SET_CURRENT_FOLDER, payload: folderId });

// State includes: config, folders, images, currentFolder, selectedModel, prompts, etc.
```

### Settings Persistence
Settings are saved to localStorage via `saveSettings()` in AppContext. Restored on mount.

## Common Tasks

### Adding a New API Endpoint
1. Create route file in `app/api/your-route/route.js`
2. Export async functions: `GET`, `POST`, `PUT`, `DELETE` as needed
3. Use `NextResponse.json()` for responses
4. Add corresponding function in `app/utils/backend-api.js`
5. Create custom hook in `app/hooks/index.js` if complex
6. Use hook in component

Example route file:
```javascript
import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';

export async function GET(request) {
    const db = getDb();
    const data = db.prepare('SELECT * FROM table').all();
    return NextResponse.json(data);
}
```

### Adding a New Database Field
1. Create migration file: `server/migrations/00X_description.sql`
2. Write SQL: `ALTER TABLE generations ADD COLUMN new_field TEXT;`
3. Insert migration record: `INSERT INTO migrations (name) VALUES ('00X_description');`
4. Restart application (migration runs automatically on `getDb()` call)

### Modifying Image Generation Parameters
1. Update `config.json` in project root
2. For new parameters: Add to AppContext state and actions
3. Update `app/utils/sd-api.js` request payload
4. Optionally: Add UI controls in ControlsPanel or MobileControls

### Adding a New Component
1. Create file in `app/components/YourComponent.js`
2. If component uses browser APIs or event handlers, keep it as client component (implicit when imported by `app/page.js`)
3. Import in `app/page.js` or parent component
4. Pass state/actions via props or `useApp()` hook

### Adding Browser API Access
**Always guard with `typeof window !== 'undefined'`:**
```javascript
// In useState initializer
const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return localStorage.getItem('key') || defaultValue;
});

// In useEffect (safest approach)
useEffect(() => {
    const saved = localStorage.getItem('key');
    if (saved) setValue(saved);
}, []);
```

## Troubleshooting

### "ReferenceError: localStorage is not defined" or "window is not defined"
This error occurs when browser APIs are accessed during server-side rendering.

**Fix**: Add `typeof window !== 'undefined'` guards:
```javascript
// Before
const value = localStorage.getItem('key'); // ❌ Breaks SSR

// After
const value = typeof window !== 'undefined'
    ? localStorage.getItem('key')
    : null; // ✅ SSR-safe
```

See the "Next.js SSR Considerations" section above for detailed patterns.

### "CORS Error" when generating images
Ensure SD WebUI is started with: `./webui.sh --api --cors-allow-origins=*`

### Images not loading / 404 errors
- Check `docker-compose logs avatar-builder` for file path issues
- Verify `/api/images/serve/[...path]` route is working
- Confirm folder directories exist in `data/generated/`
- Check browser console for image URL errors

### Migration errors on startup
- Check `server/migrations/` for syntax errors
- Inspect `data/avatar-builder.db` with sqlite3 CLI
- Verify `migrations` table exists: `SELECT * FROM migrations;`
- Check Next.js console output for database initialization errors

### State not updating after API call
- Ensure dispatch is called after successful API response
- Check for stale closures (use refs for values in useEffect)
- Verify action type matches AppContext reducer cases

### npm install fails with better-sqlite3 errors
- Ensure you have build tools installed: `python3`, `make`, `g++` (or Xcode on macOS)
- Node.js version: Should be compatible with better-sqlite3 v11.8.1
- Try: `npm install --build-from-source`

## Development Notes

### No Tests Currently
There are no test files or test commands. If adding tests:
- Use Jest + React Testing Library for component tests
- Use `@testing-library/react` for client component testing
- For API routes: Test with Next.js test utilities
- Add test scripts to `package.json`:
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
  ```

### Linting
Next.js includes ESLint configuration:
- Run: `npm run lint`
- Config: `.eslintrc.json` (Next.js defaults + React rules)
- Extends: `next/core-web-vitals`

### Mobile Considerations
- MobileControls component used below 768px breakpoint
- Advanced settings collapse into expandable panel
- Lightbox uses swipe gestures on touch devices

### Chubflix Theme
The app follows Chubflix design language (dark theme, specific typography, Netflix-like folder navigation). Maintain consistency when adding UI elements.

## Security Notes

- Folder name sanitization prevents path traversal
- Base64 images are written directly to disk (no XSS risk)
- No authentication/authorization (single-user assumed)
- CORS enabled for SD API access
