# OAuth Setup Guide

## Prerequisites
This guide explains how to enable Discord and Google OAuth for authentication in Architect.

## Discord OAuth Setup

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Architect")
4. Accept the ToS and create

### 2. Get Discord Credentials
1. Go to "OAuth2" → "General"
2. Copy **Client ID**
3. Under "CLIENT SECRET", click "Reset Secret" and copy it

### 3. Add Redirect URLs
1. In "OAuth2" → "General", scroll to "Redirects"
2. Add these redirect URIs:
   - `https://your-app-url.vercel.app/auth/callback` (production)
   - `http://localhost:5173/auth/callback` (local development)
   - `http://localhost:3000/auth/callback` (alternative local)

### 4. Add to Supabase
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to: **Authentication** → **Providers**
3. Find **Discord** and enable it
4. Paste your Discord Client ID and Secret
5. Save

---

## Google OAuth Setup

### 1. Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**

### 2. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Choose **Web application**
4. Name it (e.g., "Architect Web")

### 3. Add Authorized Redirect URIs
1. Add these URIs:
   - `https://your-app-url.vercel.app/auth/callback` (production)
   - `http://localhost:5173/auth/callback` (local)
   - `http://localhost:3000/auth/callback` (alternative)
   - `https://yoursupabaseproject.supabase.co/auth/v1/callback` (Supabase)

2. Click Save

### 4. Get Your Credentials
1. Copy **Client ID**
2. Copy **Client Secret**

### 5. Add to Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. **Authentication** → **Providers**
3. Find **Google** and enable it
4. Paste your Client ID and Secret
5. Save

---

## Local Development Testing

For local testing with redirect URLs:

1. **Development URL**: `http://localhost:5173`
   - Make sure your dev server is running on port 5173
   - The callback will redirect to `http://localhost:5173/auth/callback`

2. **Test in Incognito Mode**
   - Tests are cleaner in private browsing

3. **Check Browser Console**
   - Errors will show in DevTools if OAuth fails

---

## Troubleshooting

### Error: "OAuth configuration incomplete"
- Make sure providers are enabled in Supabase Dashboard
- Verify Client ID and Secret are correct

### Redirect URL Mismatch Error
- Check that your redirect URL matches EXACTLY in provider settings
- Including protocol (http/https) and port

### "Unauthorized" on callback
- Verify the Supabase callback URL is added to the OAuth app

### Still not working?
- Check Supabase logs: **Authentication** → **Logs**
- Check browser console for specific error messages
- Ensure Supabase project is on paid plan (free tier has OAuth limitations)

---

## Environment Variables

No additional environment variables needed! Supabase handles OAuth provider credentials securely.

The redirect URL is automatically constructed as:
```
${window.location.origin}/auth/callback
```

Which will be:
- `http://localhost:5173/auth/callback` (local development)
- `https://your-domain.com/auth/callback` (production)

---

## Testing OAuth Flow

1. Start dev server: `bun run dev`
2. Navigate to `/auth`
3. Click "Discord" or "Google" button
4. You'll be redirected to the provider
5. After login, you'll be redirected back to `/auth/callback`
6. Then automatically to the home page if successful

Done! OAuth should now work.
