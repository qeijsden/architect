# Steam Achievements & Discord Presence Integration Guide

## Overview

This guide explains how to use the Steam achievements system and Discord rich presence integration in your Architect game.

## Setup Instructions

### 1. Install Dependencies

```bash
bun install discord-rpc
```

### 2. Configure Discord RPC

To enable Discord presence, you need a Discord application:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it "Architect"
3. Go to the "General Information" tab and copy your **Application ID**
4. In `electron/discord.js`, replace the `clientId`:
   ```javascript
   const clientId = 'YOUR_DISCORD_APP_ID'; // Replace with your ID
   ```
5. Upload a large image asset in the "Rich Presence" section:
   - Set the name as `architect_logo`
   - This will display in Discord Rich Presence

### 3. Configure Steam (Optional)

For Steam integration:

1. Get your Steam App ID from SteamWorks
2. In `electron/steam.js`, update `STEAM_APP_ID`:
   ```javascript
   const STEAM_APP_ID = 'YOUR_STEAM_APP_ID';
   ```

## Features

### Steam Achievements

#### Available Achievements

- **FIRST_JUMP** (🦘) - Jump for the first time
- **LEVEL_COMPLETE** (⭐) - Complete a level
- **SPEEDRUN** (⚡) - Complete a level under 30 seconds
- **WATER_MASTER** (💧) - Use water buoyancy mechanics
- **MULTIPLAYER_WIN** (🤝) - Win a multiplayer session
- **COLLECT_100_HAMMERS** (🔨) - Collect 100 hammers
- **REACH_LEVEL_10** (🎯) - Reach level 10
- **VISIT_EDITOR** (🎨) - Create a custom level in the editor

#### Unlocking Achievements

Use the `useGameAchievements` hook in your game components:

```typescript
import { useGameAchievements } from '@/hooks/useGameAchievements';

function Play() {
  const { unlockLevelComplete, unlockSpeedrun } = useGameAchievements();
  const [startTime] = useState(Date.now());

  const handleLevelComplete = async () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // Check for speedrun
    if (elapsedSeconds < 30) {
      await unlockSpeedrun('Level 1');
    }

    // Unlock level complete
    await unlockLevelComplete('Level 1');
  };

  return (
    <div>
      {/* Your level rendering */}
      <button onClick={handleLevelComplete}>Complete Level</button>
    </div>
  );
}
```

### Discord Rich Presence

The Discord presence automatically updates based on game activity.

#### Default Presence

- **In Main Menu**: "Exploring" | "Browsing levels"
- **Playing Level**: "Completed a level" | "Finished: [Level Name]"
- **In Multiplayer**: "Won multiplayer session" | "Playing with 4 players"

#### Custom Discord Presence

Use the `useDiscordPresence` hook:

```typescript
import { useDiscordPresence } from '@/hooks/useDiscordPresence';

function PlayMultiplayer() {
  const { setPresence } = useDiscordPresence();
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    setPresence({
      state: 'In Multiplayer Lobby',
      details: `${playerCount} players ready`,
      partySize: playerCount,
      partyMax: 4,
    });
  }, [playerCount]);

  return <div>{/* Multiplayer content */}</div>;
}
```

#### Discord Presence Parameters

```typescript
interface DiscordPresenceData {
  state?: string;              // Large text (e.g., "Playing Level 1")
  details?: string;            // Small text (e.g., "99/100 hammers")
  largeImageKey?: string;      // Main image asset name
  largeImageText?: string;     // Hover text for large image
  smallImageKey?: string;      // Small overlay image asset
  smallImageText?: string;     // Hover text for small image
  startTimestamp?: number;     // Activity start time (ms)
  endTimestamp?: number;       // Activity end time (ms)
  partySize?: number;          // Current party size
  partyMax?: number;           // Max party size
  matchSecret?: string;        // For multiplayer matching
  instance?: boolean;          // Show "Ask to Join" button
  buttons?: Array<{
    label: string;
    url: string;
  }>;
}
```

## Achievements Panel UI

The achievements panel appears in the bottom-right corner when running in Electron.

Features:
- Trophy icon shows unlock count
- Click to view all achievements
- Progress bar showing completion percentage
- Individual achievement details with unlock dates
- Real-time updates when achievements are unlocked

## Viewing Achievements

### In-Game Panel

Click the <Trophy> icon in the bottom-right corner to view:
- All achievements
- Progress percentage (e.g., 3/8 = 37%)
- Unlock dates
- Achievement descriptions

### Discord

Players will see your activity in Discord:
- Game name: "Architect - Player's Playground"
- Current activity with timestamps
- Party information (if in multiplayer)
- Custom buttons (if configured)

## Storage

Achievements are stored locally in:
```
achievements.json
```

Format:
```json
{
  "FIRST_JUMP": {
    "unlocked": true,
    "unlockedTime": "2026-02-10T14:30:00.000Z"
  },
  "LEVEL_COMPLETE": {
    "unlocked": false,
    "unlockedTime": null
  }
}
```

## Debugging

### Check Discord Connection

```typescript
const { getStatus } = useDiscordPresence();

useEffect(async () => {
  const status = await getStatus();
  console.log('Discord Connected:', status.connected);
}, []);
```

### Check Steam Achievements

Use the achievements panel to view all achievements and their unlock status.

To reset achievements (testing only):
```typescript
const { resetAchievements } = useSteamAchievements();

button.onClick = async () => {
  await resetAchievements();
};
```

## Adding New Achievements

1. **Add to `ACHIEVEMENTS` object** in `electron/steam.js`:
   ```javascript
   NEW_ACHIEVEMENT: {
     id: 'NEW_ACHIEVEMENT',
     name: 'Achievement Name',
     description: 'Description',
     icon: '🎯',
   },
   ```

2. **Add unlock method** to `useGameAchievements.ts`:
   ```typescript
   unlockNewAchievement: async () => {
     await unlockAchievement('NEW_ACHIEVEMENT');
   },
   ```

3. **Call from game logic**:
   ```typescript
   const { unlockNewAchievement } = useGameAchievements();
   // When condition is met:
   await unlockNewAchievement();
   ```

## Testing

### Test Achievements Locally

```typescript
// In a test component
import { useSteamAchievements } from '@/hooks/useSteamAchievements';

function AchievementTest() {
  const { unlockAchievement, getAllAchievements } = useSteamAchievements();

  return (
    <div>
      <button onClick={() => unlockAchievement('FIRST_JUMP')}>
        Unlock First Jump
      </button>
      <button onClick={() => getAllAchievements()}>
        View All Achievements
      </button>
    </div>
  );
}
```

### Test Discord Presence

Launch the game and check Discord:
1. Open Discord
2. Go to User Settings > Connections
3. Look for "Architect" in your playing activity
4. Verify the presence updates as you play

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Discord not connecting | Verify `clientId` is correct in `discord.js` |
| Achievements not saving | Check `achievements.json` permissions |
| Achievements panel not showing | Ensure `VITE_ELECTRON=true` during build |
| Discord presence not updating | Check browser console for IPC errors |

## Best Practices

1. **Only unlock in Electron**: Achievements only work in the desktop app
2. **Unique unlock checks**: Use `.unlocked` flag to prevent duplicate unlocks
3. **Notify players**: Show toast notifications when achievements unlock
4. **Test thoroughly**: Use test component to verify achievement logic
5. **Monitor performance**: Discord RPC and achievements have minimal impact

## Example: Complete Integration

```typescript
// Example in a Play component
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { useState } from 'react';
import { toast } from 'sonner';

function Play() {
  const achievements = useGameAchievements();
  const [startTime] = useState(Date.now());
  const [hammersCollected, setHammersCollected] = useState(0);

  const handleHammerCollect = async () => {
    const newCount = hammersCollected + 1;
    setHammersCollected(newCount);

    // Check for hammer collector achievement
    if (newCount === 100) {
      await achievements.unlockHammerCollector(100);
      toast('Achievement Unlocked: Hammer Collector! 🔨');
    }

    // Update Discord presence
    await achievements.updateGameplayPresence(
      'Collecting Hammers',
      `${newCount}/100`
    );
  };

  const handleLevelComplete = async () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    if (elapsedSeconds < 30) {
      await achievements.unlockSpeedrun('Level 1');
      toast('Achievement Unlocked: Speed Demon! ⚡');
    }

    await achievements.unlockLevelComplete('Level 1');
    toast('Level Complete! ⭐');
  };

  return (
    <div>
      {/* Game content */}
    </div>
  );
}
```

## Resources

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Steam Achievements Documentation](https://partner.steamgames.com/doc/features/achievements)
- [Discord RPC Guide](https://discord.com/developers/docs/activities/rpc)

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review example code in `useGameAchievements.ts`
3. Check browser console for error messages
4. Verify Electron IPC communication in DevTools
