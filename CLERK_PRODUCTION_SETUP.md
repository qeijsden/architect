# 🚀 Removing Clerk Development Tag & Production Setup

## What's the Development Tag?

When you create a Clerk app, it starts in **Development** mode. This tag appears in:
- Dashboard instances list
- Your app UI (some SDKs show this)
- Environment variables (dev vs. production keys are different)

To move to production, you need to:
1. Create a production instance in Clerk
2. Replace your development keys with production keys
3. Redeploy your app

---

## Step-by-Step: Move from Development to Production

### 1. Check Current Clerk Setup

Go to https://dashboard.clerk.com/

You should see:
- Your application listed under "Instances"
- Currently set to: **Development** environment

### 2. Create Production Instance (Option A: Recommended)

**In Clerk Dashboard:**

```
Applications (left sidebar)
  └─ [Your App Name]
     ├─ Development
     └─ Production  ← Create this if it doesn't exist
```

**If Production doesn't exist:**
- Click "Create Instance"
- Select **Production** environment
- Name it (e.g., "Architect Production")
- Click Create

### 3. Get Production Publishable Key

**In Clerk Dashboard:**

```
Account (left sidebar)
  └─ API Keys
     └─ Find "Publishable key" section
        
- Copy the Production instance's Publishable Key
- It looks like: pk_live_xxx (starts with "live", not "test")
```

### 4. Update Your .env File

**In project root:**

```bash
# .env

# ❌ OLD (Development)
# VITE_CLERK_PUBLISHABLE_KEY="pk_test_bmV1dHJhbC1tYXJtb3QtMjQuY2xlcmsuYWNjb3VudHMuZGV2JA"

# ✅ NEW (Production)
VITE_CLERK_PUBLISHABLE_KEY="pk_live_YOUR_PRODUCTION_KEY_HERE"
```

Replace `YOUR_PRODUCTION_KEY_HERE` with the key you copied from Clerk.

### 5. For Backend (If Applicable)

If you have a backend that needs the Secret Key:

**In Clerk Dashboard:**
```
Account (left sidebar)
  └─ API Keys
     └─ Secret Key section
     
- Copy the Production Secret Key (pk_live_)
- Add to your backend .env: CLERK_SECRET_KEY=xxx
```

**Note:** For a webfolder-only app, you probably don't need the secret key.

### 6. Rebuild & Deploy

```bash
# Clear cache
rm -r node_modules/.vite  # Or clear your build cache

# Rebuild
npm run build

# For Electron:
npm run dist:win

# For web deployment:
# Push to your hosting provider (Vercel, Netlify, etc.)
```

### 7. Test Production Instance

**In your app:**
1. Go to `/auth` page
2. Try signing up with Email
3. Try signing up with Discord or Google
4. Check that it works without "development" indicators

---

## Verification Checklist

- [ ] Clerk dashboard shows your app in **Production** environment
- [ ] `.env` file has `pk_live_` publishable key (not `pk_test_`)
- [ ] Rebuilt your application (`npm run build`)
- [ ] Tested sign up and sign in flows
- [ ] Profile saving works correctly
- [ ] No "Development" badges in the UI

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still seeing "development" mode | Clear browser cache + rebuild (npm run build) |
| Sign in not working | Verify .env key is correct and matches Clerk dashboard |
| OAuth buttons not working | Ensure OAuth providers are configured in Clerk for Production |
| Old development key still used | Kill dev server, rebuild, restart |

---

## For Production Deployments

### Vercel / Netlify

1. Add environment variable in dashboard:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
   ```

2. Redeploy application

3. Verify in browser DevTools > Application tab:
   ```javascript
   window.env.VITE_CLERK_PUBLISHABLE_KEY  // Should be pk_live_
   ```

### Electron / Desktop

1. Update `.env` file with production key
2. Rebuild: `npm run dist:win`
3. Installer will use new keys

### Docker / Custom Server

1. Pass as environment variable:
   ```bash
   docker run -e VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx ...
   ```

---

## Clerk Organizations (Advanced)

If you want to organize multiple apps:

```
Clerk Dashboard
  └─ Organizations
     ├─ Development Organization
     └─ Production Organization
```

You can separate dev and prod instances into different organizations for better management.

---

## Reference: Development vs Production Keys

| Aspect | Development | Production |
|--------|-------------|------------|
| Prefix | `pk_test_` | `pk_live_` |
| Users | Test users only | Real users |
| Database | Isolated | Persistent |
| OAuth | Requires dev configuration | Requires live configuration |
| SSL | Not required | Required |
| Uptime SLA | No | Yes |

---

## Quick Reference Commands

```bash
# Check current publishable key in code
grep -r "VITE_CLERK" src/

# Check .env
cat .env | grep CLERK

# Rebuild for production
npm run build

# Test production build locally
npm run preview

# Build Electron
npm run dist:win
```

---

## After Setup: Test Full Flow

1. **Sign Up** → Create new account
2. **Verify Email** → Check email confirmation (if enabled)
3. **OAuth** → Try Discord/Google login (if configured)
4. **Profile** → Update display name (tests updateProfile fix)
5. **Sign Out** → Should clear session
6. **Sign Back In** → Should restore session

If all work, your production setup is complete! ✅

---

## Need More Help?

- **Clerk Setup Guide:** https://clerk.com/docs/deployment/clerk-basics
- **Environment Variables:** https://clerk.com/docs/references/frontend/clerk-react
- **OAuth Configuration:** https://clerk.com/docs/oauth-providers

**Your app is now running in production mode! 🚀**
