import { useSteamAchievements } from '@/hooks/useSteamAchievements';
import { useDiscordPresence } from '@/hooks/useDiscordPresence';

/**
 * Achievement trigger utilities
 * Call these from game logic to unlock achievements and update Discord presence
 */

export function useGameAchievements() {
  const { unlockAchievement } = useSteamAchievements();
  const { setPresence } = useDiscordPresence();

  return {
    // Level completion
    unlockLevelComplete: async (levelName: string) => {
      await unlockAchievement('LEVEL_COMPLETE');
      await setPresence({
        state: 'Completed a level',
        details: `Finished: ${levelName}`,
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
      });
    },

    // Speedrun achievement
    unlockSpeedrun: async (levelName: string) => {
      await unlockAchievement('SPEEDRUN');
      await setPresence({
        state: 'Speed Demon!',
        details: `Speedrun: ${levelName} (< 30 sec)`,
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
      });
    },

    // First jump
    unlockFirstJump: async () => {
      await unlockAchievement('FIRST_JUMP');
    },

    // Water master
    unlockWaterMaster: async () => {
      await unlockAchievement('WATER_MASTER');
      await setPresence({
        state: 'Mastering water physics',
        details: 'Using buoyancy mechanics',
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
      });
    },

    // Multiplayer win
    unlockMultiplayerWin: async (playerCount: number) => {
      await unlockAchievement('MULTIPLAYER_WIN');
      await setPresence({
        state: 'Won multiplayer session',
        details: `Playing with ${playerCount} players`,
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
        partySize: playerCount,
      });
    },

    // Hammer collector
    unlockHammerCollector: async (count: number) => {
      if (count >= 100) {
        await unlockAchievement('COLLECT_100_HAMMERS');
        await setPresence({
          state: 'Hammer Master',
          details: `Collected ${count} hammers`,
          largeImageKey: 'architect_logo',
          largeImageText: 'Architect - Player\'s Playground',
        });
      }
    },

    // Progress milestone
    unlockProgressMilestone: async (levelNumber: number) => {
      if (levelNumber >= 10) {
        await unlockAchievement('REACH_LEVEL_10');
        await setPresence({
          state: 'Progress Master',
          details: `Reached level ${levelNumber}`,
          largeImageKey: 'architect_logo',
          largeImageText: 'Architect - Player\'s Playground',
        });
      }
    },

    // Editor/Creator
    unlockCreator: async (levelName: string) => {
      await unlockAchievement('VISIT_EDITOR');
      await setPresence({
        state: 'Creating custom levels',
        details: `Designed: ${levelName}`,
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
      });
    },

    // Update presence for general gameplay
    updateGameplayPresence: async (activity: string, details?: string) => {
      await setPresence({
        state: activity,
        details: details || 'Playing Architect',
        largeImageKey: 'architect_logo',
        largeImageText: 'Architect - Player\'s Playground',
      });
    },
  };
}

/**
 * Example usage in game components:
 *
 * function Play() {
 *   const { unlockLevelComplete, unlockSpeedrun } = useGameAchievements();
 *   const [startTime] = useState(Date.now());
 *
 *   const handleLevelComplete = async () => {
 *     const elapsedSeconds = (Date.now() - startTime) / 1000;
 *
 *     // Check for speedrun
 *     if (elapsedSeconds < 30) {
 *       await unlockSpeedrun('Level 1');
 *     }
 *
 *     // Always unlock level complete
 *     await unlockLevelComplete('Level 1');
 *   };
 *
 *   // ... rest of component
 * }
 */
