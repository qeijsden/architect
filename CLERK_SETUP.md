# Clerk Authentication Setup

Clerk provides simple, secure authentication with built-in OAuth support for Discord, Google, and many other providers.

## Quick Setup (5 minutes)

### 1. Create Clerk Account
1. Go to [clerk.com](https://clerk.com)
2. Sign up for free
3. Create a new Application

### 2. Get Your Publishable Key
1. In Clerk Dashboard, go to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_`)
3. Add to `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_your_key_here
   ```

### 3. Enable OAuth Providers (Optional)
In Clerk Dashboard → **Users** → **OAuth & SAML** → **OAuth Applications**

Enable any of these:
- **Discord** - No configuration needed! Clerk provides API keys
- **Google** - No configuration needed! Clerk provides API keys
- **GitHub** - No configuration needed! Clerk provides API keys
- **Microsoft** - No configuration needed! Clerk provides API keys
- And 20+ more...

### 4. Set Redirect URLs
In Clerk Dashboard → **Paths**:
- Add `http://localhost:5173` (development)
- Add `http://localhost:3000` (alternative dev)
- Add your production domain

### 5. Verify .env
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx...
VITE_SUPABASE_PROJECT_ID=your_supabase_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### 6. Start Dev Server
```bash
bun install  # Install new @clerk/clerk-react package
bun run dev
```

## How It Works

1. **User clicks sign in** → Clerk handles everything
2. **User authenticates** → Discord/Google/Email
3. **Clerk creates user** → Stored in Clerk dashboard
4. **Synced to Supabase** → Profile created automatically in Supabase for game data

## Database Sync

When a user signs up with Clerk, the app automatically:
- Creates a profile in Supabase `profiles` table
- Stores their name, email, and OAuth provider info
- Links to their user ID for game data

## Troubleshooting

### "PublishableKey is required"
- Make sure `VITE_CLERK_PUBLISHABLE_KEY` is in `.env`
- Restart dev server after adding env variable

### Sign in page doesn't show
- Clear browser cache
- Check that Clerk is properly initialized
- Open DevTools console for errors

### OAuth buttons not showing
- Go to Clerk Dashboard → **OAuth Applications**
- Enable the providers you want
- Wait 30 seconds for sync

### Can't sign up
- Check Clerk Dashboard → **Email** for email configuration
- Most providers auto-enabled in free tier

## Features (All Free Tier)

✅ Email/password auth
✅ Discord OAuth
✅ Google OAuth  
✅ GitHub OAuth
✅ Microsoft OAuth
✅ Email verification
✅ Password reset
✅ 2FA (optional)
✅ Social sign-up
✅ Up to 10,000 users

## Need Help?

- [Clerk Docs](https://clerk.com/docs)
- [Clerk Support](https://support.clerk.com)
- Check browser console for detailed error messages

---

## Migration from Previous Auth

All existing Supabase profiles still work! Clerk users will:
1. Sign in with Clerk
2. Automatically create new profiles in Supabase
3. Can play games normally

No data loss - everything synced properly.
