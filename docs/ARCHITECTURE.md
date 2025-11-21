# Avatar Builder - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                                                                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │   Folder     │  │   Image     │  │    Image Gallery       │ │
│  │  Navigation  │  │  Generator  │  │  (Grid + Lightbox)     │ │
│  └──────────────┘  └─────────────┘  └────────────────────────┘ │
│                                                                   │
│  Features:                                                        │
│  • Create/rename/delete folders                                  │
│  • Generate images to specific folders                           │
│  • View images by folder or all together                         │
│  • Move images between folders via lightbox                      │
│  • Download/copy images with correct URLs                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         REST API SERVER                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    FOLDER ENDPOINTS                       │  │
│  │  GET    /api/folders           → List all folders        │  │
│  │  POST   /api/folders           → Create folder + dir     │  │
│  │  PUT    /api/folders/:id       → Rename folder + dir     │  │
│  │  DELETE /api/folders/:id       → Delete folder + move    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    IMAGE ENDPOINTS                        │  │
│  │  GET    /api/images?folder_id  → List images w/ URLs     │  │
│  │  POST   /api/images            → Save to folder dir      │  │
│  │  PUT    /api/images/:id        → Move file on disk       │  │
│  │  DELETE /api/images/:id        → Delete from folder      │  │
│  │  POST   /api/images/bulk-move  → Bulk move files         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    HELPER FUNCTIONS                       │  │
│  │  getImagePath(folderId, filename)                         │  │
│  │  ensureFolderDirectory(folderId)                          │  │
│  │  getImageUrl(folderId, filename)                          │  │
│  │  organizeExistingFiles()                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
    ┌───────────────────────┐     ┌──────────────────────┐
    │   SQLite DATABASE     │     │   FILE SYSTEM        │
    │                       │     │                      │
    │  ┌─────────────────┐ │     │  data/generated/     │
    │  │   migrations    │ │     │  ├── folder-1/       │
    │  │   (tracking)    │ │     │  │   ├── img1.png    │
    │  └─────────────────┘ │     │  │   └── img2.png    │
    │                       │     │  ├── folder-2/       │
    │  ┌─────────────────┐ │     │  │   └── img3.png    │
    │  │ character_      │ │◄────┼──├── unfiled.png     │
    │  │ folders         │ │     │  └── ...             │
    │  │ - id            │ │     │                      │
    │  │ - name          │ │     │  (Directories match  │
    │  │ - description   │ │     │   database folders)  │
    │  └─────────────────┘ │     └──────────────────────┘
    │                       │
    │  ┌─────────────────┐ │
    │  │ generations     │ │
    │  │ - id            │ │
    │  │ - filename      │ │
    │  │ - folder_id ────┼─┼─ Links to character_folders
    │  │ - file_migrated │ │     (0 = needs migration)
    │  │ - prompts       │ │     (1 = organized)
    │  │ - metadata      │ │
    │  └─────────────────┘ │
    └───────────────────────┘
```

## Migration Flow

```
SERVER STARTUP
     │
     ▼
┌─────────────────────┐
│ Check migrations    │
│ table for applied   │
│ migrations          │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐      No       ┌──────────────────┐
    │ Migration    │─────────────►│ Skip migration   │
    │ 003 already  │               └──────────────────┘
    │ applied?     │
    └──────┬───────┘
           │ Yes
           ▼
┌─────────────────────┐
│ Run migration 003:  │
│ ALTER TABLE         │
│ generations ADD     │
│ file_migrated       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Call                │
│ organizeExisting    │
│ Files()             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Query for images    │      No       ┌──────────────────┐
│ with folder_id AND  │─────────────►│ Server ready!    │
│ file_migrated = 0   │               └──────────────────┘
└──────────┬──────────┘
           │ Found images
           ▼
     ┌─────────────┐
     │ FOR EACH    │
     │ image:      │
     └──────┬──────┘
            │
            ▼
     ┌──────────────────────┐
     │ Get old path:        │
     │ /generated/uuid.png  │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Get new path:        │
     │ /generated/folder/   │
     │ uuid.png             │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Ensure folder        │
     │ directory exists     │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Move file:           │
     │ fs.renameSync()      │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Update database:     │
     │ file_migrated = 1    │
     └──────────┬───────────┘
                │
                ▼
         Next image...
                │
                ▼
     ┌──────────────────────┐
     │ All files organized  │
     │ Server ready!        │
     └──────────────────────┘
```

## Create Folder Flow

```
USER: Click "Create Folder"
     │
     ▼
USER: Enter "Alice's Character"
     │
     ▼
CLIENT: POST /api/folders
        { name: "Alice's Character" }
     │
     ▼
SERVER: Generate UUID
     │
     ▼
SERVER: Insert into database
        character_folders(id, name)
     │
     ▼
SERVER: Sanitize name
        "Alice's Character" → "alice-s-character"
     │
     ▼
SERVER: Create directory
        fs.mkdirSync('/data/generated/alice-s-character')
     │
     ▼
CLIENT: Folder appears in UI
        Folder appears in dropdown
```

## Generate Image to Folder Flow

```
USER: Select folder "Alice's Character"
      Enter prompt and generate
     │
     ▼
STABLE DIFFUSION: Generate image
     │
     ▼
CLIENT: POST /api/images
        { imageData, folderId: "uuid", ... }
     │
     ▼
SERVER: Generate UUID for image
     │
     ▼
SERVER: Determine target directory
        folderId → "alice-s-character"
     │
     ▼
SERVER: Ensure directory exists
        /data/generated/alice-s-character/
     │
     ▼
SERVER: Save file
        /data/generated/alice-s-character/uuid.png
     │
     ▼
SERVER: Insert to database
        generations(id, filename, folder_id, file_migrated=1)
     │
     ▼
CLIENT: Image appears in gallery
        With correct folder badge
```

## Move Image Flow

```
USER: Click image in gallery
      Open lightbox
     │
     ▼
USER: Select different folder from dropdown
     │
     ▼
CLIENT: PUT /api/images/:id
        { folderId: "new-folder-uuid" }
     │
     ▼
SERVER: Get current image record
        { filename, folder_id: "old-uuid" }
     │
     ▼
SERVER: Calculate old path
        /data/generated/old-folder/uuid.png
     │
     ▼
SERVER: Calculate new path
        /data/generated/new-folder/uuid.png
     │
     ▼
SERVER: Ensure new directory exists
     │
     ▼
SERVER: Move file
        fs.renameSync(oldPath, newPath)
     │
     ▼
SERVER: Update database
        UPDATE generations 
        SET folder_id = "new-uuid", 
            file_migrated = 1
     │
     ▼
CLIENT: Image refreshes with new folder badge
        Gallery updates to show new location
```

## URL Resolution Flow

```
CLIENT: Render image in gallery
     │
     ▼
CLIENT: Check image.url field
     │
     ├─ Has url? → Use image.url
     │              "/generated/folder-name/uuid.png"
     │
     └─ No url?  → Fallback to old format
                   "/generated/uuid.png"
     │
     ▼
BROWSER: Request image
     │
     ▼
EXPRESS: Serve static file
         from /data/generated/...
```

## Key Design Decisions

### 1. File System as Source of Truth
- Database references folders
- File system matches database structure
- Operations update both atomically

### 2. Folder Name Sanitization
- Prevents path traversal attacks
- Ensures cross-platform compatibility
- Lowercase alphanumeric + hyphens only

### 3. Migration Tracking
- `file_migrated` flag prevents duplicate work
- Safe to restart during migration
- Idempotent operations

### 4. Backwards Compatibility
- Old images still work
- URL fallback for compatibility
- Database migrations are additive

### 5. Transaction Safety
- Database transactions for consistency
- Rollback on errors
- No orphaned files

## Performance Characteristics

### Startup
- **Fast**: If all files migrated (~50ms)
- **Slower**: First startup with many files (~1-5s for 100 files)

### Create Folder
- **Fast**: Single DB insert + mkdir (~5-10ms)

### Generate Image
- **Same**: No performance impact (already saving files)

### Move Image
- **Fast**: DB update + file move (~10-20ms)
- **Note**: Same disk = instant, cross-disk = copy time

### Load Gallery
- **Same**: No performance impact (same queries)

## Storage Layout Examples

### Small Project (10 images, 2 folders)
```
generated/
├── main-character/          [4 images, 20MB]
├── side-character/          [3 images, 15MB]
└── [3 unfiled images, 15MB]
Total: 50MB
```

### Medium Project (100 images, 5 folders)
```
generated/
├── alice/                   [25 images, 125MB]
├── bob/                     [30 images, 150MB]
├── charlie/                 [20 images, 100MB]
├── dave/                    [15 images, 75MB]
├── eve/                     [5 images, 25MB]
└── [5 unfiled images, 25MB]
Total: 500MB
```

### Large Project (1000 images, 20 folders)
```
generated/
├── [20 character folders]   [900 images, 4.5GB]
└── [100 unfiled images, 500MB]
Total: 5GB
```
