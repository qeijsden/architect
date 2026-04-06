## Setting Up Downloads

To make the download buttons fully functional, you need to configure the download URLs in the `downloadHelpers.ts` file.

### Option 1: GitHub Releases (Recommended for Production)

1. Build the app for release:
   ```bash
   npm run dist:win    # For Windows
   npm run dist:linux  # For Linux
   ```

2. Upload the files to GitHub Releases:
   - Go to your repository on GitHub
   - Create a new Release (e.g., v0.1.0)
   - Upload `Architect-Setup.exe` (from `release/` folder)
   - Upload `Architect.AppImage` (from `release/` folder)

3. Update the download URLs in `src/utils/downloadHelpers.ts`:
   ```ts
   export const DOWNLOADS: Record<string, DownloadInfo> = {
     windows: {
       name: 'Windows',
       filename: 'Architect-Setup.exe',
       url: 'https://github.com/YOUR-USERNAME/architect/releases/download/v0.1.0/Architect-Setup.exe',
       size: '120MB',
     },
     linux: {
       name: 'Linux',
       filename: 'Architect.AppImage',
       url: 'https://github.com/YOUR-USERNAME/architect/releases/download/v0.1.0/Architect.AppImage',
       size: '100MB',
     },
   };
   ```

### Option 2: Local Server (For Development)

1. Place built files in the `public/downloads/` directory
2. Update URLs to use relative paths:
   ```ts
   url: '/downloads/Architect-Setup.exe'
   ```

### Testing Locally

The download buttons will now:
- Open the download URL in a new browser tab
- Automatically start the file download if hosted on GitHub Releases
- Or serve from the public folder if using a local server

### Current Status

The download button handlers are configured and will redirect users to the release download pages once you update the URLs above.
