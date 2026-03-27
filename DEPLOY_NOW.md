# 🚀 Quick Deployment Guide - Fix Your Multi-User Features

## What I Just Fixed

✅ **Friend Requests** - Now uses PlayFab Friends API (should work immediately)  
✅ **Lobby Joining** - Now uses CloudScript to find rooms by code  
✅ **Level Sharing** - Now publishes to CloudScript for global access  

## ⚡ Deploy CloudScript in 2 Minutes

### Step 1: Upload CloudScript to PlayFab

1. **Open PlayFab Dashboard**: https://developer.playfab.com/
2. **Navigate to Your Title**: "Architect" or Title ID `1FC26D`
3. **Go to**: Automation → CloudScript → **API (Legacy)**
4. **Click** "Upload JSON"
5. **Paste this**:

```json
{
  "JavaScriptRevisionNumber":1,
  "JavaScriptFileName":"cloudscript.js",
  "JavaScriptFileBlob":"<PASTE_CONTENT_HERE>"
}
```

**OR (Easier)**:

1. Copy the **entire contents** of `cloudscript.js` (in your project root)
2. In PlayFab Dashboard → CloudScript → **Create New Revision**
3. **Paste** the cloudscript.js content
4. Click **Save and Deploy**

### Step 2: Verify Deployment

1. In CloudScript page, you should see:
   - `CreateLobby`
   - `GetActiveLobbies`
   - `FindLobbyByCode`
   - `JoinLobby`
   - `PublishLevel`
   - `GetPublishedLevels`

2. Status should show: **✅ Live**

### Step 3: Test It Works

#### Test Lobby Joining:
1. **User A** (You):
   - Go to Browse → Pick level → Multiplayer → Online
   - Create Private Lobby
   - **Copy the room code** (e.g., "ABC123")

2. **User B** (Friend/Second Browser):
   - Go to Browse → Multiplayer → Online
   - Click "Join with Code"
   - Enter: "ABC123"
   - **Should join successfully! 🎉**

#### Test Level Sharing:
1. **User A**: Create and publish a level
2. Check console: Should see "Level saved to PlayFab cloud via CloudScript"
3. **User B**: Go to Browse page
4. **Should see User A's level! 🎉**

#### Test Friend Requests:
1. **User A**: Go to Friends → Add Friend → Enter User B's display name
2. **User B**: Go to Friends tab
3. **Should see pending request! 🎉**

---

## 🐛 Troubleshooting

### "CloudScript execution failed"
- **Cause**: CloudScript not deployed yet
- **Fix**: Follow Step 1 above

### "Room code not found"
- **Cause**: CloudScript not deployed OR room expired
- **Fix**: Deploy CloudScript, create new room

### "User not found" (Friends)
- **Cause**: That user hasn't logged in with PlayFab yet
- **Fix**: Make sure both users have logged into the game at least once

### "PlayFab SDK not initialized"
- **Cause**: Not logged in
- **Fix**: Log in with Clerk first (auth page)

---

## 📊 How It Works Now

### Before (Broken):
```
User A creates lobby → saved to User A's localStorage
User B tries to join → looks in User B's localStorage ❌
Result: "Room not found"
```

### After (Fixed):
```
User A creates lobby → CloudScript saves to Title Data (global)
User B tries to join → CloudScript finds in Title Data ✓
Result: Successfully joined! 🎉
```

---

## 🎯 What Works Right Now

| Feature | Status | Notes |
|---------|--------|-------|
| Friend Requests | ✅ **Working** | Uses PlayFab API directly |
| Create Lobby | ⚠️ **Pending** | Works after CloudScript deployed |
| Join Lobby by Code | ⚠️ **Pending** | Works after CloudScript deployed |
| Publish Level | ⚠️ **Pending** | Works after CloudScript deployed |
| Browse Shared Levels | ⚠️ **Pending** | Works after CloudScript deployed |

---

## ⏱️ Time Estimate

- **CloudScript Deployment**: 2 minutes
- **First Test**: 1 minute
- **Total**: **3 minutes to full functionality**

---

## 🆘 Still Having Issues?

1. **Open Browser Console** (F12) and share any error messages
2. **Check PlayFab Dashboard** → Monitoring → CloudScript Logs
3. **Verify** CloudScript status shows "Live"

---

## Next Steps

1. ✅ Deploy CloudScript now (2 minutes)
2. ✅ Test with a friend
3. 🎉 Enjoy working multiplayer!
