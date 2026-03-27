# Quick Start - Steam Achievements & Discord Presence

## ⚡ 5-Minute Setup

### 1. Discord Setup (Required for Discord Presence)

```bash
# 1. Go to: https://discord.com/developers/applications
# 2. Click "New Application" → name it "Architect"
# 3. Go to "General Information" → copy your Application ID
# 4. Paste into: electron/discord.js (line 3)
#    const clientId = 'PASTE_HERE';
# 5. Go to "Rich Presence" → Upload image:
#    Name: architect_logo
#    File: Any image you want to display in Discord
```

### 2. Install & Build

```bash
# Install discord-rpc dependency
npm install

# Start dev server
npm run dev

# Test achievements panel (should appear bottom-right in Electron)
# Run Electron build:
npm run dist:win
```

## 🚀 Using Achievements

### Basic Example

```typescript
import { useGameAchievements } from '@/hooks/useGameAchievements';

function Play() {
  const { unlockLevelComplete, unlockSpeedrun } = useGameAchievements();
  const [startTime] = useState(Date.now());

  const finishLevel = async () => {
    const seconds = (Date.now() - startTime) / 1000;
    
    // Check for speedrun (< 30 seconds)
    if (seconds < 30) {
      await unlockSpeedrun('My Level');
    }

    // Always unlock completion
    await unlockLevelComplete('My Level');
  };

  return <button onClick={finishLevel}>Finish</button>;
}
```

## 💬 Discord Presence Control

```typescript
import { useDiscordPresence } from '@/hooks/useDiscordPresence';

function MyComponent() {
  const { setPresence } = useDiscordPresence();

  // Update when entering level
  useEffect(() => {
    setPresence({
      state: 'Playing Level 1',
      details: '5/10 hammers collected',
    });
  }, []);
}
```

## 🏆 Available Achievements

| Icon | ID | Name | How to Unlock |
|------|----|----|---|
| 🦘 | FIRST_JUMP | First Jump | Jump once |
| ⭐ | LEVEL_COMPLETE | Level Master | Complete any level |
| ⚡ | SPEEDRUN | Speed Demon | Finish level in <30 sec |
| 💧 | WATER_MASTER | Water Master | Use water buoyancy |
| 🤝 | MULTIPLAYER_WIN | Team Player | Win multiplayer session |
| 🔨 | COLLECT_100_HAMMERS | Hammer Collector | Collect 100 hammers |
| 🎯 | REACH_LEVEL_10 | Progress Master | Reach level 10 |
| 🎨 | VISIT_EDITOR | Creator | Create level in editor |

## 📍 Achievements Panel

- **Location:** Bottom-right corner (Electron only)
- **Icon:** 🏆 Trophy
- **Click to open:** See all achievements, progress, unlock dates
- **Unlocked badge:** Shows count above icon

## 🔧 Integration Checklist

- [ ] Discord App ID set in `electron/discord.js`
- [ ] `npm install` completed
- [ ] Achievement triggers added to game components
- [ ] Discord presence updates implemented
- [ ] Run in Electron build to test
- [ ] Discord running while testing

## 📁 File Locations

```
electron/
├── steam.js          ← Achievement definitions
├── discord.js        ← Discord setup (edit here!)
└── main.cjs          ← Already configured

src/
├── hooks/
│   ├── useSteamAchievements.ts
│   ├── useDiscordPresence.ts     ← Use these in components
│   └── useGameAchievements.ts
└── components/
    └── AchievementsPanel.tsx     ← Auto-renders in Electron
```

## ✅ How to Test

### Test Achievements Panel
1. Build: `npm run dist:win`
2. Launch `release/Architect Setup.exe`
3. Look for 🏆 icon bottom-right
4. Click to see all achievements

### Test Discord Presence
1. Launch game while Discord runs
2. Check "Playing" status in Discord
3. Should say "Architect - Player's Playground"

### Manually Unlock Achievement (Console)
```javascript
// In Electron DevTools console:
window.electronAPI.steam.unlockAchievement('FIRST_JUMP')
window.electronAPI.steam.getAllAchievements()
```

## 🎯 Common Patterns

### When Player Completes Level
```typescript
const { unlockLevelComplete, unlockSpeedrun } = useGameAchievements();
const levelName = "Level 1";
const elapsed = calculateElapsedSeconds();

if (elapsed < 30) await unlockSpeedrun(levelName);
await unlockLevelComplete(levelName);
```

### When Collecting Items
```typescript
const { unlockHammerCollector } = useGameAchievements();
const count = player.hammers + 1;
if (count === 100) await unlockHammerCollector(100);
```

### When Entering Game Area
```typescript
const { updateGameplayPresence } = useGameAchievements();
await updateGameplayPresence(
  'Level 1 - Water Temple',
  'Collecting Hammers'
);
```

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Achievements don't appear | Run in Electron build, not web |
| Discord not connecting | Check clientId is correct |
| Achievements don't save | Check file permissions on `achievements.json` |
| No DevTools in Electron | Edit `isDev` check in main.cjs |

## 📖 Full Docs

See **STEAM_DISCORD_SETUP.md** for:
- Complete API reference
- All parameters
- Advanced examples
- Best practices

---

**Status:** ✅ Ready to integrate  
**Installed:** discord-rpc  
**Pending:** Discord App ID configuration
