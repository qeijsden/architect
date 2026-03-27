# Switched to Clerk Authentication ✅

You've successfully switched from Supabase Auth to Clerk! This gives you:
- **One-click OAuth** - Discord, Google, GitHub, Microsoft, and 20+ more providers
- **Zero configuration** for OAuth providers
- **Built-in 2FA** - No extra setup needed
- **Free tier** supports up to 10,000 users
- **Automatic profile sync** to Supabase for game data

## Quick Start

### 1. Get Your Clerk Key (5 minutes)
1. Go to https://clerk.com and sign up (free)
2. Create a new application
3. Copy your **Publishable Key** from API Keys section
4. Add to `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### 2. Restart Dev Server
```bash
bun install  # Install @clerk/clerk-react
bun run dev
```

### 3. Test Sign Up
- Go to `/auth`
- Click any OAuth provider (Discord, Google, etc.)
- Sign in or create account
- Profile automatically synced to Supabase!

## What Changed

### ✅ Replaced
- ❌ Custom Supabase email/password auth
- ❌ Manual OAuth setup per provider
- ✅ with **Clerk's built-in auth** (email, OAuth, 2FA, etc.)

### ✅ Still Using
- ✅ Supabase for game data (levels, leaderboards, sessions)
- ✅ Clerk for user authentication
- ✅ Automatic profile sync between them

## Files Updated

- **useAuth.ts** - Now uses Clerk hooks (`useAuth`, `useUser`)
- **Auth.tsx** - Now uses `<SignIn>` component from Clerk
- **App.tsx** - Added `<ClerkProvider>` wrapper
- **package.json** - Added `@clerk/clerk-react` dependency
- **.env** - Added `VITE_CLERK_PUBLISHABLE_KEY`

## How Profiles Sync

```
User Signs Up with Clerk
        ↓
Clerk creates user (email, OAuth info)
        ↓
App detects new auth user
        ↓
Auto-creates profile in Supabase
        ↓
User can now play and save game data!
```

## Enable OAuth Providers

In Clerk Dashboard → **OAuth Applications**:
- Discord ✅ (enabled by default)
- Google ✅ (enabled by default)
- GitHub ✅ (enabled by default)
- Microsoft ✅ (enabled by default)
- And 20+ more!

**No API keys to manage** - Clerk handles everything!

## Need Help?

- **Setup issues?** → Check [CLERK_SETUP.md](CLERK_SETUP.md)
- **API errors?** → Check browser console
- **Lost users?** → Old Supabase users still have profiles! New Clerk users auto-create theirs
- **Clerk docs?** → https://clerk.com/docs

---

## Next Steps

1. ✅ Get Clerk Publishable Key
2. ✅ Add to .env
3. ✅ Test `/auth` page
4. ✅ Try signing in with Discord/Google
5. ✅ Check Supabase to see auto-created profile
6. ✅ Multiplayer should work (uses same profiles)

That's it! Enjoy passwordless auth! 🎉
