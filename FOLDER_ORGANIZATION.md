# Avatar Builder - Character Folder Organization

## Overview

The Avatar Builder now supports organizing generated images into character folders, both in the database and on disk. This allows for better organization of images by character, project, or any other categorization you need.

## Features

### Character Folders
- Create unlimited character folders
- Rename existing folders (automatically renames the directory on disk)
- Delete folders (moves images back to unfiled)
- Organize images by dragging them into folders
- View images by folder or see all images together

### File Organization
Images are now stored in organized directories:
- **Unfiled images**: `/data/generated/` (root directory)
- **Folder images**: `/data/generated/{folder-name}/` (sanitized folder name)

### Migration System
The application includes a robust migration system that:
1. Tracks which migrations have been applied
2. Automatically runs new migrations on startup
3. Organizes existing files into folders when needed

## Database Schema

### Tables

#### `migrations`
Tracks which migrations have been applied.
```sql
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### `character_folders`
Stores folder information.
```sql
CREATE TABLE character_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### `generations`
Stores image metadata with folder association and migration tracking.
```sql
CREATE TABLE generations (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    positive_prompt TEXT,
    negative_prompt TEXT,
    model TEXT,
    orientation TEXT,
    width INTEGER,
    height INTEGER,
    batch_size INTEGER,
    sampler_name TEXT,
    scheduler TEXT,
    steps INTEGER,
    cfg_scale REAL,
    seed INTEGER,
    adetailer_enabled INTEGER,
    adetailer_model TEXT,
    info_json TEXT,
    folder_id TEXT REFERENCES character_folders(id) ON DELETE SET NULL,
    file_migrated INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Migrations

### 001_initial_schema.sql
Creates the initial `generations` table.

### 002_add_character_folders.sql
- Creates `character_folders` table
- Adds `folder_id` column to `generations`
- Creates index on `folder_id`

### 003_organize_files_by_folder.sql
- Adds `file_migrated` flag to track file organization status
- Application automatically moves files into folders on startup

## API Endpoints

### Folders

#### `GET /api/folders`
Get all folders with image counts.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Character Name",
    "description": "Optional description",
    "image_count": 42,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/folders`
Create a new folder.

**Request:**
```json
{
  "name": "Character Name",
  "description": "Optional description"
}
```

#### `PUT /api/folders/:id`
Update folder name/description (automatically renames directory).

**Request:**
```json
{
  "name": "New Character Name",
  "description": "Updated description"
}
```

#### `DELETE /api/folders/:id`
Delete folder (moves images to unfiled).

### Images

#### `GET /api/images?folder_id={id}&limit=50&offset=0`
Get images with optional folder filter.

**Query Parameters:**
- `folder_id`: Filter by folder (use 'unfiled' for images without a folder)
- `limit`: Number of images to return (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "filename": "uuid.png",
      "url": "/generated/character-name/uuid.png",
      "folder_id": "folder-uuid",
      "folder_name": "Character Name",
      "positive_prompt": "...",
      "seed": 12345,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

#### `POST /api/images`
Save a new image (with optional folder assignment).

**Request:**
```json
{
  "imageData": "data:image/png;base64,...",
  "positivePrompt": "...",
  "folderId": "folder-uuid"
}
```

#### `PUT /api/images/:id`
Move image to a different folder (automatically moves file on disk).

**Request:**
```json
{
  "folderId": "folder-uuid"
}
```

#### `POST /api/images/bulk-move`
Move multiple images to a folder.

**Request:**
```json
{
  "imageIds": ["id1", "id2", "id3"],
  "folderId": "folder-uuid"
}
```

## File Organization

### Directory Structure
```
data/
├── avatar-builder.db
└── generated/
    ├── {sanitized-folder-name}/
    │   ├── image1.png
    │   └── image2.png
    ├── {another-folder}/
    │   └── image3.png
    └── unfiled-image.png
```

### Folder Name Sanitization
Folder names are sanitized for filesystem compatibility:
- Converted to lowercase
- Only alphanumeric characters and hyphens
- Example: "Alice's Character" → "alice-s-character"

### Automatic File Organization
When you:
1. **Create a folder**: Directory is created automatically
2. **Save to folder**: Image is saved directly to folder directory
3. **Move image**: File is physically moved on disk
4. **Rename folder**: Directory is renamed on disk
5. **Delete folder**: Images are moved back to root directory

## Usage

### Creating a Folder
1. Click the "+" button next to "Save to Folder"
2. Enter folder name
3. Click "Create"

### Saving Images to a Folder
1. Select a folder from the "Save to Folder" dropdown
2. Generate images
3. Images are automatically saved to that folder

### Moving Images
**From the Gallery:**
- Click an image to open lightbox
- Use the folder dropdown to move the image

**Bulk Move (future feature):**
- Select multiple images
- Choose "Move to folder"

### Viewing Folder Contents
Use the folder tabs at the top of the gallery:
- **All Images**: Shows all images regardless of folder
- **Unfiled**: Shows only images without a folder
- **[Folder Name]**: Shows only images in that folder

### Renaming a Folder
1. Click the pencil icon on a folder tab
2. Enter new name
3. Click "Update"

### Deleting a Folder
1. Click the pencil icon on a folder tab
2. Click "Delete"
3. Confirm
4. Images are moved to "Unfiled"

## Migration Notes

### Upgrading from Previous Version
When you start the application after upgrading:

1. **Migrations run automatically**
2. **Existing files are organized** into folders based on their database folder_id
3. **No data is lost** - files are moved, not copied or deleted

### Migration Process
```
1. Server starts
2. Checks migrations table
3. Runs any new migrations
4. Organizes existing files into folders
5. Marks files as migrated
6. Server is ready
```

## Best Practices

### Folder Naming
- Use character names for easy identification
- Be consistent with naming conventions
- Keep names relatively short

### Organization Strategy
- Create folders before generating images
- Use descriptive folder names
- Periodically review and organize unfiled images

### Backup
The database and all images are in `/data`:
- Database: `/data/avatar-builder.db`
- Images: `/data/generated/`

Regular backups of the `/data` directory are recommended.

## Troubleshooting

### Images not showing after folder rename
- Clear browser cache
- Refresh the page
- Check server logs for errors

### Migration failed
- Check server logs
- Ensure database is not locked
- Verify file permissions on `/data` directory

### File permissions
Ensure the server has write access to:
- `/data/avatar-builder.db`
- `/data/generated/` and all subdirectories

## Technical Details

### URL Generation
Images now use dynamic URLs based on folder:
- Unfiled: `/generated/filename.png`
- In folder: `/generated/folder-name/filename.png`

### Database Transactions
File operations use database transactions to ensure:
- Atomic moves (database + filesystem)
- Consistency between database and disk
- No orphaned files

### Error Handling
The system gracefully handles:
- Missing files
- Duplicate folder names
- Invalid folder names
- File permission errors

## Future Enhancements

Potential features for future versions:
- Bulk select and move images
- Folder descriptions
- Folder sorting/ordering
- Folder export/import
- Image tags and filtering
- Search within folders
