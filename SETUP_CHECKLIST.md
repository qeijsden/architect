# ✅ Steam Achievements & Discord Presence - Setup Checklist

## Phase 1: Installation ✅ COMPLETE

- [x] Created Steam achievements backend (electron/steam.js)
- [x] Created Discord RPC backend (electron/discord.js)
- [x] Created React hooks for achievements (useSteamAchievements.ts)
- [x] Created React hook for Discord (useDiscordPresence.ts)
- [x] Created game achievement triggers (useGameAchievements.ts)
- [x] Created achievements UI panel (AchievementsPanel.tsx)
- [x] Updated Electron main process (main.cjs)
- [x] Updated preload script (preload.js)
- [x] Updated App component (App.tsx)
- [x] Added TypeScript types (vite-env.d.ts, types/game.ts)
- [x] Installed discord-rpc dependency
- [x] Created documentation (3 guides + complete summary)

**Status:** ✅ Ready for configuration

---

## Phase 2: Discord Configuration ⏳ TODO

### Step 1: Create Discord Application
- [ ] Go to https://discord.com/developers/applications
- [ ] Click "New Application"
- [ ] Name it "Architect"
- [ ] Accept terms

### Step 2: Get Application ID
- [ ] Click "General Information" tab
- [ ] Copy the "Application ID"

### Step 3: Configure Discord App
- [ ] Go to "Rich Presence" section in left menu
- [ ] Upload image asset:
  - [ ] Name: `architect_logo`
  - [ ] Upload any game image (32x32 to 1024x1024)
- [ ] Save

### Step 4: Add to Code
- [ ] Open `electron/discord.js`
- [ ] Find line 3: `const clientId = '1234567890';`
- [ ] Replace with your Application ID
- [ ] Save file

**Estimated Time:** 5 minutes

---

## Phase 3: Integration ⏳ TODO

### Add Achievement Triggers to Game Code

#### In `src/pages/Play.tsx` (Level Completion)
- [ ] Import `useGameAchievements`
- [ ] Call `unlockLevelComplete()` when player finishes level
- [ ] Call `unlockSpeedrun()` if level finished in < 30 sec
- [ ] Call `unlockWaterMaster()` when using water buoyancy
- [ ] Call `updateGameplayPresence()` during gameplay

#### In `src/pages/PlayMultiplayer.tsx` (Multiplayer)
- [ ] Import `useGameAchievements`
- [ ] Call `unlockMultiplayerWin()` on session victory
- [ ] Update presence with party size

#### In `src/pages/Editor.tsx` (Custom Levels)
- [ ] Import `useGameAchievements`
- [ ] Call `unlockCreator()` when level saved
- [ ] Update Discord presence to show "Creating"

#### In Level Selection (Browse.tsx)
- [ ] Track level progression
- [ ] Call `unlockProgressMilestone()` at level 10

#### In Hammer Collection Logic
- [ ] Track total hammers collected
- [ ] Call `unlockHammerCollector()` at 100

**Estimated Time:** 30-45 minutes

---

## Phase 4: Testing ⏳ TODO

### Test Achievements Panel
- [ ] Run: `npm run build && npm run dist:win`
- [ ] Launch `release/Architect Setup.exe`
- [ ] Look for 🏆 trophy icon in bottom-right corner
- [ ] Click icon to open achievements panel
- [ ] Verify all 8 achievements appear
- [ ] Check progress bar shows 0/8

### Test Achievement Unlocking
- [ ] Jump in game → verify FIRST_JUMP unlocks
- [ ] Complete a level → verify LEVEL_COMPLETE unlocks
- [ ] Panel updates in real-time
- [ ] Check trophy icon now shows badge with count

### Test Discord Presence (if App ID configured)
- [ ] Keep Discord open while playing
- [ ] Look at "Presence" > "Actively Playing"
- [ ] Should show "Architect - Player's Playground"
- [ ] Launch level → presence should update
- [ ] In multiplayer → should show party size
- [ ] Complete level → presence updates

### Test Data Persistence
- [ ] Close and reopen game
- [ ] Achievements should still be unlocked
- [ ] Check achievements.json file exists
- [ ] Verify timestamps are recorded

**Estimated Time:** 15-20 minutes

---

## Phase 5: Release ⏳ TODO

### Pre-Release
- [ ] All achievements integrated into game logic
- [ ] Discord App ID configured (if using Discord)
- [ ] All tests passing
- [ ] No console errors

### Build for Release
- [ ] Run: `npm run dist:win`
- [ ] Creates installer in `release/`
- [ ] Test installer on clean system
- [ ] Verify achievements work in release build

### Ship It! 🚀
- [ ] Achievements visible in Discord when playing
- [ ] Achievement panel works in Electron app
- [ ] All 8 achievements unlockable in game
- [ ] Deployment and release

---

## Quick Reference

### Achievement Unlock Patterns

```typescript
// Pattern 1: Simple unlock
const { unlockLevelComplete } = useGameAchievements();
await unlockLevelComplete('Level 1');

// Pattern 2: Conditional unlock
if (timeElapsed < 30) {
  await unlockSpeedrun('Level 1');
}

// Pattern 3: Counter-based
if (totalHammers === 100) {
  await unlockHammerCollector(100);
}

// Pattern 4: Update presence
await updateGameplayPresence(
  'Playing Level 1',
  '5/10 hammers'
);
```

### Configuration Points

| What | Where | Setting |
|------|-------|---------|
| Discord App ID | `electron/discord.js` | Line 3 |
| Achievement Icons | `electron/steam.js` | ACHIEVEMENTS object |
| Achievement Names | `electron/steam.js` | ACHIEVEMENTS object |
| UI Panel Styling | `src/components/AchievementsPanel.tsx` | Tailwind classes |
| Discord Image | Discord Developer Portal | Named "architect_logo" |

---

## Files to Edit

**Must Edit:**
- [ ] `electron/discord.js` - Add Discord App ID (only if using Discord)
- [ ] `src/pages/Play.tsx` - Add achievement triggers
- [ ] `src/pages/PlayMultiplayer.tsx` - Add multiplayer achievement

**Should Edit:**
- [ ] `src/pages/Editor.tsx` - Add creator achievement
- [ ] `src/pages/Browse.tsx` - Add progress tracking
- [ ] `src/components/Home.tsx` - Add presence hook

**Optional:**
- [ ] Add new achievements to `electron/steam.js`
- [ ] Customize achievement icons/names
- [ ] Add Discord buttons
- [ ] Customize Discord image asset

---

## File Locations Reminder

```
Project Root/
├── electron/
│   ├── discord.js          ← Edit: Add Discord App ID
│   ├── steam.js            ← Reference: Achievement definitions
│   ├── preload.js          ← Already configured ✅
│   └── main.cjs            ← Already configured ✅
│
├── src/
│   ├── pages/
│   │   ├── Play.tsx        ← Edit: Add achievements
│   │   ├── PlayMultiplayer.tsx  ← Edit: Add achievements
│   │   └── Editor.tsx      ← Edit: Add achievements
│   │
│   ├── hooks/
│   │   ├── useSteamAchievements.ts      ← Pre-made ✅
│   │   ├── useDiscordPresence.ts        ← Pre-made ✅
│   │   └── useGameAchievements.ts       ← Pre-made ✅
│   │
│   ├── components/
│   │   └── AchievementsPanel.tsx        ← Pre-made ✅
│   │
│   ├── App.tsx             ← Already configured ✅
│   └── vite-env.d.ts       ← Already configured ✅
│
├── achievements.json       ← Auto-created on first run
├── package.json            ← discord-rpc added ✅
├── STEAM_DISCORD_SETUP.md  ← Full documentation
├── ACHIEVEMENTS_SUMMARY.md ← Implementation overview
├── QUICKSTART_ACHIEVEMENTS.md ← Quick reference
└── IMPLEMENTATION_COMPLETE.md  ← This summary
```

---

## Estimated Time to Complete

- Phase 2 (Discord config): **5 min**
- Phase 3 (Integration): **30-45 min**
- Phase 4 (Testing): **15-20 min**
- Phase 5 (Release): **5 min**

**Total:** ~60 minutes for full implementation

---

## Support Resources

If you get stuck:
1. Check **QUICKSTART_ACHIEVEMENTS.md** for quick examples
2. See **STEAM_DISCORD_SETUP.md** for full API docs
3. Check browser console for Discord errors
4. Check achievements.json for file permissions
5. Verify Discord App ID matches your app

---

## Success Indicators

You'll know it's working when:
- ✅ Trophy icon appears in bottom-right corner
- ✅ Clicking shows achievement panel with all 8 achievements
- ✅ Progress bar shows 0/8 initially
- ✅ Achievements unlock as you play
- ✅ Discord shows "Playing Architect" when Discord is open
- ✅ achievements.json file appears in project root
- ✅ Achievement unlock dates are recorded

---

## Final Checklist

```
Phase 1: Installation
- [x] Paid by: Implementation complete

Phase 2: Discord Setup
- [ ] Get Discord App ID
- [ ] Add to electron/discord.js
- [ ] Upload image asset to Discord

Phase 3: Integration
- [ ] Add triggers to Play.tsx
- [ ] Add triggers to PlayMultiplayer.tsx
- [ ] Add triggers to other game pages
- [ ] Test with dev server

Phase 4: Testing
- [ ] Build release version
- [ ] Test in Electron app
- [ ] Test Discord presence
- [ ] Verify persistence

Phase 5: Release
- [ ] Final testing
- [ ] Deploy to users
```

---

**Questions?** See the documentation files:
- **STEAM_DISCORD_SETUP.md** - Full reference
- **QUICKSTART_ACHIEVEMENTS.md** - Quick examples
- **ACHIEVEMENTS_SUMMARY.md** - Architecture details

**Ready to build!** 🚀
