# System Architecture Overview

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GAME APPLICATION                        │
│                   (React + TypeScript)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │   React Hooks      │
        │  (src/hooks/)      │
        ├────────────────────┤
        │ useSteamAchvmts   │──┐
        │ useDiscordPresence│  │
        │ useGameAchvmts    │  │
        └────────┬───────────┘  │
                 │              │
        ┌────────▼──────────┐   │
        │    IPC Bridge      │   │
        │  (Electron IPC)    │   │
        └────────┬──────────┘   │
                 │              │
    ┌────────────┴────────────┐ │
    │                         │ │
┌───▼──────────────┐   ┌──────▼────────────┐
│  Steam Module    │   │  Discord RPC     │
│ (electron/steam) │   │ (electron/discord)│
└───┬──────────────┘   └──────┬───────────┘
    │                         │
    ▼                         ▼
├─ Achievements ────────► Discord
├─ Unlock tracking          (Online
├─ Stats/Progress          Presence)
└─ Local Storage
   (achievements.json)
```

---

## Component Tree

```
App (src/App.tsx)
├─ ClerkProvider
├─ QueryClientProvider
├─ TooltipProvider
└─ AppContent
   ├─ useDiscordPresence()  ◄── Auto-init on mount
   ├─ Router
   │  └─ Routes
   │     ├─ Home
   │     ├─ Play              ◄── Unlocks achievements
   │     ├─ PlayMultiplayer   ◄── Multiplayer achievements
   │     ├─ Editor            ◄── Creator achievement
   │     ├─ Browse
   │     └─ ... other pages
   │
   └─ AchievementsPanel      ◄── Only in Electron
      └─ useSteamAchievements()
         ├─ Load achievements on mount
         ├─ Listen for updates
         └─ Display 8 achievements + stats
```

---

## Electron Process Architecture

```
┌─────────────────────────────────────────────────────┐
│       Main Process (electron/main.cjs)              │
├─────────────────────────────────────────────────────┤
│  On App Ready:                                      │
│  1. initializeSteam()  ───────┐                    │
│  2. initializeDiscordRPC() ──┐│                    │
│  3. createWindow()          ││                    │
│                              ││                    │
│  IPC Message Handlers:       ││                    │
│  steam:unlock-achievement  ◄─┘│                    │
│  steam:get-stats          ◄──┘                    │
│  discord:set-presence                             │
│  discord:clear-presence                           │
│  discord:get-status                               │
│                                                    │
└──────────────────┬─────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼────┐  ┌──▼────┐  ┌─▼──────┐
    │ Steam  │  │Discord│  │ Window │
    │ Module │  │ RPC   │  │        │
    └────────┘  └───────┘  └────────┘
```

---

## File Organization

```
Core Achievement System:
electron/steam.js                    (150 lines)
├─ 8 Achievement definitions
├─ Load/Save achievements.json
├─ IPC handlers for React
└─ Stats calculation

Discord Integration:
electron/discord.js                   (68 lines)
├─ RPC client setup
├─ Connection management
├─ Presence updates
└─ Error handling

React Hooks Layer:
src/hooks/useSteamAchievements.ts    (95 lines)
├─ Load achievements
├─ Unlock achievements
├─ Get stats
└─ Reset (testing)

src/hooks/useDiscordPresence.ts      (48 lines)
├─ Set presence
├─ Clear presence
└─ Get status

src/hooks/useGameAchievements.ts     (100 lines)
├─ High-level trigger utilities
├─ Combined achievement + Discord
└─ Pre-configured game events

UI Layer:
src/components/AchievementsPanel.tsx (100 lines)
├─ Trophy button
├─ Achievement list
├─ Progress bar
└─ Unlock timestamps

Integration Points:
src/App.tsx                           (Updated)
├─ Use Discord hook
├─ Render achievements panel
└─ Wire up router

src/vite-env.d.ts                    (Updated)
└─ TypeScript definitions

src/types/game.ts                    (Updated)
├─ Achievement interface
└─ AchievementStats interface

Electron:
electron/main.cjs                    (Updated)
├─ Initialize both systems
└─ Setup IPC

electron/preload.js                  (Updated)
├─ Expose steam API
└─ Expose discord API
```

---

## Data Model

### Achievement Object
```typescript
{
  id: "FIRST_JUMP",
  name: "First Jump",
  description: "Jump for the first time",
  icon: "🦘",
  unlocked: false,
  unlockedTime: null  // "2026-02-10T14:30:00Z" when unlocked
}
```

### Achievement Stats
```typescript
{
  total: 8,
  unlocked: 3,      // How many achievements unlocked
  percentage: 37    // Completion percentage
}
```

### Discord Presence
```typescript
{
  state: "Playing Level 1",
  details: "5/10 hammers collected",
  largeImageKey: "architect_logo",
  startTimestamp: Date.now(),
  partySize: 2,
  partyMax: 4
}
```

### Persistent Storage (achievements.json)
```json
{
  "FIRST_JUMP": {
    "unlocked": true,
    "unlockedTime": "2026-02-10T14:30:00.000Z"
  },
  "LEVEL_COMPLETE": {
    "unlocked": false,
    "unlockedTime": null
  },
  ...
}
```

---

## Achievement Unlock Flow

```
User plays game
      │
      ▼
Game logic detects event
(level complete, hammer collected, etc.)
      │
      ▼
Call achievement trigger
(e.g., unlockLevelComplete())
      │
      ▼
useGameAchievements hook
      │
      ├─ Call useSteamAchievements.unlockAchievement()
      │     │
      │     ▼
      │  Send IPC: steam:unlock-achievement
      │     │
      │     ▼
      │  electron/steam.js handles
      │     │
      │     ├─ Update achievementsData object
      │     ├─ Add unlockedTime
      │     ├─ Save to achievements.json
      │     └─ Respond with success
      │
      ├─ Update React state
      │     └─ setAchievements() re-renders panel
      │
      └─ Call useDiscordPresence.setPresence()
            │
            ▼
         Send IPC: discord:set-presence
            │
            ▼
         electron/discord.js handles
            │
            ▼
         Send RPC to Discord app
            │
            ▼
         User sees presence in Discord
            (Playing "Level 1" | 5/10 hammers)
```

---

## Event Triggers (Where to Add Code)

```
Game Event                    Achievement to Unlock
─────────────────────────────────────────────────────
Player jumps                  FIRST_JUMP
Level completed               LEVEL_COMPLETE
Level completed < 30 sec      SPEEDRUN
Player touches water block    WATER_MASTER
Win multiplayer session       MULTIPLAYER_WIN
Collect 100 hammers           COLLECT_100_HAMMERS
Reach level 10                REACH_LEVEL_10
Save custom level in editor   VISIT_EDITOR
```

---

## Configuration Points

```
Setting               Location                     Value
────────────────────────────────────────────────────────
Discord App ID        electron/discord.js:3        "Your_Discord_App_ID"
Discord Image         Discord Dev Portal:          "architect_logo"
Achievement Icons     electron/steam.js:30-60      Emoji or text
Achievement Names     electron/steam.js:30-60      String
Achievement Desc      electron/steam.js:30-60      String
Panel Position        AchievementsPanel:4          bottom-right
Panel Styling         AchievementsPanel:CSS        Tailwind
Storage Location      electron/steam.js:8          achievements.json
```

---

## Integration Points (Where to Add Achievements)

```
File                        Method Location      What to Add
──────────────────────────────────────────────────────────────
src/pages/Play.tsx         onLevelComplete()    unlockLevelComplete()
                          speedrunCheck()       unlockSpeedrun()

src/pages/PlayMultiplayer  onSessionWin()       unlockMultiplayerWin()

src/pages/Editor.tsx       onSave()             unlockCreator()

                          Water particle        unlockWaterMaster()

Hammer collection logic    onCollect()          unlockHammerCollector()

Level progression           onLevelSelect()      unlockProgressMilestone()
```

---

## Dependencies & Versions

```
Package           Version    Purpose
─────────────────────────────────────────
discord-rpc       ^4.0.1     Discord RPC client
electron          ^40.2.1    (already installed)
react             ^18.3.1    (already installed)
typescript        ^5.8.3     (already installed)
```

---

## Performance Metrics

```
Asset                    Size        Impact
────────────────────────────────────────────
achievements.json        ~1-5 KB     Minimal
Discord RPC message      ~200 B      Minimal (sent infrequently)
React hook state         ~5 KB       Minimal
UI panel rendering       On demand   Lazy-loaded
Memory footprint         < 1 MB      Negligible
```

---

## Browser DevTools Debugging

### Check achievements:
```javascript
// In DevTools console (Electron only)
window.electronAPI.steam.getAllAchievements()

// Check specific achievement
window.electronAPI.steam.getAchievement('FIRST_JUMP')

// Check stats
window.electronAPI.steam.getStats()

// Unlock manually
window.electronAPI.steam.unlockAchievement('FIRST_JUMP')

// Check Discord
window.electronAPI.discord.getStatus()
```

### Check file system:
```
Project Root/
└─ achievements.json  (created on first run)
```

---

## Testing Checklist Matrix

```
Feature              Unit Test    Integration    E2E
─────────────────────────────────────────────────────
Steam load           ✅ Auto      ✅ DevTools    ✅ UI
Steam unlock         ✅ Manual    ✅ Component   ✅ Panel
Steam stats          ✅ Manual    ✅ Component   ✅ Display
Discord connect      ✅ Mock      ✅ IPC         ✅ Discord
Discord presence     ✅ Manual    ✅ IPC         ✅ Discord
File persistence     ✅ Manual    ✅ Disk        ✅ File
Panel rendering      ✅ React     ✅ Mount       ✅ Click
```

---

## Architecture Principles

1. **Separation of Concerns**
   - Backend logic in Electron (electron/steam.js, discord.js)
   - React hooks for abstraction (useSteamAchievements, useDiscordPresence)
   - UI component (AchievementsPanel.tsx)
   - Game logic integration (useGameAchievements.ts)

2. **Error Handling**
   - Try/catch in all IPC calls
   - Graceful degradation (works without Discord)
   - Console logging for debugging
   - No app crashes

3. **Type Safety**
   - Full TypeScript coverage
   - Interface definitions for all data
   - No `any` types (except window casting)
   - Type-checked IPC calls

4. **Performance**
   - Local-first (no network calls)
   - Lazy-loaded UI
   - Minimal re-renders
   - File-based storage

5. **User Experience**
   - Persistent achievements
   - Real-time updates
   - Visual feedback (trophy badge)
   - Integration with Discord friends
