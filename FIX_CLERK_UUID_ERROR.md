# Fix: UUID Type Error with Clerk User IDs

## Problem
```
invalid input syntax for type uuid: "user_39UngYmiIItBJJOADefelhOHawd"
```

This error occurs because:
- Supabase `profiles.user_id` column is defined as `UUID` type
- Clerk user IDs are strings like `user_39UngYmiIItBJJOADefelhOHawd` (not valid UUID format)

## Solution

### Step 1: Apply Migration in Supabase

Go to **Supabase Dashboard**:

1. Click your project
2. Go to "SQL Editor" (left sidebar)
3. Click "New Query"
4. Copy and paste this SQL:

```sql
-- Fix user_id column to accept Clerk user IDs (strings, not UUIDs)
ALTER TABLE public.profiles
DROP CONSTRAINT profiles_user_id_unique;

ALTER TABLE public.profiles
ALTER COLUMN user_id SET DATA TYPE TEXT USING user_id::text;

ALTER TABLE public.profiles
ADD UNIQUE(user_id);
```

5. Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
6. Wait for success message

### Step 2: Clear Browser Cache

```
1. Open DevTools (F12)
2. Go to Application tab
3. Clear all localStorage and sessionStorage
4. Refresh page (Ctrl+Shift+R)
```

### Step 3: Test

1. Go to `/auth`
2. Sign up with a new account
3. You should be redirected to `/` after signup
4. Try clicking your profile (top-right avatar)
5. Go to `/profile` 
6. Try saving profile changes

## What Changed

**Before:**
```sql
user_id UUID NOT NULL
```

**After:**
```sql
user_id TEXT NOT NULL
```

This allows Clerk user IDs (string format) to be stored properly.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still getting UUID error | Refresh page after migration, clear localStorage |
| Migration failed | Check Supabase status: https://status.supabase.com |
| Can't see SQL editor | Check if you have admin permissions in Supabase |

## Files Created

- `supabase/migrations/20260210_fix_clerk_user_id.sql` - Migration file (reference only)

The actual migration needs to be run manually in Supabase Dashboard SQL Editor.

**Status:** ✅ Ready after running the SQL migration
