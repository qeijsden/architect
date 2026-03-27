# Xbox Port Testing Checklist

Use this checklist to verify all Xbox and gamepad features are working correctly.

## ✅ Pre-Build Verification

### Code Integration
- [ ] `useXboxGamepad.ts` hook created
- [ ] `useGamepadUINavigation.ts` hook created
- [ ] `useGamePhysics.ts` updated with gamepad support
- [ ] Play.tsx updated with gamepad integration
- [ ] GameCanvas supports gamepad input
- [ ] Gamepad indicator shows in UI

### Build Configuration
- [ ] `electron-builder.json` includes appx target
- [ ] `appxmanifest.xml` exists with correct app info
- [ ] `package.json` has Xbox build scripts
- [ ] Version numbers are consistent

## 🔨 Build Testing

### Windows Build
```powershell
npm run dist:win
```
- [ ] Build completes without errors
- [ ] NSIS installer created
- [ ] Portable exe created
- [ ] Installer runs and installs successfully

### Xbox/UWP Build
```powershell
npm run dist:xbox
```
- [ ] Build completes without errors
- [ ] .appx package created in release-fixed/
- [ ] Package size is reasonable (<200MB)
- [ ] Package can be opened/inspected

## 🎮 Controller Testing (Windows)

### Basic Detection
- [ ] Controller detected when connected via USB
- [ ] Controller detected when connected via Bluetooth
- [ ] Gamepad icon appears in UI when connected
- [ ] Icon disappears when controller disconnected
- [ ] Multiple controller support works

### In-Game Controls
- [ ] Left stick moves player left/right
- [ ] D-Pad moves player left/right
- [ ] A button makes player jump
- [ ] Start button pauses game
- [ ] Controls feel responsive (no lag)
- [ ] Analog stick deadzone works correctly
- [ ] Button presses are consistent

### Editor Controls
- [ ] Right trigger places blocks
- [ ] Left trigger removes blocks
- [ ] Right bumper cycles to next block
- [ ] Left bumper cycles to previous block
- [ ] Right stick moves camera
- [ ] Camera movement is smooth
- [ ] Block placement cursor follows controls

### Haptic Feedback
- [ ] Vibration on death (strong)
- [ ] Vibration on checkpoint (light)
- [ ] Vibration on level complete (celebration)
- [ ] Vibration on UI navigation (subtle)
- [ ] Vibration intensity feels appropriate
- [ ] No vibration if controller doesn't support it

### UI Navigation
- [ ] Can navigate main menu with controller
- [ ] A button selects menu items
- [ ] B button goes back
- [ ] D-Pad/stick navigates menu items
- [ ] RB/LB switches tabs
- [ ] Can navigate settings with controller
- [ ] Can browse levels with controller
- [ ] All buttons are accessible

## 🏠 Local Windows Installation

### AppX Installation
```powershell
# As Administrator
Add-AppxPackage .\release-fixed\Architect-0.5.3-x64.appx
```
- [ ] Package installs without errors
- [ ] App appears in Start Menu
- [ ] App launches from Start Menu
- [ ] Icon displays correctly
- [ ] App info is correct in Settings > Apps

### Runtime Testing
- [ ] Game launches successfully
- [ ] All menus load correctly
- [ ] Can create new levels
- [ ] Can play existing levels
- [ ] Save/load functionality works
- [ ] Settings persist between sessions
- [ ] Performance is smooth (60fps)
- [ ] Audio works correctly
- [ ] Graphics render properly

## 🎯 Xbox Console Testing

### Deployment to Xbox
- [ ] Xbox is in Developer Mode
- [ ] Can access Device Portal (https://xbox-ip:11443)
- [ ] AppX package uploads successfully
- [ ] Package installs on Xbox
- [ ] App appears in Dev Home

### Xbox Launch
- [ ] Game launches from Dev Home
- [ ] Splash screen displays
- [ ] Main menu loads
- [ ] No error messages appear
- [ ] Loading times are acceptable

### Xbox Performance
- [ ] Maintains 60fps in gameplay
- [ ] No frame drops during complex scenes
- [ ] Camera movement is smooth
- [ ] Physics calculations are accurate
- [ ] Multiple players work in local multiplayer

### Xbox Controller (Native)
- [ ] Controller 1 works (Player 1)
- [ ] Controller 2 works (Player 2)
- [ ] All buttons respond correctly
- [ ] Analog sticks work properly
- [ ] Triggers work correctly
- [ ] Vibration works
- [ ] No input lag

### Xbox UI/UX
- [ ] All text is readable on TV
- [ ] UI scales appropriately for TV
- [ ] Safe area boundaries respected
- [ ] Navigation is intuitive with controller
- [ ] No keyboard-only functions required

### Xbox Features
- [ ] Local multiplayer works
- [ ] Can save levels locally
- [ ] Can load levels
- [ ] Settings save correctly
- [ ] Game can be suspended/resumed
- [ ] Quick resume works (Series X|S)

## 🌐 Cross-Platform Testing

### Windows Desktop
- [ ] Keyboard controls work
- [ ] Mouse controls work
- [ ] Gamepad controls work
- [ ] Can switch between input methods
- [ ] All input methods work simultaneously

### Windows UWP
- [ ] All desktop features work
- [ ] Store listing information correct
- [ ] App permissions are appropriate
- [ ] Sandbox restrictions don't break features

### Web Version
- [ ] Gamepad API works in browser
- [ ] Chrome supports gamepad
- [ ] Firefox supports gamepad
- [ ] Edge supports gamepad

## 🐛 Bug Testing

### Edge Cases
- [ ] Connect controller mid-game (hot plug)
- [ ] Disconnect controller during gameplay
- [ ] Low battery doesn't cause issues
- [ ] Multiple controller rapid switching
- [ ] Controller + keyboard simultaneously

### Stress Testing
- [ ] Long play sessions (1+ hour)
- [ ] Rapid button mashing
- [ ] Analog stick edge cases
- [ ] Memory leaks (check Task Manager)
- [ ] CPU usage is reasonable

### Error Handling
- [ ] Graceful degradation without controller
- [ ] Error messages are user-friendly
- [ ] Recovery from crashes
- [ ] Corrupt save handling

## 📊 Performance Metrics

### Target Performance
- [ ] **FPS**: Consistent 60fps
- [ ] **Input Latency**: <50ms
- [ ] **Load Time**: <5 seconds
- [ ] **Memory**: <500MB
- [ ] **CPU**: <30% on Xbox One

### Actual Results
- FPS: ______fps average
- Input Latency: ______ms
- Load Time: ______seconds
- Memory Usage: ______MB
- CPU Usage: ______%

## 📝 Documentation

- [ ] XBOX_DEPLOYMENT.md is accurate
- [ ] XBOX_CONTROLS.md is comprehensive
- [ ] README.md mentions Xbox support
- [ ] Build instructions are clear
- [ ] Troubleshooting section is helpful

## 🚀 Release Checklist

### Pre-Release
- [ ] All tests passed
- [ ] No critical bugs
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Version number updated

### Release Package
- [ ] .appx signed (for Store)
- [ ] Release notes written
- [ ] Screenshots prepared
- [ ] Trailer/video created
- [ ] Store listing prepared

### Post-Release
- [ ] Monitor for crash reports
- [ ] Gather user feedback
- [ ] Update documentation as needed
- [ ] Plan next update

---

## ✅ Final Sign-Off

**Tester Name**: _________________
**Date**: _________________
**Platform**: [ ] Windows  [ ] Xbox One  [ ] Xbox Series S  [ ] Xbox Series X
**Controller**: _________________
**Result**: [ ] PASS  [ ] FAIL

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Ready for Release**: [ ] YES  [ ] NO

---

## 🔄 Continuous Testing

This checklist should be run:
- ✅ Before each release
- ✅ After major code changes
- ✅ After Xbox SDK updates
- ✅ When adding new features
- ✅ Monthly maintenance checks
