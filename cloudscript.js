// PlayFab CloudScript for Architect Game
// Deploy this file in PlayFab Dashboard → Automation → CloudScript

// ==================== LOBBY MANAGEMENT ====================

/**
 * Create a new multiplayer lobby
 * Call from client: ExecuteCloudScript({ FunctionName: "CreateLobby", FunctionParameter: {...} })
 */
handlers.CreateLobby = function (args, context) {
    var lobbyId = args.LobbyId || generateId();
    var normalizedCode = args.GameCode ? String(args.GameCode).trim().toUpperCase() : args.GameCode;
    var lobbyData = {
        RoomId: lobbyId,
        HostId: args.HostId || currentPlayerId,
        HostName: args.HostName || "Host",
        LevelId: args.LevelId,
        GameCode: normalizedCode,
        IsPublic: args.IsPublic !== false,
        MaxPlayers: args.MaxPlayers || 4,
        CurrentPlayers: 1,
        Status: "waiting",
        CreatedAt: new Date().toISOString(),
        Players: args.Players || [{
            PlayerId: args.HostId || currentPlayerId,
            DisplayName: args.HostName || "Host",
            Color: args.Color || "#26c6da",
            IsReady: false,
            IsHost: true
        }]
    };
    
    // Get current active lobbies
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            lobbies = JSON.parse(titleData.Data.active_lobbies);
        } catch (e) {
            log.error("Failed to parse active_lobbies", e);
            lobbies = {};
        }
    }
    
    // Clean up old lobbies (older than 1 hour)
    var oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (var id in lobbies) {
        if (new Date(lobbies[id].CreatedAt).getTime() < oneHourAgo) {
            delete lobbies[id];
        }
    }
    
    // Add new lobby
    lobbies[lobbyId] = lobbyData;
    
    // Save to Title Data
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    log.info("Lobby created: " + lobbyId);
    return { 
        success: true, 
        lobby: lobbyData,
        lobbyId: lobbyId
    };
};

/**
 * Get all active lobbies
 */
handlers.GetActiveLobbies = function (args, context) {
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            var lobbies = JSON.parse(titleData.Data.active_lobbies);
            
            // Filter by public/private if requested
            if (args.PublicOnly) {
                var filtered = {};
                for (var id in lobbies) {
                    if (lobbies[id].IsPublic && lobbies[id].Status === "waiting") {
                        filtered[id] = lobbies[id];
                    }
                }
                return { lobbies: filtered };
            }
            
            return { lobbies: lobbies };
        } catch (e) {
            log.error("Failed to parse lobbies", e);
            return { lobbies: {} };
        }
    }
    
    return { lobbies: {} };
};

/**
 * Find lobby by room code
 */
handlers.FindLobbyByCode = function (args, context) {
    var code = String(args.Code || "").trim().toUpperCase();
    
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            var lobbies = JSON.parse(titleData.Data.active_lobbies);
            
            for (var id in lobbies) {
                var lobbyCode = String(lobbies[id].GameCode || "").trim().toUpperCase();
                if (lobbyCode === code) {
                    return { 
                        success: true,
                        lobby: lobbies[id]
                    };
                }
            }
        } catch (e) {
            log.error("Failed to search lobbies", e);
        }
    }
    
    return { 
        success: false,
        error: "Room code not found"
    };
};

/**
 * Join an existing lobby
 */
handlers.JoinLobby = function (args, context) {
    var lobbyId = args.LobbyId;
    var playerData = {
        PlayerId: args.PlayerId || currentPlayerId,
        DisplayName: args.DisplayName || "Player",
        Color: args.Color || "#26c6da",
        IsReady: false,
        IsHost: false
    };
    
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            lobbies = JSON.parse(titleData.Data.active_lobbies);
        } catch (e) {
            return { success: false, error: "Failed to load lobbies" };
        }
    }
    
    if (!lobbies[lobbyId]) {
        return { success: false, error: "Lobby not found" };
    }
    
    if (lobbies[lobbyId].Status !== "waiting") {
        return { success: false, error: "Game already in progress" };
    }
    
    if (lobbies[lobbyId].CurrentPlayers >= lobbies[lobbyId].MaxPlayers) {
        return { success: false, error: "Lobby is full" };
    }
    
    // Check if player already in lobby
    var players = lobbies[lobbyId].Players || [];
    for (var i = 0; i < players.length; i++) {
        if (players[i].PlayerId === playerData.PlayerId) {
            return { success: true, lobby: lobbies[lobbyId], message: "Already in lobby" };
        }
    }
    
    // Add player
    players.push(playerData);
    lobbies[lobbyId].Players = players;
    lobbies[lobbyId].CurrentPlayers = players.length;
    
    // Save
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    log.info("Player joined lobby: " + lobbyId);
    return { 
        success: true, 
        lobby: lobbies[lobbyId]
    };
};

/**
 * Update lobby (player ready status, game start, etc.)
 */
handlers.UpdateLobby = function (args, context) {
    var lobbyId = args.LobbyId;
    var updates = args.Updates;
    
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            lobbies = JSON.parse(titleData.Data.active_lobbies);
        } catch (e) {
            return { success: false, error: "Failed to load lobbies" };
        }
    }
    
    if (!lobbies[lobbyId]) {
        return { success: false, error: "Lobby not found" };
    }
    
    // Apply updates
    for (var key in updates) {
        lobbies[lobbyId][key] = updates[key];
    }
    
    // Save
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    return { 
        success: true,
        lobby: lobbies[lobbyId]
    };
};

/**
 * Update a single player's ready status
 */
handlers.SetPlayerReady = function (args, context) {
    var lobbyId = args.LobbyId;
    var playerId = args.PlayerId;
    var isReady = args.IsReady === true;

    if (!lobbyId || !playerId) {
        return { success: false, error: "Missing LobbyId or PlayerId" };
    }

    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });

    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            lobbies = JSON.parse(titleData.Data.active_lobbies);
        } catch (e) {
            return { success: false, error: "Failed to load lobbies" };
        }
    }

    if (!lobbies[lobbyId]) {
        return { success: false, error: "Lobby not found" };
    }

    var players = lobbies[lobbyId].Players || [];
    for (var i = 0; i < players.length; i++) {
        if (players[i].PlayerId === playerId) {
            players[i].IsReady = isReady;
        }
    }

    lobbies[lobbyId].Players = players;
    lobbies[lobbyId].CurrentPlayers = players.length;

    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });

    return { success: true, lobby: lobbies[lobbyId] };
};

/**
 * Leave/Delete lobby
 */
handlers.LeaveLobby = function (args, context) {
    var lobbyId = args.LobbyId;
    var playerId = args.PlayerId || currentPlayerId;
    
    var titleData = server.GetTitleData({
        Keys: ["active_lobbies"]
    });
    
    var lobbies = {};
    if (titleData.Data && titleData.Data.active_lobbies) {
        try {
            lobbies = JSON.parse(titleData.Data.active_lobbies);
        } catch (e) {
            return { success: false, error: "Failed to load lobbies" };
        }
    }
    
    if (!lobbies[lobbyId]) {
        return { success: true, message: "Lobby already gone" };
    }
    
    // If host leaves, delete lobby
    if (lobbies[lobbyId].HostId === playerId) {
        delete lobbies[lobbyId];
    } else {
        // Remove player from lobby
        var players = lobbies[lobbyId].Players || [];
        lobbies[lobbyId].Players = players.filter(function(p) {
            return p.PlayerId !== playerId;
        });
        lobbies[lobbyId].CurrentPlayers = lobbies[lobbyId].Players.length;
    }
    
    // Save
    server.SetTitleData({
        Key: "active_lobbies",
        Value: JSON.stringify(lobbies)
    });
    
    return { success: true };
};

// ==================== LEVEL MANAGEMENT ====================

/**
 * Publish a level to global catalog
 * Each level is stored as its own Title Data key for better scalability
 */
handlers.PublishLevel = function (args, context) {
    var level = args.Level;
    
    if (!level || !level.id) {
        return { success: false, error: "Invalid level data" };
    }
    
    // Add metadata
    level.publishedAt = new Date().toISOString();
    level.publishedBy = currentPlayerId;
    
    // Store level as individual title data key
    var levelKey = "level_" + level.id;
    server.SetTitleData({
        Key: levelKey,
        Value: JSON.stringify(level)
    });
    
    // Update level index for discovery
    var indexData = server.GetTitleData({
        Keys: ["level_index"]
    });
    
    var levelIndex = [];
    if (indexData.Data && indexData.Data.level_index) {
        try {
            levelIndex = JSON.parse(indexData.Data.level_index);
        } catch (e) {
            log.error("Failed to parse level index", e);
            levelIndex = [];
        }
    }
    
    // Add to index if not present
    var found = false;
    for (var i = 0; i < levelIndex.length; i++) {
        if (levelIndex[i].id === level.id) {
            levelIndex[i] = {
                id: level.id,
                name: level.name,
                author: level.author_name || "Unknown",
                publishedAt: level.publishedAt,
                publishedBy: level.publishedBy,
                plays: level.plays || 0,
                likes: level.likes || 0,
                validated: level.validated || false
            };
            found = true;
            break;
        }
    }
    
    if (!found) {
        levelIndex.push({
            id: level.id,
            name: level.name,
            author: level.author_name || "Unknown",
            publishedAt: level.publishedAt,
            publishedBy: level.publishedBy,
            plays: level.plays || 0,
            likes: level.likes || 0,
            validated: level.validated || false
        });
    }
    
    // Keep only last 1000 levels in index
    if (levelIndex.length > 1000) {
        levelIndex = levelIndex.slice(-1000);
    }
    
    server.SetTitleData({
        Key: "level_index",
        Value: JSON.stringify(levelIndex)
    });
    
    log.info("Level published: " + level.id);
    return { 
        success: true,
        levelId: level.id
    };
};

/**
 * Get all published levels from index
 */
handlers.GetPublishedLevels = function (args, context) {
    var indexData = server.GetTitleData({
        Keys: ["level_index"]
    });
    
    if (indexData.Data && indexData.Data.level_index) {
        try {
            var levelIndex = JSON.parse(indexData.Data.level_index);
            
            // Filter if requested
            if (args.Validated !== undefined) {
                levelIndex = levelIndex.filter(function(l) {
                    return l.validated === args.Validated;
                });
            }
            
            // Sort
            if (args.OrderBy === "plays") {
                levelIndex.sort(function(a, b) {
                    return (b.plays || 0) - (a.plays || 0);
                });
            } else if (args.OrderBy === "likes") {
                levelIndex.sort(function(a, b) {
                    return (b.likes || 0) - (a.likes || 0);
                });
            } else {
                // Sort by published date (newest first)
                levelIndex.sort(function(a, b) {
                    return new Date(b.publishedAt) - new Date(a.publishedAt);
                });
            }
            
            // Limit
            if (args.Limit) {
                levelIndex = levelIndex.slice(0, args.Limit);
            }
            
            // If full level data requested, fetch each level
            if (args.FullData) {
                var levels = [];
                for (var i = 0; i < levelIndex.length; i++) {
                    var levelKey = "level_" + levelIndex[i].id;
                    var levelData = server.GetTitleData({ Keys: [levelKey] });
                    if (levelData.Data && levelData.Data[levelKey]) {
                        try {
                            levels.push(JSON.parse(levelData.Data[levelKey]));
                        } catch (e) {
                            log.error("Failed to parse level: " + levelKey, e);
                        }
                    }
                }
                return { levels: levels };
            }
            
            return { levels: levelIndex };
        } catch (e) {
            log.error("Failed to parse level index", e);
            return { levels: [] };
        }
    }
    
    return { levels: [] };
};

/**
 * Update level stats (plays, likes)
 */
handlers.UpdateLevelStats = function (args, context) {
    var levelId = args.LevelId;
    var incrementPlays = args.IncrementPlays || 0;
    var incrementLikes = args.IncrementLikes || 0;
    
    if (!levelId) {
        return { success: false, error: "Missing LevelId" };
    }
    
    var levelKey = "level_" + levelId;
    var levelData = server.GetTitleData({
        Keys: [levelKey]
    });
    
    if (levelData.Data && levelData.Data[levelKey]) {
        try {
            var level = JSON.parse(levelData.Data[levelKey]);
            
            level.plays = (level.plays || 0) + incrementPlays;
            level.likes = (level.likes || 0) + incrementLikes;
            
            // Save updated level
            server.SetTitleData({
                Key: levelKey,
                Value: JSON.stringify(level)
            });
            
            // Update index
            var indexData = server.GetTitleData({ Keys: ["level_index"] });
            if (indexData.Data && indexData.Data.level_index) {
                try {
                    var levelIndex = JSON.parse(indexData.Data.level_index);
                    for (var i = 0; i < levelIndex.length; i++) {
                        if (levelIndex[i].id === levelId) {
                            levelIndex[i].plays = level.plays;
                            levelIndex[i].likes = level.likes;
                            server.SetTitleData({
                                Key: "level_index",
                                Value: JSON.stringify(levelIndex)
                            });
                            break;
                        }
                    }
                } catch (e) {
                    log.error("Failed to update level index", e);
                }
            }
            
            return { success: true, level: level };
        } catch (e) {
            log.error("Failed to update level stats", e);
        }
    }
    
    return { success: false, error: "Level not found" };
};

// ==================== FRIENDS MANAGEMENT ====================

function safeParseArray(value) {
    if (!value) return [];
    try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function getDisplayNameById(playFabId) {
    try {
        var account = server.GetAccountInfo({ PlayFabId: playFabId });
        if (account && account.AccountInfo && account.AccountInfo.TitleInfo) {
            return account.AccountInfo.TitleInfo.DisplayName || "Player";
        }
    } catch (e) {
        log.error("Failed to resolve display name", e);
    }
    return "Player";
}

handlers.SendFriendRequest = function (args, context) {
    var fromCustomId = args.FromCustomId; // Clerk user ID of sender
    var fromPlayFabId = currentPlayerId;
    var fromName = args.FromDisplayName || getDisplayNameById(fromPlayFabId);
    var toCustomId = args.ToCustomId; // Clerk user ID of recipient
    var color = args.Color || "#26c6da";

    if (!toCustomId || toCustomId.length < 5) {
        return { success: false, error: "Invalid Player ID" };
    }

    if (!fromCustomId || fromCustomId.length < 5) {
        return { success: false, error: "Invalid sender ID" };
    }

    if (toCustomId === fromCustomId) {
        return { success: false, error: "Cannot add yourself" };
    }

    // Store friend requests in Title Data indexed by recipient's CustomId
    var requestKey = "freq_" + toCustomId;
    var titleData = server.GetTitleData({ Keys: [requestKey] });
    
    var requests = [];
    if (titleData.Data && titleData.Data[requestKey]) {
        try {
            requests = JSON.parse(titleData.Data[requestKey]);
            if (!Array.isArray(requests)) requests = [];
        } catch (e) {
            requests = [];
        }
    }

    // Check for duplicate
    for (var i = 0; i < requests.length; i++) {
        if (requests[i].FromCustomId === fromCustomId) {
            return { success: false, error: "Request already sent" };
        }
    }

    requests.push({
        Id: "req_" + Date.now() + "_" + fromCustomId,
        FromCustomId: fromCustomId,
        FromPlayFabId: fromPlayFabId,
        FromDisplayName: fromName,
        Color: color,
        CreatedAt: new Date().toISOString()
    });

    server.SetTitleData({
        Key: requestKey,
        Value: JSON.stringify(requests)
    });

    return { success: true };
};

handlers.GetFriendRequests = function (args, context) {
    var myCustomId = args.CustomId; // Pass Clerk user ID from client
    if (!myCustomId) {
        return { success: false, error: "Missing CustomId" };
    }

    var requestKey = "freq_" + myCustomId;
    var titleData = server.GetTitleData({ Keys: [requestKey] });
    
    var requests = [];
    if (titleData.Data && titleData.Data[requestKey]) {
        try {
            requests = JSON.parse(titleData.Data[requestKey]);
            if (!Array.isArray(requests)) requests = [];
        } catch (e) {
            requests = [];
        }
    }
    
    return { success: true, requests: requests };
};

handlers.AcceptFriendRequest = function (args, context) {
    var myCustomId = args.CustomId; // My Clerk user ID
    var fromCustomId = args.FromCustomId; // Sender's Clerk user ID
    var fromPlayFabId = args.FromPlayFabId; // Sender's PlayFab ID
    var fromName = args.FromDisplayName;

    if (!myCustomId || !fromCustomId || !fromPlayFabId) {
        return { success: false, error: "Missing required IDs" };
    }

    var myName = args.ToDisplayName || getDisplayNameById(currentPlayerId);

    // Remove request from Title Data
    var requestKey = "freq_" + myCustomId;
    var titleData = server.GetTitleData({ Keys: [requestKey] });
    var requests = [];
    if (titleData.Data && titleData.Data[requestKey]) {
        try {
            requests = JSON.parse(titleData.Data[requestKey]);
            if (!Array.isArray(requests)) requests = [];
        } catch (e) {
            requests = [];
        }
    }

    requests = requests.filter(function (r) {
        return r.FromCustomId !== fromCustomId;
    });

    server.SetTitleData({
        Key: requestKey,
        Value: JSON.stringify(requests)
    });

    // Add to both users' friends lists in User Data
    var myData = server.GetUserData({ PlayFabId: currentPlayerId, Keys: ["friends"] });
    var myFriends = safeParseArray(myData && myData.Data && myData.Data.friends && myData.Data.friends.Value);

    var alreadyFriend = myFriends.some(function (f) { return f.PlayFabId === fromPlayFabId; });
    if (!alreadyFriend) {
        myFriends.push({
            PlayFabId: fromPlayFabId,
            CustomId: fromCustomId,
            DisplayName: fromName,
            Color: args.Color || "#26c6da"
        });
    }

    server.UpdateUserData({
        PlayFabId: currentPlayerId,
        Data: {
            friends: JSON.stringify(myFriends)
        }
    });

    var otherData = server.GetUserData({ PlayFabId: fromPlayFabId, Keys: ["friends"] });
    var otherFriends = safeParseArray(otherData && otherData.Data && otherData.Data.friends && otherData.Data.friends.Value);
    var alreadyInOther = otherFriends.some(function (f) { return f.PlayFabId === currentPlayerId; });
    if (!alreadyInOther) {
        otherFriends.push({
            PlayFabId: currentPlayerId,
            CustomId: myCustomId,
            DisplayName: myName,
            Color: args.Color || "#26c6da"
        });
    }

    server.UpdateUserData({
        PlayFabId: fromPlayFabId,
        Data: {
            friends: JSON.stringify(otherFriends)
        }
    });

    return { success: true };
};

handlers.RejectFriendRequest = function (args, context) {
    var myCustomId = args.CustomId; // My Clerk user ID
    var fromCustomId = args.FromCustomId; // Sender's Clerk user ID

    if (!myCustomId || !fromCustomId) {
        return { success: false, error: "Missing required IDs" };
    }

    var requestKey = "freq_" + myCustomId;
    var titleData = server.GetTitleData({ Keys: [requestKey] });
    var requests = [];
    if (titleData.Data && titleData.Data[requestKey]) {
        try {
            requests = JSON.parse(titleData.Data[requestKey]);
            if (!Array.isArray(requests)) requests = [];
        } catch (e) {
            requests = [];
        }
    }

    requests = requests.filter(function (r) {
        return r.FromCustomId !== fromCustomId;
    });

    server.SetTitleData({
        Key: requestKey,
        Value: JSON.stringify(requests)
    });

    return { success: true };
};

handlers.GetFriendsList = function (args, context) {
    var data = server.GetUserData({ PlayFabId: currentPlayerId, Keys: ["friends"] });
    var friends = safeParseArray(data && data.Data && data.Data.friends && data.Data.friends.Value);
    return { success: true, friends: friends };
};

handlers.RemoveFriend = function (args, context) {
    var friendId = args.FriendPlayFabId;
    if (!friendId) {
        return { success: false, error: "Missing FriendPlayFabId" };
    }

    var myData = server.GetUserData({ PlayFabId: currentPlayerId, Keys: ["friends"] });
    var myFriends = safeParseArray(myData && myData.Data && myData.Data.friends && myData.Data.friends.Value);
    myFriends = myFriends.filter(function (f) { return f.PlayFabId !== friendId; });

    server.UpdateUserData({
        PlayFabId: currentPlayerId,
        Data: {
            friends: JSON.stringify(myFriends)
        }
    });

    var otherData = server.GetUserData({ PlayFabId: friendId, Keys: ["friends"] });
    var otherFriends = safeParseArray(otherData && otherData.Data && otherData.Data.friends && otherData.Data.friends.Value);
    otherFriends = otherFriends.filter(function (f) { return f.PlayFabId !== currentPlayerId; });

    server.UpdateUserData({
        PlayFabId: friendId,
        Data: {
            friends: JSON.stringify(otherFriends)
        }
    });

    return { success: true };
};

// ==================== UTILITY FUNCTIONS ====================

function generateId() {
    return "id_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}
