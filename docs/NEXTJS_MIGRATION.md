d# Next.js Migration Guide

## Overview

The Avatar Builder has been converted from a separate client/server architecture to a unified **Next.js 14 application** using the App Router.

## Key Changes

### Architecture
- **Before**: Separate React (CRA) client + Express server
- **After**: Single Next.js application with API routes

### File Structure
```
avatar-builder/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes (replaces Express server)
│   │   ├── config/          # Config endpoint
│   │   ├── folders/         # Folder CRUD operations
│   │   └── images/          # Image operations & file serving
│   ├── components/          # React components (from client/src/components)
│   ├── context/             # React Context (from client/src/context)
│   ├── hooks/               # Custom hooks (from client/src/hooks)
│   ├── lib/                 # Server-side utilities
│   │   └── db.js           # Database connection & helpers
│   ├── utils/               # Client-side utilities
│   │   ├── backend-api.js  # API client for Next.js routes
│   │   ├── sd-api.js       # Stable Diffusion API (CLIENT-SIDE)
│   │   └── debug.js        # Debug utilities
│   ├── globals.css          # Global styles
│   ├── layout.js            # Root layout
│   └── page.js              # Main page ('use client')
├── server/migrations/       # Database migrations (still used)
├── data/                    # Data directory (generated images, DB)
├── config.json              # Configuration file
├── package.json             # Dependencies
└── next.config.js           # Next.js configuration
```

### Important: Stable Diffusion API Calls

**CRITICAL**: All Stable Diffusion API calls are made **client-side** (in the browser) via `app/utils/sd-api.js`. This is required because:

1. The SD API must be accessible from the client's network
2. Direct browser → SD API calls avoid CORS issues
3. Server-side calls would fail if SD API is on localhost

The SD API client (`sd-api.js`) runs entirely in the browser and makes fetch requests directly to your Stable Diffusion WebUI.

### API Routes

All Express endpoints have been converted to Next.js API routes:

| Old Express Route | New Next.js Route |
|------------------|-------------------|
| `GET /api/config` | `app/api/config/route.js` |
| `GET /api/folders` | `app/api/folders/route.js` |
| `POST /api/folders` | `app/api/folders/route.js` |
| `PUT /api/folders/:id` | `app/api/folders/[id]/route.js` |
| `DELETE /api/folders/:id` | `app/api/folders/[id]/route.js` |
| `GET /api/images` | `app/api/images/route.js` |
| `POST /api/images` | `app/api/images/route.js` |
| `PUT /api/images/:id` | `app/api/images/[id]/route.js` |
| `DELETE /api/images/:id` | `app/api/images/[id]/route.js` |
| `POST /api/images/bulk-move` | `app/api/images/bulk-move/route.js` |
| `POST /api/images/bulk-delete` | `app/api/images/bulk-delete/route.js` |
| `POST /api/images/download-zip` | `app/api/images/download-zip/route.js` |
| `GET /generated/*` | `app/api/images/serve/[...path]/route.js` |

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `next` - Next.js framework
- `react` & `react-dom` - React 18
- `better-sqlite3` - SQLite database
- `uuid` - UUID generation
- `archiver` - ZIP file creation

### 2. Configuration

Copy the environment example:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` if you need custom paths (optional):
```env
DATA_DIR=./data
GENERATED_DIR=./data/generated
DB_PATH=./data/avatar-builder.db
```

Ensure `config.json` exists in the root with your SD API settings:
```json
{
  "api": {
    "baseUrl": "http://localhost:7860"
  },
  "defaults": {
    "positivePrompt": "masterpiece, best quality, 1girl",
    "negativePrompt": "lowres, bad anatomy",
    "orientation": "portrait",
    "batchSize": 1
  },
  ...
}
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### 4. Build for Production

```bash
npm run build
npm start
```

Production server runs on **http://localhost:3000** (or PORT environment variable)

## Migration from Old Setup

If you have existing data from the old client/server setup:

1. **Database**: Copy `server/data/avatar-builder.db` → `data/avatar-builder.db`
2. **Images**: Copy `server/data/generated/*` → `data/generated/*`
3. **Config**: Use existing `config.json` in root directory

The database structure remains unchanged, so existing data works without modification.

## Development Workflow

### Adding New Features

1. **Client-side components**: Add to `app/components/`
2. **API endpoints**: Add to `app/api/[feature]/route.js`
3. **Database queries**: Use `getDb()` from `app/lib/db.js`
4. **Client API calls**: Add to `app/utils/backend-api.js`

### Example: Adding a New API Route

```javascript
// app/api/example/route.js
import { NextResponse } from 'next/server';
import { getDb } from '../../lib/db';

export async function GET(request) {
    const db = getDb();
    const data = db.prepare('SELECT * FROM table').all();
    return NextResponse.json(data);
}

export async function POST(request) {
    const body = await request.json();
    const db = getDb();
    // ... handle POST
    return NextResponse.json({ success: true });
}
```

## Troubleshooting

### "Module not found: Can't resolve 'better-sqlite3'"

Run: `npm install better-sqlite3`

### "Cannot find module './migrations'"

Ensure `server/migrations/` directory exists with `.sql` files.

### Images not loading

1. Check `data/generated/` directory exists and has images
2. Verify file permissions
3. Check browser console for 404 errors
4. Ensure image URLs match format: `/generated/[folder-id]/[filename].png`

### Stable Diffusion API not working

1. Ensure SD WebUI is running with `--api` flag
2. Check `config.json` has correct `api.baseUrl`
3. Verify SD API is accessible from browser (not just localhost if using Docker)
4. Check browser console for CORS errors

## Key Differences from Old Setup

1. **Single Port**: Everything runs on port 3000 (no separate 3001 for API)
2. **No CORS**: API routes and frontend on same origin
3. **File Serving**: Images served via Next.js API route instead of static middleware
4. **Build Process**: Single `npm run build` instead of separate client/server builds
5. **Deployment**: Deploy as single Next.js app (Vercel, Docker, etc.)

## Docker Deployment

Update `Dockerfile` to use Next.js:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Update `docker-compose.yml`:

```yaml
version: '3.8'
services:
  avatar-builder:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
```

## Benefits of Next.js Migration

1. **Simplified Architecture**: Single codebase, single server
2. **Better Performance**: Built-in optimizations, image optimization
3. **Easier Deployment**: Deploy as one app to Vercel, Railway, etc.
4. **Modern Stack**: Latest React 18 with Server Components
5. **Better DX**: Hot reload for both frontend and API routes
6. **Type Safety**: Easy to add TypeScript later
7. **SEO Ready**: Server-side rendering available if needed

## Rollback to Old Setup

If you need to revert:

1. The old `client/` and `server/` directories still exist
2. Run client: `cd client && npm start`
3. Run server: `cd server && npm run dev`
4. Access on `localhost:3000` (client) with API at `localhost:3001`

## Next Steps

- ✅ All functionality migrated
- ✅ Stable Diffusion API calls remain client-side
- ✅ Database migrations work
- ✅ Image serving works
- ✅ Multiselect and bulk operations work
- ✅ Queue system works

You can now:
1. Test the Next.js version: `npm run dev`
2. Verify all features work
3. Delete `client/` and `server/` directories if satisfied
4. Update documentation to reflect Next.js setup
