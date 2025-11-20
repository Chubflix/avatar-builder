# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avatar Builder is a React + Express application for generating character images using Stable Diffusion WebUI Forge API. It features folder-based image organization, persistent storage via SQLite, and a Chubflix-styled UI.

**Stack**: React 18 (client), Express + better-sqlite3 (server), Docker Compose for deployment

## Development Commands

### Local Development
```bash
# Install all dependencies (client + server)
npm run install-all      # Run from project root

# Start both services in dev mode
npm run dev              # Backend: localhost:3001, Frontend: localhost:3000

# Client only (from client/)
npm start                # Uses local API
npm run start:dev        # Forces API to localhost:3001
npm run build            # Production build

# Server only (from server/)
npm start                # Production mode
npm run dev              # With nodemon hot reload
```

### Docker Deployment
```bash
# Build and start containers
docker-compose up -d --build

# View logs (all services or specific)
docker-compose logs -f
docker-compose logs -f server

# Stop containers
docker-compose down

# Stop and remove data volume (DESTRUCTIVE)
docker-compose down -v

# Access running server container
docker exec -it avatar-builder-server sh
```

**Note**: Root `package.json` is missing. To enable root commands, create it with:
```json
{
  "scripts": {
    "install-all": "cd client && npm install && cd ../server && npm install",
    "dev": "cd server && npm run dev & cd client && npm run start:dev"
  }
}
```

## Configuration

### Two Config Files
- **Docker**: `config.json` (root) → mounted to client container at `/etc/avatar-builder/config.json`
- **Local Dev**: `client/public/config.json` → served by React dev server

Both files share the same structure. Update the appropriate file based on deployment mode.

### Key Settings
- `api.baseUrl`: Stable Diffusion API endpoint (requires `--api` flag)
- `defaults`: Initial UI values (prompts, orientation, batch size)
- `generation`: SD generation parameters (sampler, steps, CFG scale)
- `adetailer`: Face detail enhancement settings
- `dimensions`: Image sizes per orientation (portrait/landscape/square)

## Architecture

### Client Structure (React)
```
client/src/
├── App.js                    # Main app component & initialization
├── context/
│   └── AppContext.js         # Global state (React Context API)
├── hooks/
│   └── index.js              # Custom hooks (useFolders, useImages, useGeneration, useModels)
├── api/
│   ├── backend.js            # Server API calls (folders, images)
│   └── sd.js                 # Stable Diffusion API calls
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

**Key Patterns**:
- **State Management**: Single AppContext with useReducer (no Redux)
- **Custom Hooks**: Encapsulate API logic (folders, images, generation, models)
- **Refs for Stability**: `currentFolderRef` prevents useEffect loops during folder changes
- **Infinite Scroll**: Loads 50 images at a time via `loadMoreImages(offset)`

### Server Structure (Express)
```
server/
├── server.js                 # Main server file (~500 lines)
├── migrations/               # SQL schema migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_character_folders.sql
│   └── 003_organize_files_by_folder.sql
└── package.json
```

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

**Static Files**:
- `GET /generated/:filename` → Root-level images
- `GET /generated/:folder/:filename` → Folder-specific images

**Health**:
- `GET /api/health` → Simple health check

## Important Implementation Details

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
1. Add route in `server/server.js` (follow REST conventions)
2. Add corresponding function in `client/src/api/backend.js`
3. Create custom hook in `client/src/hooks/index.js` if complex
4. Use hook in component

### Adding a New Database Field
1. Create migration file: `server/migrations/00X_description.sql`
2. Write SQL: `ALTER TABLE generations ADD COLUMN new_field TEXT;`
3. Insert migration record: `INSERT INTO migrations (name) VALUES ('00X_description');`
4. Restart server (migration runs automatically)

### Modifying Image Generation Parameters
1. Update `config.json` (or `client/public/config.json` for local dev)
2. For new parameters: Add to AppContext state and actions
3. Update `client/src/api/sd.js` request payload
4. Optionally: Add UI controls in ControlsPanel or MobileControls

### Adding a New Component
1. Create file in `client/src/components/`
2. Export from `client/src/components/index.js` if following pattern
3. Import in App.js or parent component
4. Pass state/actions via props or useApp() hook

## Troubleshooting

### "CORS Error" when generating images
Ensure SD WebUI is started with: `./webui.sh --api --cors-allow-origins=*`

### Images not loading / 404 errors
- Check `docker-compose logs server` for file path issues
- Verify nginx proxy config in `client/nginx.conf`
- Confirm folder directories exist in `data/generated/`

### Migration errors on startup
- Check `server/migrations/` for syntax errors
- Inspect `data/avatar-builder.db` with sqlite3 CLI
- Verify `migrations` table exists: `SELECT * FROM migrations;`

### State not updating after API call
- Ensure dispatch is called after successful API response
- Check for stale closures (use refs for values in useEffect)
- Verify action type matches AppContext reducer cases

## Development Notes

### No Tests Currently
There are no test files or test commands. If adding tests:
- Client: Use `react-scripts test` (Jest + React Testing Library)
- Server: Add `jest` and create `*.test.js` files

### Linting
Client has ESLint config (`.eslintrc.json`) but no npm script. Add to `client/package.json`:
```json
"scripts": {
  "lint": "eslint src/"
}
```

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
