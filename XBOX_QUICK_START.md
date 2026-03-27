# 🚀 Quick Start: Build for Xbox

Follow these steps to build and test your Xbox port right now!

## Prerequisites Check

Before building, ensure you have:
- [x] Node.js 18+ installed (`node --version`)
- [x] All dependencies installed (`npm install`)
- [ ] Windows 10/11 SDK (optional for testing, required for Store)

## Step 1: Install Dependencies

```powershell
npm install
```

Wait for installation to complete...

## Step 2: Build Xbox Package

```powershell
npm run dist:xbox
```

This will:
1. Build the React app with Vite
2. Package with Electron
3. Create AppX package for Xbox/UWP

**Expected Output:**
```
• Building Electron app...
• Building Windows AppX package...
✓ Build complete!
Package: release-fixed/Architect-0.5.3-x64.appx
```

## Step 3: Verify Build

Check that the file exists:
```powershell
dir release-fixed/*.appx
```

You should see:
```
Architect-0.5.3-x64.appx
Architect Setup 0.5.3.exe (NSIS installer)
```

## Step 4: Test Locally (Windows)

### Method A: PowerShell Installation
```powershell
# Run as Administrator
Add-AppxPackage .\release-fixed\Architect-0.5.3-x64.appx
```

### Method B: Double-Click
1. Navigate to `release-fixed` folder
2. Right-click `Architect-0.5.3-x64.appx`
3. Click "Install"
4. Follow prompts

## Step 5: Test Gamepad

1. **Connect Xbox Controller**
   - Plug in via USB, or
   - Connect via Bluetooth

2. **Launch Architect**
   - Find in Start Menu
   - Launch the game

3. **Verify Controller**
   - Look for gamepad icon in-game
   - Try moving with left stick
   - Try jumping with A button
   - Check if vibration works

## Step 6: Test on Xbox (Optional)

### Enable Developer Mode
1. Install "Xbox Dev Mode" app from Xbox Store
2. Follow activation instructions
3. Note the IP address shown

### Deploy to Xbox
1. Open browser: `https://[Xbox-IP]:11443`
2. Accept security certificate
3. Create username/password
4. Go to "Apps" > "Deploy Apps"
5. Upload `Architect-0.5.3-x64.appx`
6. Click "Install"

### Launch on Xbox
1. Open Dev Home on Xbox
2. Find "Architect" in app list
3. Launch game
4. Use Xbox controller to play!

## Troubleshooting

### Build Fails
**Error: "Cannot find module"**
```powershell
rm -rf node_modules
npm install
```

**Error: "SDK not found"**
- Install Windows 10/11 SDK from Microsoft
- Or skip AppX and just build NSIS: `npm run dist:win`

### Can't Install AppX
**Error: "Publisher identity doesn't match"**
- This is normal for unsigned packages
- Enable "Developer Mode" in Windows Settings
- Settings > Update & Security > For developers

**Error: "Package failed validation"**
- Check Windows version (need 10.0.17763+)
- Update Windows if needed

### Controller Not Detected
- Try different USB port
- Try Bluetooth instead of USB
- Check controller batteries
- Test controller in other games first
- Restart the game

### Performance Issues
- Close background apps
- Lower graphics settings (if available)
- Check Task Manager for CPU/memory usage
- Try on different hardware

## What to Test

- [x] Game launches
- [ ] Controller detected
- [ ] Move with left stick
- [ ] Jump with A button
- [ ] Navigate menus with controller
- [ ] Vibration works
- [ ] Camera controls (right stick)
- [ ] UI shows gamepad icon
- [ ] Can place/remove blocks (if in editor)
- [ ] Game runs smooth (60fps)

## Next Steps

Once local testing passes:
1. ✅ Build successful
2. ✅ Gamepad works
3. ⏩ Test on Xbox console
4. ⏩ Optimize performance
5. ⏩ Submit to Microsoft Store

## Need Help?

- 📖 Read: `XBOX_DEPLOYMENT.md`
- 🎮 Controls: `XBOX_CONTROLS.md`
- ✅ Testing: `XBOX_TESTING_CHECKLIST.md`
- 📝 Summary: `XBOX_IMPLEMENTATION_SUMMARY.md`

---

**Ready to build?** Run `npm run dist:xbox` now! 🚀
