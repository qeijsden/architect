# PlayFab Setup Instructions

## CloudScript Setup

The game uses PlayFab Title Data to store published levels. CloudScript is required to write to Title Data from the client.

### Upload CloudScript to PlayFab:

1. Go to your PlayFab Dashboard: https://developer.playfab.com/
2. Select your title (ID: 1FC26D)
3. Navigate to **Automation** > **Cloud Script** > **Revisions**
4. Click **Upload New Revision**
5. Upload the file: `playfab/CloudScript.js`
6. Click **Save as Revision**
7. The CloudScript functions will now be available

### CloudScript Functions:

- **PublishLevel**: Adds or updates a level in Title Data
- **GetPublishedLevels**: Retrieves published levels with filtering and sorting
- **IncrementLevelPlays**: Increments play count for a level
- **IncrementLevelCompletions**: Increments completion count for a level

### Initialize Title Data with Sample Levels:

1. Go to your PlayFab Dashboard: https://developer.playfab.com/
2. Select your title (ID: 1FC26D)
3. Navigate to **Engage** > **Title Data** (or **Content** > **Title Data** depending on your dashboard version)
4. Click **New Title Data** button
5. Enter **Key**: `PublishedLevels`
6. Open the file `playfab/initial-title-data.json` and copy the JSON array (just the array part, not the object wrapper)
7. Paste into the **Value** field
8. Click **Save Title Data**

**Note:** Only paste the array `[...]` contents, not the outer object with `{"PublishedLevels": ...}`

This will create the initial sample levels (Tutorial, Getting Started, Platformer Fun).

### Title Data Structure:

Levels are stored in Title Data under the key `PublishedLevels` as a JSON array:

```json
[
  {
    "id": "level_123",
    "name": "My Level",
    "author": "PlayerName",
    "author_id": "user_abc123",
    "blocks": [...],
    "validated": true,
    "plays": 42,
    "likes": 10,
    "completion_count": 8,
    "createdAt": "2026-02-12T10:30:00Z",
    "allowImport": true
  }
]
```

### Testing:

1. After uploading CloudScript, try publishing a level from the editor
2. Check PlayFab Dashboard > **Economy** > **Title Data** to see the `PublishedLevels` key
3. Levels should load automatically when browsing levels in the game

### Troubleshooting:

- If levels don't appear, check the browser console for errors
- Verify CloudScript is uploaded and saved
- Check that Title Data key `PublishedLevels` exists in PlayFab Dashboard
- The game will fall back to localStorage if PlayFab is unavailable
