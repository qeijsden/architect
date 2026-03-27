# Xbox and UWP Deployment Guide

## Overview

Architect is now fully optimized for Xbox and Windows 10/11 with comprehensive gamepad support. This guide will help you build, deploy, and play the game on Xbox consoles and Windows devices.

## Features

### Xbox Controller Support
- **Full Gamepad Integration**: Native Xbox controller support for all game features
- **Haptic Feedback**: Controller vibration for gameplay events (death, win, checkpoint)
- **UI Navigation**: Navigate menus and UI with controller
- **Plug-and-Play**: Automatic detection when controller is connected

### Controller Layout

#### In-Game Controls
- **Left Stick / D-Pad**: Move player (left/right)
- **A Button**: Jump
- **Start Button**: Pause game
- **X Button**: Interact

#### Editor Controls
- **Right Trigger (RT)**: Place block
- **Left Trigger (LT)**: Remove block
- **Right Bumper (RB)**: Next block type
- **Left Bumper (LB)**: Previous block type
- **Right Stick**: Move camera

#### UI Navigation
- **Left Stick / D-Pad**: Navigate menus
- **A Button**: Confirm/Select
- **B Button**: Back/Cancel
- **RB/LB**: Switch tabs/categories

## Building for Xbox

### Prerequisites

1. **Windows 10/11 SDK** (version 10.0.17763.0 or higher)
   - Download from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

2. **Visual Studio 2022** (Community Edition is free)
   - Install with "Universal Windows Platform development" workload
   - Download from: https://visualstudio.microsoft.com/downloads/

3. **Developer Mode** enabled on your PC
   - Go to Settings > Update & Security > For developers
   - Enable "Developer Mode"

4. **Node.js** (v18 or higher)
   ```powershell
   node --version
   ```

### Build Steps

#### 1. Install Dependencies
```powershell
npm install
```

#### 2. Build Xbox/UWP Package
```powershell
npm run dist:xbox
```

This will create an `.appx` package in the `release-fixed` directory.

#### 3. Alternative Build Commands
```powershell
# Build UWP package only
npm run dist:uwp

# Build all Windows targets (NSIS, Portable, and AppX)
npm run dist:all

# Build for development/testing
npm run build:dev
```

## Deploying to Xbox

### Method 1: Xbox Developer Mode (Recommended for Testing)

1. **Enable Developer Mode on Xbox**
   - Download "Xbox Dev Mode" app from Microsoft Store on your Xbox
   - Follow on-screen instructions to activate Developer Mode
   - Note the IP address shown on the screen

2. **Install Windows Device Portal**
   - Open browser and navigate to: `https://<Xbox-IP-Address>:11443`
   - Accept the security certificate
   - Set up username and password

3. **Deploy via Device Portal**
   - Go to "Apps" > "Deploy Apps"
   - Upload the `.appx` file from `release-fixed` folder
   - Click "Install" and wait for deployment

4. **Launch the Game**
   - Find "Architect" in the Dev Home app list
   - Launch and start playing!

### Method 2: Microsoft Store Submission (For Public Release)

1. **Create Microsoft Partner Center Account**
   - Go to: https://partner.microsoft.com/dashboard
   - Pay one-time registration fee ($19 for individuals, $99 for companies)

2. **Reserve App Name**
   - In Partner Center, create new app submission
   - Reserve "Architect" or your chosen name

3. **Update Identity**
   - Get your app identity from Partner Center
   - Update `appxmanifest.xml` with correct Publisher ID and Identity Name

4. **Build Release Package**
   ```powershell
   npm run dist:xbox
   ```

5. **Submit to Store**
   - Upload `.appx` package
   - Fill in store listing information
   - Submit for certification

6. **Certification Process**
   - Microsoft reviews app (typically 1-3 days)
   - Game appears in Microsoft Store once approved
   - Available on Xbox, Windows 10/11

## Testing Xbox Features

### Local Testing on Windows

1. **Install the AppX Package**
   ```powershell
   # From PowerShell as Administrator
   Add-AppxPackage .\release-fixed\Architect.appx
   ```

2. **Test Gamepad**
   - Connect Xbox controller via USB or Bluetooth
   - Launch Architect from Start Menu
   - Controller should be detected automatically

3. **Verify Features**
   - [ ] Gamepad icon appears when controller connected
   - [ ] Can navigate menus with controller
   - [ ] Can play game with controller
   - [ ] Haptic feedback works
   - [ ] Camera controls work with right stick

### Testing on Xbox Console

1. **Sideload via Developer Mode** (see Method 1 above)

2. **Performance Considerations**
   - Xbox One: 1080p @ 60fps target
   - Xbox Series S: 1440p @ 60fps target
   - Xbox Series X: 4K @ 60fps target

3. **Test Scenarios**
   - [ ] Game launches without errors
   - [ ] All menus navigable with controller
   - [ ] Gameplay is smooth
   - [ ] Multiplayer works on local network
   - [ ] Save/load functionality works

## Troubleshooting

### Build Issues

**Error: "SDK not found"**
```powershell
# Install Windows SDK
winget install Microsoft.WindowsSDK
```

**Error: "Publisher identity doesn't match"**
- Update `appxmanifest.xml` with correct Publisher ID
- Get Publisher ID from Microsoft Partner Center

### Deployment Issues

**Cannot connect to Xbox Device Portal**
- Ensure Xbox is in Developer Mode
- Check firewall settings
- Verify both devices on same network

**App won't install on Xbox**
- Check minimum OS version requirements
- Ensure Xbox is updated to latest firmware
- Try uninstalling any existing version first

### Runtime Issues

**Controller not detected**
- Try disconnecting and reconnecting controller
- Check controller batteries/connection
- Test controller in other Xbox games first

**Performance issues**
- Close background apps
- Clear cache: Settings > System > Storage
- Reinstall the app

## Performance Optimization

### For Xbox Deployment

The game automatically optimizes for Xbox hardware:

1. **60 FPS Target**: Game loop locked at 60fps
2. **Resolution Scaling**: Automatic resolution adjustment based on Xbox model
3. **Asset Loading**: Optimized texture loading for console memory
4. **Controller Polling**: 120Hz gamepad input polling

### Manual Optimizations

If experiencing performance issues, consider:

1. Reduce particle effects in settings
2. Lower resolution in electron-builder.json
3. Disable background features (Discord, Steam) on Xbox builds

## Distribution

### Free Distribution
- Sideload to friends' Xbox consoles in Developer Mode
- Share download link for Windows AppX package
- Host on your own website

### Commercial Distribution
- Submit to Microsoft Store
- Set pricing ($0.99 - $99.99)
- Enable Xbox Play Anywhere (play on Xbox and PC with single purchase)
- Consider Xbox Game Pass submission

## Additional Resources

- [UWP Documentation](https://docs.microsoft.com/en-us/windows/uwp/)
- [Xbox Developer](https://developer.microsoft.com/en-us/games/xbox)
- [Electron Builder Documentation](https://www.electron.build/)
- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

## Support

For issues or questions:
- Open GitHub issue
- Contact: support@architect-game.com
- Discord: [Your Discord Server]

---

**Note**: Xbox Live integration (achievements, multiplayer matchmaking) requires additional Xbox Live SDK integration and Microsoft certification. Current implementation supports local multiplayer and sideloading.
