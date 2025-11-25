# Avatar Builder — Current Features

This document summarizes what the application can already do today, based on the implemented code in the repository. It focuses on actual functionality in the app/ code and backend routes, excluding the design-system and Storybook directories as requested.

## Overview
- End-to-end avatar image generation workflow powered by Stable Diffusion-like APIs on the client side.
- Organize generated images into folders and associate them with characters.
- Browse, filter, select, favorite, move, delete, and download images in bulk.
- Responsive UI with dedicated mobile controls, a lightbox viewer, and persistent user settings.
- Realtime synchronization of characters, folders, and images across sessions via Supabase/Ably.
- Authentication via Supabase (email/password and Google OAuth) with middleware-protected app routes.

## Authentication and Access
- Login page at /login with:
  - Email/password sign up and sign in.
  - Google OAuth login.
  - Automatic redirect to the app on successful session creation.
- Middleware uses Supabase auth to protect main app pages for authenticated users.

## Configuration and Persistence
- Loads runtime configuration from /api/config on first app load.
- Initializes default generation settings from config when no saved settings exist.
- Persists user-selected settings to localStorage and restores them on subsequent visits.
- Lightweight in-app status toasts/messages for user feedback during operations.

## Image Generation
- Controls Panel for generation settings:
  - Positive and negative prompts (with dedicated Prompt modal for focused editing).
  - Orientation toggles: portrait, landscape (square supported in state).
  - Batch size selector (1–10).
  - Seed entry field and advanced settings toggle.
  - Model selection (models loaded from SD API).
  - Optional LoRA controls (enable/weight via LoraSettings component).
  - Optional img2img and inpaint flows (init image, mask image, denoising strength; InpaintModal present).
- Generate button integrates with a queue so multiple generations can be scheduled.
- Progress indicators and generation status during jobs.

## Models
- Fetches and lists available models from the Stable Diffusion API client.
- Allows selecting the active model for generation.

## Queue and Realtime
- Client-side generation queue management with recovery on app load.
- Realtime subscriptions to image, folder, and character changes to keep UI in sync across sessions/devices.
- Hooks provide automatic state updates on create/update/delete events.

## Characters
- Create, edit, and delete characters (server-side via /api/characters routes with Supabase Row Level Security).
- Associate folders (and therefore generated images) with a selected character.
- Character selector and character folder scoping in the UI.

## Folders
- Create, rename, and delete folders.
- Choose the target folder for saving new generations from the Controls Panel or in the Lightbox/Gallery.
- Move single images or bulk selections between folders.
- Display image counts per folder (where supported by the API).

## Images: Browsing and Management
- Infinite-scroll style loading with Load More in both gallery and lightbox contexts.
- Grid gallery with per-image cards showing preview and quick actions.
- Selection mode to select multiple images:
  - Select all, clear selection, and count of selected images.
  - Bulk move to folder, bulk delete (with confirmation), and bulk download as zip.
- Per-image actions:
  - Open in Lightbox.
  - Toggle favorite.
  - Toggle NSFW.
  - Move to a different folder.
  - Delete.

## Lightbox Viewer
- Keyboard and swipe navigation between images.
- Filtering respected in lightbox (NSFW-hide and favorites-only).
- Zoom and pan gestures (mouse and touch) with double-tap support.
- Toggle generation details panel (state persisted in localStorage).
- Inline actions to favorite, mark NSFW, move, delete, and continue loading more.

## Filtering and View Options
- App Settings modal/slideout provides:
  - Enable/disable push notifications (UI toggle; wiring depends on environment).
  - Show/hide image info overlays in the gallery.
  - Hide NSFW images globally.
- Quick toolbar toggles in the gallery for favorites-only and NSFW-hide filters.

## Bulk Operations and Downloads
- Bulk delete selected images via /api/images/bulk-delete.
- Bulk move selected images to another folder via /api/images/bulk-move.
- Bulk download selected images as a zip via /api/images/download-zip.

## API and Storage Integration
- Backend API client (app/utils/backend-api.js) centralizes calls to:
  - Folders: list, create, update, delete.
  - Images: list, get by id, update attributes (favorite/NSFW/metadata), move, delete, bulk actions, and zip download.
- Stable Diffusion API client (app/utils/sd-api*.js) for models, set model, and generate requests.
- Supabase integration for auth and database storage; storage used for generated images where configured.
- Ably/Supabase Realtime for cross-session updates.

## Mobile Experience and PWA
- Mobile-specific Controls and Prompt slideouts for small screens.
- Mobile-friendly App Settings slideout.
- Lightbox touch gestures for navigation and zoom.
- PWA manager component present to handle install prompts and related UX (environment-dependent).

## Keyboard Shortcuts
- Gallery keyboard shortcuts for quick navigation and selection (see hooks/keyboard integration).

## Error Handling and Status
- User-facing status messages for success/error during API and generation actions.
- Guards for unauthenticated scenarios on API routes, returning proper HTTP statuses.

## Limitations and Notes
- Some advanced generation features (LoRA, img2img, inpaint) are conditionally available and depend on the configured Stable Diffusion backend supporting them.
- Push notifications toggle is available in the UI; actual notification delivery depends on environment setup.
- Image serving and storage paths depend on Supabase Storage configuration and deployment environment.

## Where Things Live (selected)
- Main page and composition: app/page.js
- Global state: app/context/AppContext.tsx (+ QueueContext)
- UI components: app/components/* (excluding design-system)
- API clients: app/utils/backend-api.js, app/utils/sd-api.js, app/utils/sd-api-async.js
- API routes: app/api/* (characters, folders, images, bulk ops, config)
- Auth: app/login/page.js, middleware.js, app/lib/supabase*
