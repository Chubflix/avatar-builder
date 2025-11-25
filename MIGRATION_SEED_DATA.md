# Migration Seed Data

This document describes the data automatically seeded when migrations are run.

## User ID: 63289aab-77fc-4153-9d50-63be3a047202

### Admin Role
**Table:** `user_roles`
**Migration:** `20251125191500_create_user_roles.sql`

This user is automatically promoted to **admin** role when migrations run.

```sql
insert into public.user_roles (user_id, role)
values ('63289aab-77fc-4153-9d50-63be3a047202'::uuid, 'admin')
on conflict (user_id) do update set role = 'admin';
```

### User Settings
**Table:** `user_settings`
**Migration:** `20251125191300_create_user_settings.sql`
**Source:** `config.json` defaults

The following settings are automatically created:

| Setting | Value | Source |
|---------|-------|--------|
| `default_positive_prompt` | `""` (empty) | config.json → defaults.positivePrompt |
| `default_negative_prompt` | `"lazyneg, lazyhand"` | config.json → defaults.negativePrompt |
| `default_dimension` | `"portrait"` | config.json → defaults.orientation |
| `default_batch_size` | `1` | config.json → defaults.batchSize |

**generation_settings (JSONB):**
```json
{
  "samplerName": "DPM++ 2M",
  "scheduler": "Karras",
  "steps": 25,
  "cfgScale": 7
}
```
Source: config.json → generation

**adetailer_settings (JSONB):**
```json
{
  "enabled": true,
  "model": "face_yolov8n.pt"
}
```
Source: config.json → adetailer

---

## Global Settings (All Users)

### LoRAs
**Table:** `global_settings`
**Key:** `loras`
**Migration:** `20251125191400_create_global_settings.sql`
**Source:** `config.json` loras array

5 LoRAs are pre-configured:
1. **Age** - Slider (-2 to 2, Young to Old)
2. **Disney 5.0** - Style LoRA
3. **Disney 4.0** - Style LoRA
4. **White Outline** - Toggle LoRA
5. **Body Type** - Slider (-2 to 2, Fat to Skinny)

### Dimensions
**Table:** `global_settings`
**Key:** `dimensions`
**Migration:** `20251125191400_create_global_settings.sql`
**Source:** `config.json` dimensions

```json
{
  "portrait": { "width": 832, "height": 1216 },
  "landscape": { "width": 1216, "height": 832 },
  "square": { "width": 1024, "height": 1024 }
}
```

---

## Migration Behavior

All seed data uses `ON CONFLICT DO NOTHING` or `DO UPDATE`, making migrations:
- **Idempotent** - Safe to run multiple times
- **Non-destructive** - Won't overwrite existing user data
- **Update-safe** - Admin role upsert ensures role is set even if row exists

---

## Changing Seed Data

If you need to update the seeded values:

1. **Edit the migration file** before first run
2. **Or** update via API after migrations run:

```bash
# Update your user settings
curl -X PATCH http://localhost:3000/api/settings/user \
  -H "Content-Type: application/json" \
  -d '{
    "default_negative_prompt": "new negatives",
    "generation_settings": {
      "steps": 30
    }
  }'

# Update global settings (admin only)
curl -X PUT http://localhost:3000/api/settings/global \
  -H "Content-Type: application/json" \
  -d '{
    "key": "loras",
    "value": [...]
  }'
```

3. **Or** run a custom SQL update:

```sql
update public.user_settings
set default_negative_prompt = 'new negatives'
where user_id = '63289aab-77fc-4153-9d50-63be3a047202';
```
