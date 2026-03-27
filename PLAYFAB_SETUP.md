# PlayFab Online Multiplayer Setup

This game now supports **online multiplayer** powered by PlayFab, Microsoft's Backend-as-a-Service platform!

## What is PlayFab?

PlayFab provides:
- ✅ Cloud-based player management
- ✅ Real-time multiplayer synchronization
- ✅ Player data persistence
- ✅ Leaderboards & achievements
- ✅ Cross-platform support

## Setup Instructions

### 1. Create a PlayFab Account
- Go to [PlayFab Studio](https://playfab.com)
- Sign up for a free account (free tier is generous!)
- Create a studio and new title

### 2. Get Your Title ID
- In PlayFab Studio, go to **Settings** → **API Features**
- Copy your **Title ID** (looks like: `12ABC`)

### 3. Configure Environment Variable
Create a `.env.local` file in the project root:

```
VITE_PLAYFAB_TITLE_ID=your_playfab_title_id
VITE_MULTIPLAYER_MODE=online
```

### 4. Update Authentication (Optional but Recommended)

PlayFab supports multiple authentication methods:
- **Custom ID** (current - easiest for testing)
- **Email/Password** (requires PlayFab setup)
- **Steam** (if you have Steam integration)
- **Discord OAuth** (via PlayFab)

### 5. Production Setup

For production, you'll want to:

1. **Enable Player Data Security**
   - In PlayFab Studio: Settings → Title Settings
   - Enable "Require Content-Type header"

2. **Set Up Leaderboards**
   - Player Devices → Leaderboards
   - Create "BestTime" leaderboard

3. **Enable Cloud Saved Data**
   - Player Data → Player Data
   - Store profiles and game progress there

4. **Configure Player Segments**
   - For matchmaking and analytics

## Features Implemented

### 1. **Local Multiplayer** (No Configuration Needed)
- Works offline
- Perfect for development
- Share room codes with friends on same network

### 2. **Online Multiplayer** (PlayFab Required)
- Global player matchmaking
- Persistent game rooms
- Real-time player synchronization
- Cross-browser support

## Choosing a Mode

When you create a lobby, you'll be asked to choose:

```
┌─────────────────────────────────┐
│   LOCAL/ONLINE MULTIPLAYER      │
└─────────────────────────────────┘

LOCAL PLAY          →  Play with friends locally
- No server         →  Share room code
- No config         →  Fast & responsive

ONLINE PLAY         →  Play globally
- PlayFab backend   →  Cloud synchronized
- Browser-based     →  Persistent servers
```

## How Online Multiplayer Works

1. **Join Online Lobby**
   - Choose "ONLINE PLAY" mode
   - Create public/private room
   - Share room code or browse public rooms

2. **Room Synchronization**
   - Room data stored in PlayFab
   - Player positions synced every 100ms
   - State updates via localStorage polling

3. **Game Play**
   - All players see real-time position updates
   - Win/lose conditions synchronized
   - Leaderboards updated automatically

## Technical Details

### Architecture

```
┌─────────────────────────────────┐
│   React Frontend                 │
│ (Clerk Auth + Game UI)          │
└──────────────┬──────────────────┘
               │
       ┌───────▼────────┐
       │  Local Storage  │
       │ (Room Data)     │
       └───────┬────────┘
               │
       ┌───────▼──────────┐
       │  PlayFab SDK      │
       │ (Authentication)  │
       └───────┬──────────┘
               │
       ┌───────▼──────────────┐
       │ PlayFab Backend       │
       │ (Cloud Storage)       │
       └──────────────────────┘
```

### File Structure

```
src/
├── integrations/
│   └── playfab/
│       └── client.ts          # PlayFab config
├── hooks/
│   ├── usePlayFabAuth.ts      # PlayFab auth hook
│   ├── useOnlineMultiplayer.ts # Online multiplayer logic
│   └── useLocalMultiplayer.ts  # Local multiplayer logic
└── pages/
    ├── LobbyV2.tsx            # Mode selection + lobby
    └── PlayMultiplayer.tsx    # Game client (handles both modes)
```

## Environment Variables

```env
# Required for online multiplayer
VITE_PLAYFAB_TITLE_ID=your_title_id

# Optional - defaults to 'local'
VITE_MULTIPLAYER_MODE=online
```

## Troubleshooting

### "Title ID not found"
- ✓ Check you copied the correct ID from PlayFab
- ✓ Ensure `.env.local` is in project root
- ✓ Restart dev server after changing `.env.local`

### "Failed to authenticate"
- ✓ Check internet connection
- ✓ Verify PlayFab Title ID is valid
- ✓ Check browser console for detailed error

### "Room not found"
- ✓ Room code is case-sensitive (automatically uppercase)
- ✓ Rooms expire after 1 hour of inactivity
- ✓ Try refreshing the page

### "Can't see other players"
- ✓ Check polling is working (100ms intervals)
- ✓ Verify both players in same room
- ✓ Check browser network tab for localStorage API

## Migration from Local to Online

To upgrade from local to online:

1. Get PlayFab Title ID
2. Add to `.env.local`
3. No code changes needed!
4. Users will see mode selection on lobby

## Next Steps

1. ✅ Set up PlayFab account (free tier)
2. ✅ Add Title ID to `.env.local`
3. ✅ Test online multiplayer
4. ✅ Configure leaderboards (optional)
5. ✅ Deploy to production

## Support

For PlayFab help:
- [PlayFab Documentation](https://docs.microsoft.com/en-us/gaming/playfab/)
- [PlayFab Discord](https://discord.gg/v2xySr2T)

---

**Status**: ✅ Ready for testing with local mode, awaiting Title ID for online mode!
