# Schema Updates - Settings & Image Enhancements

This document describes the new database schema additions for user settings, global settings, and enhanced image tracking.

## Overview

Three new migrations have been added:
1. **20251125191200_add_image_generation_fields.sql** - Adds tracking for generation types and parent-child relationships
2. **20251125191300_create_user_settings.sql** - User-specific settings and defaults
3. **20251125191400_create_global_settings.sql** - System-wide configuration

## Images Table Updates

### New Columns

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `generation_type` | `text` | Generation method: `txt2img`, `img2img`, or `inpaint` | `'txt2img'` |
| `parent_image_id` | `uuid` | Reference to source image for img2img/inpaint | `null` |
| `mask_data` | `text` | Base64-encoded mask data for inpaint operations | `null` |
| `tags` | `jsonb` | Array of user-defined tags | `[]` |

### New Indexes

- `idx_images_generation_type` - B-tree index for filtering by generation type
- `idx_images_parent_image_id` - B-tree index for finding child images
- `idx_images_tags` - GIN index for fast tag searches using JSONB operators

### Usage Examples

#### Creating an img2img generation
```javascript
await saveGeneratedImage({
    supabase,
    userId: user.id,
    imageBase64: resultImage,
    meta: {
        generationType: 'img2img',
        parentImageId: sourceImage.id,
        positivePrompt: 'enhanced version',
        // ... other fields
    }
});
```

#### Creating an inpaint generation
```javascript
await saveGeneratedImage({
    supabase,
    userId: user.id,
    imageBase64: resultImage,
    meta: {
        generationType: 'inpaint',
        parentImageId: sourceImage.id,
        maskData: 'base64_encoded_mask_data',
        positivePrompt: 'fix the face',
        // ... other fields
    }
});
```

#### Adding tags
```javascript
await saveGeneratedImage({
    supabase,
    userId: user.id,
    imageBase64: resultImage,
    meta: {
        tags: ['portrait', 'realistic', 'outdoors'],
        // ... other fields
    }
});
```

#### Querying by tags (PostgreSQL JSONB operators)
```javascript
// Images containing 'portrait' tag
const { data } = await supabase
    .from('images')
    .select('*')
    .contains('tags', ['portrait']);

// Images with any of multiple tags
const { data } = await supabase
    .from('images')
    .select('*')
    .overlaps('tags', ['portrait', 'landscape']);
```

---

## User Settings Table

Stores per-user application settings and generation defaults with JSONB for flexibility.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key to auth.users (unique) |
| `default_positive_prompt` | `text` | User's default positive prompt |
| `default_negative_prompt` | `text` | User's default negative prompt |
| `default_dimension` | `text` | Default dimension preset (e.g., 'portrait', 'hd_landscape') |
| `default_batch_size` | `integer` | Default batch size (1-10) |
| `generation_settings` | `jsonb` | Flexible generation parameters |
| `adetailer_settings` | `jsonb` | ADetailer configuration |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp (auto-updated) |

**Note:** UI preferences (showImageInfo, hideNsfw, notificationsEnabled, etc.) are kept in `localStorage` only, allowing different settings per device.

### RLS Policies

- Users can only access their own settings
- Enforced via `user_id = auth.uid()`

### JSONB Field Structures

#### generation_settings
```json
{
  "samplerName": "Euler a",
  "scheduler": "Automatic",
  "steps": 20,
  "cfgScale": 7,
  "seed": -1
}
```

#### adetailer_settings
```json
{
  "enabled": true,
  "model": "face_yolov8n.pt",
  "confidence": 0.3,
  "dilateErode": 4
}
```


### API Endpoints

#### GET /api/settings/user
Returns user settings, creates default if not exists.

```javascript
const response = await fetch('/api/settings/user');
const settings = await response.json();
```

#### PUT /api/settings/user
Replaces all user settings (upsert).

```javascript
await fetch('/api/settings/user', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        default_positive_prompt: 'masterpiece, best quality',
        generation_settings: { steps: 30, cfgScale: 8 }
    })
});
```

#### PATCH /api/settings/user
Merges partial updates (deep merge for JSONB fields).

```javascript
// Only updates specified fields, merges JSONB objects
await fetch('/api/settings/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        generation_settings: { steps: 30 } // Merges with existing settings
    })
});
```

---

## Global Settings Table

Stores system-wide configuration accessible to all authenticated users.

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `key` | `text` | Unique setting identifier |
| `value` | `jsonb` | Setting data |
| `description` | `text` | Human-readable description |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

### RLS Policies

- All authenticated users can read global settings
- Only admin users can create/update/delete global settings
- Uses the `is_admin()` function to check user role

**Note:** See `ADMIN_SETUP.md` for instructions on promoting users to admin.

### Default Settings

#### loras
```json
[
  {
    "name": "Age",
    "prompt": "<lora:StS_Age_Slider_Illustrious_v1_Scaled:${value}>",
    "type": "slider",
    "minDesc": "Young",
    "min": -2,
    "max": 2,
    "maxDesc": "Old",
    "step": 0.1,
    "defaultValue": 0,
    "url": "https://civitai.com/models/1025710?modelVersionId=1355142"
  },
  {
    "name": "Disney 5.0",
    "prompt": "<lora:Disney_Il5.0:1>",
    "type": "style",
    "url": "https://civitai.com/models/681120?modelVersionId=1923736"
  },
  {
    "name": "White Outline",
    "prompt": "<lora:outline-test11:-1>, White Outline",
    "type": "toggle",
    "url": "https://civitai.com/models/1864054/illustriouswhite-outline-tweaker-lora"
  },
  {
    "name": "Body Type",
    "prompt": "<lora:Body_Type_Illustrious_v1_Scaled:${value}>",
    "type": "slider",
    "minDesc": "Fat",
    "min": -2,
    "max": 2,
    "maxDesc": "Skinny",
    "step": 0.1,
    "defaultValue": 0,
    "url": "https://civitai.com/models/468146/body-type-slider-pony-illustrious"
  }
]
```

**LoRA Types:**
- `slider`: Variable weight with min/max descriptors
- `style`: Fixed prompt template (usually weight 1)
- `toggle`: On/off LoRA with specific prompt

#### dimensions
```json
{
  "portrait": { "width": 832, "height": 1216 },
  "landscape": { "width": 1216, "height": 832 },
  "square": { "width": 1024, "height": 1024 }
}
```

### API Endpoints

#### GET /api/settings/global
Returns all global settings.

```javascript
const response = await fetch('/api/settings/global');
const settings = await response.json(); // Array of all settings
```

#### GET /api/settings/global?key=loras
Returns specific setting by key.

```javascript
const response = await fetch('/api/settings/global?key=loras');
const loraSettings = await response.json(); // Single setting object
```

#### PUT /api/settings/global
Updates global setting (admin only).

```javascript
// Update loras configuration (requires admin role)
await fetch('/api/settings/global', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        key: 'loras',
        value: [
            {
                name: "New LoRA",
                prompt: "<lora:new_lora:1>",
                type: "style",
                url: "https://civitai.com/..."
            },
            // ... other loras
        ],
        description: 'Available LoRA models'
    })
});

// Returns 403 Forbidden if user is not an admin
```

---

## Migration Instructions

### Running Migrations

Migrations run automatically when Supabase detects new files in `supabase/migrations/`.

**Local Development:**
```bash
# Push migrations to local Supabase
supabase db push

# Or reset database with all migrations
supabase db reset
```

**Production:**
```bash
# Link to remote project
supabase link --project-ref <project-id>

# Push migrations
supabase db push
```

**After migrations, set up your first admin (if needed):**

If you are **not** user ID `63289aab-77fc-4153-9d50-63be3a047202`, promote yourself to admin:
```bash
node scripts/make-admin.js your-email@example.com
```

See `ADMIN_SETUP.md` for detailed admin setup instructions.

**Note:** User `63289aab-77fc-4153-9d50-63be3a047202` is automatically promoted to admin and seeded with config.json defaults when migrations run.

### Manual Migration (if needed)

```bash
# Apply specific migration
supabase db execute --file supabase/migrations/20251125191200_add_image_generation_fields.sql
```

---

## Why JSONB for Settings?

### Advantages
1. **Flexibility** - Add new settings without schema migrations
2. **Performance** - GIN indexes enable fast queries on nested data
3. **Realtime Support** - Supabase Realtime works perfectly with JSONB columns
4. **Easy Merging** - PostgreSQL's JSONB operators support deep merging
5. **Validation** - Can add CHECK constraints with `jsonb_typeof()` if needed

### Query Examples

```sql
-- Get specific nested value
SELECT generation_settings->>'steps' as steps FROM user_settings;

-- Filter by nested value
SELECT * FROM user_settings
WHERE (generation_settings->>'steps')::int > 20;

-- Update nested value
UPDATE user_settings
SET generation_settings = generation_settings || '{"steps": 30}'::jsonb
WHERE user_id = 'uuid';

-- Check if key exists
SELECT * FROM user_settings
WHERE generation_settings ? 'samplerName';
```

### Realtime Subscriptions

JSONB columns work seamlessly with Supabase Realtime:

```javascript
const subscription = supabase
    .channel('user-settings-changes')
    .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_settings',
        filter: `user_id=eq.${userId}`
    }, (payload) => {
        console.log('Settings updated:', payload.new.generation_settings);
    })
    .subscribe();
```

---

## Frontend Integration Examples

### Loading User Settings

```javascript
// In AppContext or settings hook
const loadUserSettings = async () => {
    const response = await fetch('/api/settings/user');
    const settings = await response.json();

    // Apply to UI
    dispatch({
        type: 'SET_DEFAULT_PROMPT',
        payload: settings.default_positive_prompt
    });

    dispatch({
        type: 'SET_GENERATION_SETTINGS',
        payload: settings.generation_settings
    });
};
```

### Saving User Preferences (UI State)

```javascript
// UI preferences stay in localStorage (device-specific)
const updateUIPreference = (key, value) => {
    if (typeof window === 'undefined') return;

    const prefs = JSON.parse(localStorage.getItem('ui_preferences') || '{}');
    prefs[key] = value;
    localStorage.setItem('ui_preferences', JSON.stringify(prefs));
};

// Example: Different NSFW settings per device
updateUIPreference('hideNsfw', true); // Work computer
updateUIPreference('hideNsfw', false); // Home computer
```

### Loading Dimension Presets

```javascript
// Load available dimensions from global settings
const loadDimensions = async () => {
    const response = await fetch('/api/settings/global?key=dimensions');
    const { value } = await response.json();

    // value.portrait, value.landscape, etc.
    setDimensionPresets(value);
};
```

---

## Best Practices

### 1. Always Use PATCH for Partial Updates
```javascript
// ❌ Bad - overwrites entire object
fetch('/api/settings/user', {
    method: 'PUT',
    body: JSON.stringify({ generation_settings: { steps: 30 } })
});

// ✅ Good - merges with existing
fetch('/api/settings/user', {
    method: 'PATCH',
    body: JSON.stringify({ generation_settings: { steps: 30 } })
});
```

### 2. Keep UI Preferences Local
```javascript
// ❌ Bad - trying to sync UI preferences to database
fetch('/api/settings/user', {
    method: 'PATCH',
    body: JSON.stringify({ ui_preferences: { hideNsfw: true } })
});

// ✅ Good - keep in localStorage
localStorage.setItem('ui_preferences', JSON.stringify({ hideNsfw: true }));
```

### 3. Validate JSONB Structure on Client
```javascript
// Ensure consistent structure
const updateGenerationSettings = (updates) => {
    const merged = {
        ...defaultSettings,
        ...currentSettings,
        ...updates
    };

    return fetch('/api/settings/user', {
        method: 'PATCH',
        body: JSON.stringify({ generation_settings: merged })
    });
};
```

### 4. Handle Missing Settings Gracefully
```javascript
const getSetting = (settings, path, defaultValue) => {
    const value = settings?.generation_settings?.[path];
    return value !== undefined ? value : defaultValue;
};

const steps = getSetting(userSettings, 'steps', 20);
```

### 5. Use Tags Effectively
```javascript
// Add tags when saving images
const tags = [
    orientation, // 'portrait', 'landscape'
    selectedCharacter?.name, // character name
    'realistic', // style tags
    // ... custom tags
].filter(Boolean);

await saveGeneratedImage({
    supabase,
    userId,
    imageBase64,
    meta: { tags, ...otherMeta }
});
```

---

## Database Cleanup & Maintenance

### Remove Orphaned Parent References
```sql
-- If parent image is deleted, child's parent_image_id is set to NULL
-- This is handled automatically by ON DELETE SET NULL constraint
```

### Find Image Genealogy
```sql
-- Find all children of an image
SELECT * FROM images WHERE parent_image_id = 'parent-uuid';

-- Find entire generation tree (recursive)
WITH RECURSIVE generation_tree AS (
    SELECT * FROM images WHERE id = 'root-uuid'
    UNION ALL
    SELECT i.* FROM images i
    INNER JOIN generation_tree gt ON i.parent_image_id = gt.id
)
SELECT * FROM generation_tree;
```

### Tag Statistics
```sql
-- Most used tags
SELECT
    jsonb_array_elements_text(tags) as tag,
    COUNT(*) as usage_count
FROM images
GROUP BY tag
ORDER BY usage_count DESC;
```

---

## Troubleshooting

### Issue: Settings not syncing

**Solution:** Check RLS policies are enabled and user is authenticated:
```sql
SELECT auth.uid(); -- Should return user UUID
```

### Issue: JSONB merge not working

**Solution:** Ensure you're using PATCH, not PUT:
```javascript
// Use PATCH for merging
await fetch('/api/settings/user', { method: 'PATCH', ... });
```

### Issue: Tag searches slow

**Solution:** Ensure GIN index exists:
```sql
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING gin(tags);
```

---

## Future Enhancements

Potential additions to consider:

1. **Settings Versioning** - Track changes to user settings over time
2. **Settings Presets** - Allow users to save/load setting presets
3. **Tag Autocomplete** - Build tag suggestions from most-used tags
4. **Generation Templates** - Save complete generation configs as templates
5. **Settings Import/Export** - Share settings between users or backups
