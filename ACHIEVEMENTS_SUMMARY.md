# Steam Achievements & Discord Presence - Implementation Summary

## What Was Added

### 1. **Steam Achievements System** 🏆
A complete local achievement tracking system with 8 achievements:

- 🦘 **FIRST_JUMP** - Jump for the first time
- ⭐ **LEVEL_COMPLETE** - Complete a level  
- ⚡ **SPEEDRUN** - Complete a level under 30 seconds
- 💧 **WATER_MASTER** - Use water buoyancy mechanics
- 🤝 **MULTIPLAYER_WIN** - Win a multiplayer session
- 🔨 **COLLECT_100_HAMMERS** - Collect 100 hammers
- 🎯 **REACH_LEVEL_10** - Reach level 10
- 🎨 **VISIT_EDITOR** - Create a custom level

**Files Created:**
- `electron/steam.js` - Steam backend (IPC handlers)
- `src/hooks/useSteamAchievements.ts` - React hook for achievements
- `src/components/AchievementsPanel.tsx` - UI component (bottom-right panel)

**Storage:** `achievements.json` (local file system)

### 2. **Discord Rich Presence** 🎮
Shows your game activity in Discord with customizable presence data.

**Features:**
- Auto-detect game state (menu, playing, multiplayer, editing)
- Party size display (multiplayer)
- Custom buttons (optional)
- Start/end timestamps
- Large + small image support

**Files Created:**
- `electron/discord.js` - Discord RPC backend
- `src/hooks/useDiscordPresence.ts` - React hook for Discord

### 3. **Achievement Trigger Utilities** 🎯
Helper hook for easily unlocking achievements throughout game logic.

**File:** `src/hooks/useGameAchievements.ts`

**Methods:**
```typescript
const achievements = useGameAchievements();

// Unlock specific achievement
await achievements.unlockLevelComplete('Level 1');
await achievements.unlockSpeedrun('Level 1');

// Update Discord presence
await achievements.updateGameplayPresence('Playing Level 1', '5/10 hammers');

// Check if achievement exists
const achievement = achievements.getAchievement('FIRST_JUMP');
```

### 4. **Type Definitions** 📝
Updated `src/types/game.ts` with:
```typescript
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedTime: string | null;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  percentage: number;
}
```

### 5. **Electron Integration** ⚡
Modified files:
- `electron/main.cjs` - Initializes Steam and Discord on app start
- `electron/preload.js` - Exposes Steam/Discord APIs to renderer
- `src/vite-env.d.ts` - TypeScript definitions for electronAPI

### 6. **App Integration** 🔄
- Updated `src/App.tsx` to include Discord presence hook and achievements panel
- Achievements panel only shows in Electron builds
- Discord presence auto-updates on component mount/unmount

## How to Use

### Enable Discord Presence

1. Create Discord app: https://discord.com/developers/applications
2. Copy your **Application ID**
3. Update `electron/discord.js` line 3:
   ```javascript
   const clientId = 'YOUR_DISCORD_APP_ID';
   ```
4. Upload image asset named `architect_logo` in Rich Presence settings

### Unlock Achievements in Game Logic

In any game component (e.g., `Play.tsx`, `PlayMultiplayer.tsx`):

```typescript
import { useGameAchievements } from '@/hooks/useGameAchievements';

function Play() {
  const achievements = useGameAchievements();
  const [startTime] = useState(Date.now());

  const handleLevelComplete = async () => {
    const elapsed = (Date.now() - startTime) / 1000;
    
    // Check for speedrun
    if (elapsed < 30) {
      await achievements.unlockSpeedrun('Level Name');
    }

    // Always unlock level complete
    await achievements.unlockLevelComplete('Level Name');
  };

  return (
    <button onClick={handleLevelComplete}>
      Finish Level
    </button>
  );
}
```

### View Achievements

- **In-Game:** Click the 🏆 trophy icon (bottom-right corner)
- **In Discord:** Game activity shows "Playing Architect"

## Configuration

### Add New Achievement

1. Edit `electron/steam.js` - Add to `ACHIEVEMENTS` object
2. Edit `src/hooks/useGameAchievements.ts` - Add unlock method
3. Call from game logic when condition is met

### Customize Discord Presence

```typescript
const { setPresence } = useDiscordPresence();

await setPresence({
  state: 'Speedrunning Level 5',
  details: '15 seconds left',
  largeImageKey: 'architect_logo',
  partySize: 3,
  partyMax: 4,
});
```

## File Structure

```
electron/
  ├── discord.js           # Discord RPC backend
  ├── steam.js             # Steam achievements backend
  ├── main.cjs             # Updated with Steam/Discord init
  └── preload.js           # Updated with IPC handlers

src/
  ├── components/
  │   └── AchievementsPanel.tsx    # UI component
  ├── hooks/
  │   ├── useSteamAchievements.ts  # Achievements hook
  │   ├── useDiscordPresence.ts    # Discord hook
  │   └── useGameAchievements.ts   # Trigger utilities
  ├── types/
  │   └── game.ts                  # Achievement types
  ├── App.tsx                      # Updated with hooks
  └── vite-env.d.ts               # Type definitions

achievements.json                   # Local storage (auto-created)
STEAM_DISCORD_SETUP.md             # Full documentation
```

## Dependencies Installed

- `discord-rpc@^4.0.1` - Discord rich presence client

## Testing

### View Achievements Dropdown
1. Run in Electron build
2. Click trophy icon (bottom-right)
3. Should show 8 achievements with progress bar

### Test Discord Presence
1. Launch game while Discord is open
2. Check Discord Activity
3. Should show "Playing Architect - Player's Playground"
4. Verify state/details update as you play

### Test Achievement Unlock
In browser console:
```javascript
// Manually trigger
window.electronAPI.steam.unlockAchievement('FIRST_JUMP');

// Check all
window.electronAPI.steam.getAllAchievements();

// View stats
window.electronAPI.steam.getStats();
```

## Next Steps

1. ✅ Dependencies installed (discord-rpc)
2. ⏳ Get Discord App ID from developer portal
3. ⏳ Integrate achievement triggers into game logic:
   - Play.tsx component
   - PlayMultiplayer.tsx component
   - Editor.tsx component
   - Leaderboard logic
4. ⏳ Test Discord presence updates during gameplay
5. ⏳ Build and release with Electron

## Documentation

See **STEAM_DISCORD_SETUP.md** for:
- Complete implementation guide
- All API references
- Examples
- Troubleshooting
- Best practices

## Key Notes

- 🟢 **Achievements only work in Electron builds** (not web)
- 🟢 **Discord RPC requires Discord app to be running**
- 🟢 **Local storage:** achievements.json (never cleared unless reset)
- 🟢 **No server required:** achievements are client-side only
- 🟢 **Performance:** Minimal impact, efficient IPC communication

## Status

✅ Implementation complete  
✅ TypeScript types fixed  
✅ Electron integration done  
✅ Dependencies installed  
⏳ Discord App ID needed (manual setup)  
⏳ Achievement triggers in game logic (integrate next)
