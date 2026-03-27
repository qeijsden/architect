import { useState, useCallback, useEffect } from 'react';
import { LeaderboardEntry } from '@/types/game';

const LEADERBOARD_PREFIX = 'leaderboard_';

export function useLeaderboard(levelId: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Load leaderboard on mount
  useEffect(() => {
    fetchLeaderboard(10);
  }, [levelId]);

  const fetchLeaderboard = useCallback(async (limit: number = 10) => {
    setLoading(true);

    try {
      const key = LEADERBOARD_PREFIX + levelId;
      const stored = localStorage.getItem(key);
      const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

      // Sort by time (ascending) and limit
      const sorted = leaderboard.sort((a, b) => a.time_seconds - b.time_seconds).slice(0, limit);
      setEntries(sorted);

      return sorted;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [levelId]);

  const submitScore = useCallback(
    async (
      userId: string,
      playerName: string,
      timeSeconds: number,
      deaths: number
    ) => {
      try {
        const key = LEADERBOARD_PREFIX + levelId;
        const stored = localStorage.getItem(key);
        const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

        // Check if user already has a score
        const existingIndex = leaderboard.findIndex(e => e.user_id === userId);

        if (existingIndex >= 0) {
          // Only update if new time is better
          if (timeSeconds < leaderboard[existingIndex].time_seconds) {
            leaderboard[existingIndex] = {
              ...leaderboard[existingIndex],
              time_seconds: timeSeconds,
              deaths,
            };
          }
        } else {
          // Add new entry from single-player (NOT multiplayer)
          leaderboard.push({
            id: `${userId}_${Date.now()}`,
            level_id: levelId,
            user_id: userId,
            player_name: playerName,
            time_seconds: timeSeconds,
            deaths,
            is_multiplayer: false, // Single-player entries only - multiplayer disabled from leaderboards
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        localStorage.setItem(key, JSON.stringify(leaderboard));
        await fetchLeaderboard();
      } catch (error) {
        console.error('Failed to submit score:', error);
      }
    },
    [levelId, fetchLeaderboard]
  );

  const getUserRank = useCallback(
    async (userId: string) => {
      try {
        const key = LEADERBOARD_PREFIX + levelId;
        const stored = localStorage.getItem(key);
        const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

        // Sort by time and find rank
        const sorted = leaderboard.sort((a, b) => a.time_seconds - b.time_seconds);
        const rank = sorted.findIndex(e => e.user_id === userId) + 1;

        setUserRank(rank > 0 ? rank : null);
        return rank > 0 ? rank : null;
      } catch (error) {
        console.error('Failed to get user rank:', error);
        return null;
      }
    },
    [levelId]
  );

  return {
    entries,
    loading,
    userRank,
    fetchLeaderboard,
    submitScore,
    getUserRank,
  };
}
