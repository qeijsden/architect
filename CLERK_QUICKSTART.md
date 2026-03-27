# ⚡ Clerk Auth - 3 Steps to Get Running

## Step 1: Sign Up for Clerk (2 minutes)
```
1. Go to https://clerk.com
2. Click "Sign Up" 
3. Create account
4. Create new application
```

## Step 2: Copy Your Key (1 minute)
```
In Clerk Dashboard:
1. Click "API Keys" on left sidebar
2. Copy "Publishable Key" (starts with pk_)
3. Paste into .env file:

VITE_CLERK_PUBLISHABLE_KEY=pk_test_yourkey123...
```

## Step 3: Restart and Test (1 minute)
```bash
bun install          # Install clerk package
bun run dev          # Start dev server
# Go to http://localhost:5173/auth
# Click Discord, Google, or enter email
# That's it! 🎉
```

## What to Expect

✅ **First Login** - Creates profile automatically in Supabase  
✅ **OAuth Buttons** - Discord, Google, GitHub work instantly  
✅ **User ID** - Synced between Clerk and your game  
✅ **Multiplayer** - Uses same profiles, still works!  
✅ **2FA** - Clerk handles it automatically  

## Troubleshooting

**"PublishableKey is required"**
- Did you add to `.env`?
- Did you restart `bun run dev`?

**"Can't sign in with Discord/Google"**
- Check Clerk Dashboard → OAuth Applications
- Make sure provider is enabled (green checkmark)
- Wait 30 seconds after enabling

**"Profile wasn't created"**
- Check Supabase → profiles table
- Should auto-create on first login
- Check browser console for errors

## That's All!

Users can now:
- ✅ Sign up with email password
- ✅ Sign up with Discord
- ✅ Sign up with Google  
- ✅ Sign up with 15+ other providers
- ✅ Use 2FA
- ✅ Reset password
- ✅ Manage sessions
- ✅ Play multiplayer games

**Zero extra setup! Everything just works!** 🚀
