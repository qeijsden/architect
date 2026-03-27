// PlayFab CloudScript
// This file contains server-side functions that run on PlayFab
// Upload this file to PlayFab Dashboard > Automation > Cloud Script

/**
 * Publish a level to Title Data
 * Title Data can only be written by CloudScript or admin API
 */
handlers.PublishLevel = function (args, context) {
  try {
    var level = args.Level;
    
    if (!level || !level.id || !level.name) {
      return { success: false, error: "Invalid level data" };
    }
    
    // Get current published levels from Title Data
    var titleDataRequest = {
      Keys: ["PublishedLevels"]
    };
    
    var titleDataResult = server.GetTitleData(titleDataRequest);
    var levels = [];
    
    if (titleDataResult.Data && titleDataResult.Data.PublishedLevels) {
      try {
        levels = JSON.parse(titleDataResult.Data.PublishedLevels);
      } catch (e) {
        log.error("Failed to parse existing levels: " + e);
        levels = [];
      }
    }
    
    // Check if level already exists (update) or is new (add)
    var existingIndex = -1;
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].id === level.id) {
        existingIndex = i;
        break;
      }
    }
    
    // Add or update level
    if (existingIndex >= 0) {
      // Update existing level, preserve stats
      var existing = levels[existingIndex];
      level.plays = existing.plays || 0;
      level.likes = existing.likes || 0;
      level.completion_count = existing.completion_count || 0;
      levels[existingIndex] = level;
    } else {
      // Add new level
      level.plays = 0;
      level.likes = 0;
      level.completion_count = 0;
      levels.push(level);
    }
    
    // Write back to Title Data
    var setTitleDataRequest = {
      Key: "PublishedLevels",
      Value: JSON.stringify(levels)
    };
    
    var setResult = server.SetTitleData(setTitleDataRequest);
    
    if (setResult) {
      return { 
        success: true, 
        levelId: level.id,
        isUpdate: existingIndex >= 0,
        totalLevels: levels.length
      };
    } else {
      return { success: false, error: "Failed to write Title Data" };
    }
    
  } catch (error) {
    log.error("PublishLevel error: " + error);
    return { success: false, error: error.toString() };
  }
};

/**
 * Publish a feature request to Title Data
 */
handlers.PublishFeatureRequest = function (args, context) {
  try {
    var title = (args && args.Title) ? args.Title : null;
    var description = (args && args.Description) ? args.Description : '';
    var userId = (args && args.UserId) ? args.UserId : null;
    var userName = (args && args.UserName) ? args.UserName : 'Anonymous';

    if (!title) {
      return { success: false, error: 'Title is required' };
    }

    var titleDataRequest = { Keys: ['FeatureRequests'] };
    var titleDataResult = server.GetTitleData(titleDataRequest);
    var requests = [];

    if (titleDataResult.Data && titleDataResult.Data.FeatureRequests) {
      try {
        requests = JSON.parse(titleDataResult.Data.FeatureRequests);
      } catch (e) {
        log.error('Failed to parse existing feature requests: ' + e);
        requests = [];
      }
    }

    var requestId = 'fr_' + new Date().getTime() + '_' + Math.floor(Math.random() * 100000);
    var newRequest = {
      id: requestId,
      title: title,
      description: description,
      user_id: userId,
      user_name: userName,
      createdAt: new Date().toISOString()
    };

    requests.push(newRequest);

    var setTitleDataRequest = {
      Key: 'FeatureRequests',
      Value: JSON.stringify(requests)
    };

    var setResult = server.SetTitleData(setTitleDataRequest);

    if (setResult) {
      return { success: true, requestId: requestId, totalRequests: requests.length };
    }

    return { success: false, error: 'Failed to write Title Data' };
  } catch (error) {
    log.error('PublishFeatureRequest error: ' + error);
    return { success: false, error: error.toString() };
  }
};

/**
 * Get published levels from Title Data
 */
handlers.GetPublishedLevels = function (args, context) {
  try {
    var titleDataRequest = {
      Keys: ["PublishedLevels"]
    };
    
    var titleDataResult = server.GetTitleData(titleDataRequest);
    
    if (titleDataResult.Data && titleDataResult.Data.PublishedLevels) {
      var levels = JSON.parse(titleDataResult.Data.PublishedLevels);
      
      // Apply filters if provided
      if (args.Validated !== undefined) {
        levels = levels.filter(function(l) {
          return l.validated === args.Validated;
        });
      }
      
      if (args.AuthorId) {
        levels = levels.filter(function(l) {
          return l.author_id === args.AuthorId;
        });
      }
      
      // Sort
      if (args.OrderBy === "plays") {
        levels.sort(function(a, b) { return (b.plays || 0) - (a.plays || 0); });
      } else if (args.OrderBy === "likes") {
        levels.sort(function(a, b) { return (b.likes || 0) - (a.likes || 0); });
      } else {
        // Default: newest first
        levels.sort(function(a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      }
      
      // Limit
      if (args.Limit && args.Limit > 0) {
        levels = levels.slice(0, args.Limit);
      }
      
      return { 
        success: true,
        levels: levels,
        count: levels.length
      };
    }
    
    return { success: true, levels: [], count: 0 };
    
  } catch (error) {
    log.error("GetPublishedLevels error: " + error);
    return { success: false, error: error.toString() };
  }
};

/**
 * Increment level play count
 */
handlers.IncrementLevelPlays = function (args, context) {
  try {
    var levelId = args.LevelId;
    
    if (!levelId) {
      return { success: false, error: "LevelId required" };
    }
    
    var titleDataRequest = {
      Keys: ["PublishedLevels"]
    };
    
    var titleDataResult = server.GetTitleData(titleDataRequest);
    
    if (titleDataResult.Data && titleDataResult.Data.PublishedLevels) {
      var levels = JSON.parse(titleDataResult.Data.PublishedLevels);
      
      for (var i = 0; i < levels.length; i++) {
        if (levels[i].id === levelId) {
          levels[i].plays = (levels[i].plays || 0) + 1;
          
          var setTitleDataRequest = {
            Key: "PublishedLevels",
            Value: JSON.stringify(levels)
          };
          
          server.SetTitleData(setTitleDataRequest);
          
          return { 
            success: true, 
            plays: levels[i].plays
          };
        }
      }
      
      return { success: false, error: "Level not found" };
    }
    
    return { success: false, error: "No levels data" };
    
  } catch (error) {
    log.error("IncrementLevelPlays error: " + error);
    return { success: false, error: error.toString() };
  }
};

/**
 * Increment level completion count
 */
handlers.IncrementLevelCompletions = function (args, context) {
  try {
    var levelId = args.LevelId;
    
    if (!levelId) {
      return { success: false, error: "LevelId required" };
    }
    
    var titleDataRequest = {
      Keys: ["PublishedLevels"]
    };
    
    var titleDataResult = server.GetTitleData(titleDataRequest);
    
    if (titleDataResult.Data && titleDataResult.Data.PublishedLevels) {
      var levels = JSON.parse(titleDataResult.Data.PublishedLevels);
      
      for (var i = 0; i < levels.length; i++) {
        if (levels[i].id === levelId) {
          levels[i].completion_count = (levels[i].completion_count || 0) + 1;
          
          var setTitleDataRequest = {
            Key: "PublishedLevels",
            Value: JSON.stringify(levels)
          };
          
          server.SetTitleData(setTitleDataRequest);
          
          return { 
            success: true, 
            completions: levels[i].completion_count
          };
        }
      }
      
      return { success: false, error: "Level not found" };
    }
    
    return { success: false, error: "No levels data" };
    
  } catch (error) {
    log.error("IncrementLevelCompletions error: " + error);
    return { success: false, error: error.toString() };
  }
};
