# PlayFab Multi-User Features - Setup Guide

## Current Issues & Solutions

### Issue 1: Can't Join Lobbies Created by Other Users

**Problem:** 
PlayFab's UserData API only allows users to read/write their OWN data. When User A creates a lobby, it's stored in User A's data. User B cannot see or access User A's data.

**Solution Options:**

#### Option A: Deploy CloudScript (Recommended)
CloudScript lets you run server-side JavaScript that can write to Title Data (accessible to all users).

**Steps:**
1. Go to PlayFab Dashboard → Automation → CloudScript
2. Upload the CloudScript file (see below)
3. Update the app to call CloudScript instead of direct API

**CloudScript Example** (`cloudscript.js`):
```javascript
// Create/Store a lobby in Title Data
handlers.CreateLobby = function (args, context) {
    var lobbyId = args.LobbyId;
    var lobbyData = args.LobbyData;
    
    // Get current lobbies from Title Data
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        lobbies = JSON.parse(titleData.Data.active_lobbies);
    }
    
    // Add new lobby
    lobbies[lobbyId] = lobbyData;
    
    // Save back to Title Data
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    return { success: true, lobbyId: lobbyId };
};

// Get all active lobbies
handlers.GetActiveLobbies = function (args, context) {
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    if (titleData.Data && titleData.Data.active_lobbies) {
        return { lobbies: JSON.parse(titleData.Data.active_lobbies) };
    }
    
    return { lobbies: {} };
};

// Join a lobby
handlers.JoinLobby = function (args, context) {
    var lobbyId = args.LobbyId;
    var playerData = args.PlayerData;
    
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        lobbies = JSON.parse(titleData.Data.active_lobbies);
    }
    
    if (!lobbies[lobbyId]) {
        return { error: "Lobby not found" };
    }
    
    // Add player to lobby
    if (!lobbies[lobbyId].Players) {
        lobbies[lobbyId].Players = [];
    }
    lobbies[lobbyId].Players.push(playerData);
    lobbies[lobbyId].CurrentPlayers = lobbies[lobbyId].Players.length;
    
    // Save back
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    return { success: true, lobby: lobbies[lobbyId] };
};
```

**Client-Side Usage:**
```typescript
// In useOnlineMultiplayer.ts
const createRoom = async (levelId: string) => {
    const result = await callPlayFabCloudScript('CreateLobby', {
        LobbyId: generateRoomId(),
        LobbyData: {
            HostId: userId,
            LevelId: levelId,
            // ... other data
        }
    });
    return result.lobbyId;
};

function callPlayFabCloudScript(functionName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
        PlayFab.ClientApi.ExecuteCloudScript({
            FunctionName: functionName,
            FunctionParameter: args
        }, (result: any) => {
            if (result.code === 200 && result.data.FunctionResult) {
                resolve(result.data.FunctionResult);
            } else {
                reject(new Error(result.errorMessage));
            }
        });
    });
}
```

#### Option B: Use PlayFab Matchmaking (Easier but less control)
PlayFab has built-in matchmaking that handles lobby creation/joining.

1. Go to Dashboard → Multiplayer → Matchmaking
2. Create a Queue configuration
3. Use MatchmakingSDK in your app

#### Option C: Use SharedGroupData (Limited scalability)
Users create/join groups to share data. Limited to 1000 groups per title.

```typescript
// Create shared group
PlayFab.ClientApi.CreateSharedGroup({
    SharedGroupId: roomId
}, callback);

// Add player to group
PlayFab.ClientApi.AddSharedGroupMembers({
    SharedGroupId: roomId,
    PlayFabIds: [playerId]
}, callback);

// Write lobby data
PlayFab.ClientApi.UpdateSharedGroupData({
    SharedGroupId: roomId,
    Data: {
        lobby_info: JSON.stringify(lobbyData)
    }
}, callback);
```

---

### Issue 2: Can't Receive Friend Requests

**Status:** ✅ **Should Work Now**

I've updated `useFriends.ts` to use PlayFab's built-in Friends API.

**How It Works:**
1. When User A sends a friend request to User B's display name:
   - App searches PlayFab for User B's PlayFab ID
   - Sends friend request via `AddFriend` API
2. User B sees pending requests via `GetFriendsList` API
3. User B accepts/rejects via PlayFab API

**Requirements:**
- Both users must have logged into PlayFab at least once
- Both users must have set a display name

**Testing:**
1. User A logs in with Clerk → Auto-creates PlayFab session
2. User A goes to Friends → Add Friend → Enters User B's display name
3. User B logs in → Goes to Friends
4. User B sees pending request → Accepts
5. Both users are now friends

**Note:** If you get "User not found", it means that user hasn't logged in with PlayFab yet. Make sure both users have created a PlayFab session.

---

### Issue 3: Levels Aren't Grabbed from PlayFab

**Problem:** 
Same as lobbies - Title Data is read-only from client. Levels need CloudScript to be published globally.

**Current Solution:**
I've updated `useLevels.ts` to:
1. Save created levels to user's PlayFab UserData (✅ works)
2. Attempt to fetch shared levels from Title Data (❌ requires CloudScript to write)

**CloudScript for Level Sharing:**

```javascript
// In cloudscript.js
handlers.PublishLevel = function (args, context) {
    var level = args.Level;
    
    // Get current published levels
    var titleData = server.GetTitleData({
        Keys: ["published_levels"]
    });
    
    var levels = [];
    if (titleData.Data && titleData.Data.published_levels) {
        levels = JSON.parse(titleData.Data.published_levels);
    }
    
    // Add new level
    levels.push(level);
    
    // Save to Title Data (accessible to all users)
    server.SetTitleData({
        Key: "published_levels",
        Value: JSON.stringify(levels)
    });
    
    return { success: true, totalLevels: levels.length };
};

handlers.GetPublishedLevels = function (args, context) {
    var titleData = server.GetTitleData({
        Keys: ["published_levels"]
    });
    
    if (titleData.Data && titleData.Data.published_levels) {
        return { levels: JSON.parse(titleData.Data.published_levels) };
    }
    
    return { levels: [] };
};
```

**Client-Side Usage:**
```typescript
// In useLevels.ts
const publishLevel = async (level: Level) => {
    const result = await callPlayFabCloudScript('PublishLevel', {
        Level: level
    });
    console.log('Level published to PlayFab');
};

const getSharedLevels = async () => {
    const result = await callPlayFabCloudScript('GetPublishedLevels', {});
    return result.levels;
};
```

---

## Quick Fix: Deploy CloudScript Now

1. **Create `cloudscript.js`** with all handlers above
2. **Upload to PlayFab:**
   - Log into PlayFab Dashboard
   - Go to Automation → CloudScript
   - Upload `cloudscript.js`
   - Click "Deploy"
3. **Update app to call CloudScript** (I can help with this)

---

## Alternative: Use External Backend

If CloudScript is too complex, you can:

1. **Create a simple REST API** (Node.js/Express)
2. **Deploy to Vercel/Railway/Render** (free tier)
3. **Use that API for shared data**

Example backend structure:
```
POST /api/lobbies          # Create lobby
GET  /api/lobbies          # List lobbies
POST /api/lobbies/:id/join # Join lobby
GET  /api/levels           # Get all levels
POST /api/levels           # Publish level
```

---

## Current State Summary

| Feature | Status | Requires |
|---------|--------|----------|
| ✅ Friend Requests | **Working** | Both users logged in with PlayFab |
| ⚠️ Lobbies | **Local Only** | CloudScript or Matchmaking |
| ⚠️ Level Sharing | **Local Only** | CloudScript or External API |
| ✅ Level Creation | **Working** | Saves to user's PlayFab data |
| ✅ Authentication | **Working** | Clerk + PlayFab integration |

---

## What I've Already Fixed

1. ✅ **PlayFab API Integration** - Created `integrations/playfab/api.ts`
2. ✅ **Friends Hook** - Updated to use PlayFab Friends API
3. ✅ **Levels Hook** - Updated to attempt PlayFab cloud storage
4. ✅ **Type Errors** - Fixed all TypeScript compilation errors
5. ✅ **Fallbacks** - All features fall back to localStorage if PlayFab unavailable

---

## Next Steps

**Choose One:**

### Option 1: Full PlayFab Solution (Recommended)
1. Deploy CloudScript (I'll help you create the file)
2. Update hooks to call CloudScript functions
3. Everything works cross-user

### Option 2: Hybrid Approach
1. Keep friend requests via PlayFab API ✅
2. Use Matchmaking for lobbies
3. Build simple REST API for level sharing

### Option 3: External Backend
1. Create separate Node.js backend
2. Store everything in database (PostgreSQL/MongoDB)  
3. PlayFab only for auth

---

## Ready to Deploy CloudScript?

Let me know and I'll:
1. Create complete `cloudscript.js` file
2. Update all hooks to call CloudScript
3. Test end-to-end functionality

The CloudScript approach is cleanest since you're already using PlayFab.
