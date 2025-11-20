# Quick Start: Character Folder Organization

## What Changed?

Images are now organized into character folders on disk, not just in the database. When you create a folder and save images to it, they're physically stored in that folder's directory.

## Folder Structure

```
data/generated/
├── alice-wonderland/        ← Folder for "Alice Wonderland" character
│   ├── uuid-1.png
│   ├── uuid-2.png
│   └── uuid-3.png
├── bob-builder/             ← Folder for "Bob Builder" character
│   └── uuid-4.png
└── uuid-5.png               ← Unfiled images (no folder)
```

## How to Use

### 1. Create a Character Folder
Click the **+** button next to "Save to Folder" → Enter name → Create

### 2. Generate Images to Folder
Select folder in "Save to Folder" dropdown → Generate images → They're saved to that folder

### 3. Move Images Between Folders
Click image → In lightbox, use folder dropdown → Select new folder → Image moves on disk

### 4. View by Folder
Use tabs at top: **All Images** | **Unfiled** | **[Your Folders]**

### 5. Rename Folder
Click pencil icon on folder tab → Edit name → Update → Directory is renamed

### 6. Delete Folder
Click pencil icon → Delete → Confirm → Images move to unfiled

## First-Time Setup

When you start the server after this update:

1. **Migration runs automatically** - adds tracking column
2. **Existing images are organized** - moved to their folder directories
3. **Takes a few seconds** depending on number of images
4. **Watch server logs** for confirmation
5. **Ready to use!**

## Tips

- **Folder names** are sanitized: "Alice's Folder" becomes "alice-s-folder"
- **Create folders first** before generating images
- **Use descriptive names** like character names
- **Organize regularly** - move unfiled images to folders
- **Backup `/data`** directory regularly

## Troubleshooting

**Images not loading after update?**
- Refresh browser (clear cache if needed)
- Check server logs for migration status
- Verify folder directories exist in `/data/generated/`

**Can't create folder?**
- Name might already exist
- Check server has write permissions
- Try a different name

**Migration seems stuck?**
- Check server logs for errors
- Verify database isn't locked
- Ensure disk space available

## Benefits

✅ **Better organization** - Files grouped by character  
✅ **Easy to find** - Browse folders in file manager  
✅ **Easy to backup** - Backup specific character folders  
✅ **Easy to share** - Copy folder to share all images  
✅ **Clean structure** - Database matches disk layout  

## Need More Help?

- **Full documentation**: See `FOLDER_ORGANIZATION.md`
- **Implementation details**: See `IMPLEMENTATION_SUMMARY.md`
- **All changes**: See `CHANGES_SUMMARY.md`

---

**That's it!** Your images are now automatically organized. Everything else works exactly as before.
