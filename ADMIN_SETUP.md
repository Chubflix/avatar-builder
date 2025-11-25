# Admin Role Setup Guide

This document explains how to set up and manage admin roles in the Avatar Builder application.

## Overview

The admin role system allows you to:
- Restrict global settings modifications to admin users only
- Manage who can add/edit/delete LoRAs and dimension presets
- Maintain control over system-wide configuration

All authenticated users can:
- Read global settings
- Manage their own user settings
- View their own role

Only admin users can:
- Create/update/delete global settings (LoRAs, dimensions, etc.)
- Promote other users to admin (if needed)

## Database Schema

### user_roles Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key to auth.users (unique) |
| `role` | `text` | Either 'user' or 'admin' |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

### Helper Functions

- `is_admin()` - Returns true if the current authenticated user is an admin
- `is_user_admin(user_id)` - Returns true if the specified user is an admin

---

## Initial Setup

**Note:** If you are user ID `63289aab-77fc-4153-9d50-63be3a047202`, you are automatically set up as admin when migrations run. Skip to the Verification section.

For other users, you need to promote them to admin using one of the methods below.

### Option 1: Using the Node.js Script (Recommended)

```bash
# Make sure you have the service role key in your .env.local
node scripts/make-admin.js your-email@example.com
```

**Required environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Option 2: Using SQL (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following query, replacing `<USER_EMAIL>` with your email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = '<USER_EMAIL>'
on conflict (user_id)
do update set role = 'admin';
```

### Option 3: Using Supabase CLI

```bash
# Create a temporary SQL file
cat > temp-admin.sql << 'EOF'
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'your-email@example.com'
on conflict (user_id)
do update set role = 'admin';
EOF

# Execute it
supabase db execute --file temp-admin.sql

# Clean up
rm temp-admin.sql
```

---

## Verification

After promoting a user to admin, verify it worked:

### Via API
```bash
# Check your admin status
curl http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
# { "user_id": "...", "is_admin": true }
```

### Via SQL
```sql
select
  u.email,
  coalesce(ur.role, 'user') as role
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
where u.email = 'your-email@example.com';
```

---

## API Endpoints

### Check Admin Status

**GET** `/api/admin/check`

Returns whether the current user is an admin.

**Response:**
```json
{
  "user_id": "uuid",
  "is_admin": true
}
```

### Get User Role

**GET** `/api/admin/users/:userId/role`

Returns the role for a specific user.

**Response:**
```json
{
  "user_id": "uuid",
  "role": "admin"
}
```

### Update User Role (Admin Only)

**PUT** `/api/admin/users/:userId/role`

Promotes or demotes a user. Only admins can use this endpoint.

**Request:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "role": "admin",
  "created_at": "...",
  "updated_at": "..."
}
```

**Restrictions:**
- Only admins can call this endpoint
- Users cannot demote themselves
- Role must be either "user" or "admin"

---

## Usage Examples

### Frontend: Check If User Is Admin

```javascript
// In a React component or context
const checkAdminStatus = async () => {
    const response = await fetch('/api/admin/check');
    const { is_admin } = await response.json();

    if (is_admin) {
        // Show admin controls
        setShowAdminPanel(true);
    }
};

useEffect(() => {
    checkAdminStatus();
}, []);
```

### Frontend: Promote Another User (Admin Only)

```javascript
const promoteToAdmin = async (userId) => {
    try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'admin' })
        });

        if (response.status === 403) {
            alert('Only admins can promote users');
            return;
        }

        const data = await response.json();
        console.log('User promoted:', data);
    } catch (error) {
        console.error('Failed to promote user:', error);
    }
};
```

### Frontend: Conditional UI Rendering

```javascript
function GlobalSettingsEditor() {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetch('/api/admin/check')
            .then(res => res.json())
            .then(({ is_admin }) => setIsAdmin(is_admin));
    }, []);

    if (!isAdmin) {
        return (
            <div className="no-access">
                <p>Only administrators can modify global settings.</p>
                <p>Contact an admin to make changes.</p>
            </div>
        );
    }

    return (
        <div className="settings-editor">
            {/* Admin controls for editing LoRAs, dimensions, etc. */}
        </div>
    );
}
```

---

## Security Considerations

### RLS (Row Level Security)

The `global_settings` table uses RLS policies to enforce admin-only writes:

```sql
-- All users can read
create policy global_settings_select_all on global_settings
  for select to authenticated
  using (true);

-- Only admins can insert
create policy global_settings_insert_admin on global_settings
  for insert to authenticated
  with check (public.is_admin());

-- Only admins can update
create policy global_settings_update_admin on global_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can delete
create policy global_settings_delete_admin on global_settings
  for delete to authenticated
  using (public.is_admin());
```

### Self-Demotion Prevention

The API prevents users from demoting themselves:

```javascript
// In PUT /api/admin/users/:userId/role
if (userId === user.id && role === 'user') {
    return NextResponse.json(
        { error: 'Cannot demote yourself from admin' },
        { status: 400 }
    );
}
```

This prevents accidentally locking yourself out of admin functions.

---

## Common Tasks

### Make Yourself Admin (First Time)

```bash
# Using the script
node scripts/make-admin.js your-email@example.com
```

### Check All Admins

```sql
select
  u.email,
  ur.role,
  ur.created_at as admin_since
from public.user_roles ur
join auth.users u on u.id = ur.user_id
where ur.role = 'admin'
order by ur.created_at;
```

### Demote a User

```bash
# Via API (requires admin authentication)
curl -X PUT http://localhost:3000/api/admin/users/USER_UUID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{"role": "user"}'
```

Or via SQL:

```sql
update public.user_roles
set role = 'user'
where user_id = 'USER_UUID';
```

### Remove Admin Role Entirely

```sql
delete from public.user_roles
where user_id = 'USER_UUID';
```

This sets the user back to the default 'user' role.

---

## Troubleshooting

### "Forbidden: Admin access required" when editing global settings

**Cause:** You don't have admin role assigned.

**Solution:**
1. Check your role: `GET /api/admin/check`
2. If not admin, run the make-admin script
3. Verify with SQL: `select * from user_roles where user_id = 'YOUR_UUID'`

### is_admin() function not found

**Cause:** Migration 20251125191500_create_user_roles.sql hasn't run.

**Solution:**
```bash
supabase db push
# or
supabase db reset
```

### Can't promote myself to admin

**Cause:** No existing admins, and regular user API doesn't allow self-promotion.

**Solution:** Use one of the initial setup methods:
- Run `node scripts/make-admin.js your-email@example.com`
- Use the SQL script in Supabase dashboard
- Use Supabase service role key to bypass RLS

### Service role key not working

**Cause:** Using anon key instead of service role key.

**Solution:**
- Get service role key from Supabase dashboard (Settings → API)
- Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- **Never** commit service role key to git
- Service role key bypasses RLS, use only in trusted scripts

---

## Migration Order

The admin system requires migrations to run in this order:

1. `20251125191500_create_user_roles.sql` - Creates user_roles table and is_admin() function
2. `20251125191400_create_global_settings.sql` - Creates global_settings with admin-only RLS

If migrations run out of order, RLS policies may fail because they depend on the `is_admin()` function.

**Fix if migrations ran out of order:**
```bash
supabase db reset
```

---

## Best Practices

1. **Always have at least one admin** - Don't demote the last admin
2. **Use the API for role management** - It has built-in safety checks
3. **Keep service role key secure** - Only use for initial setup scripts
4. **Audit admin changes** - The `updated_at` column tracks role changes
5. **Document admin users** - Keep a list of who has admin access

---

## Future Enhancements

Potential improvements to the admin system:

- **Admin activity log** - Track all global settings changes
- **Role hierarchy** - Add more granular roles (editor, moderator, etc.)
- **Permission system** - Fine-grained permissions beyond just admin/user
- **Admin notifications** - Email alerts when new admins are added
- **2FA requirement for admins** - Extra security for privileged accounts
