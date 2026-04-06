import { useState, useCallback, useEffect } from 'react';
import { LeaderboardEntry, LevelMode } from '@/types/game';

const LEADERBOARD_PREFIX = 'leaderboard_';

const isEntryForMode = (entry: LeaderboardEntry, mode: LevelMode) => {
  if (mode === 'survival') return entry.mode === 'survival';
  return entry.mode !== 'survival';
};

const compareEntries = (mode: LevelMode) => (a: LeaderboardEntry, b: LeaderboardEntry) => {
  if (mode === 'survival') {
    if (b.time_seconds !== a.time_seconds) return b.time_seconds - a.time_seconds;
    return a.deaths - b.deaths;
  }

  if (a.time_seconds !== b.time_seconds) return a.time_seconds - b.time_seconds;
  return a.deaths - b.deaths;
};

export function useLeaderboard(levelId: string, mode: LevelMode = 'race') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Load leaderboard on mount
  useEffect(() => {
    fetchLeaderboard(10);
  }, [levelId, mode]);

  const fetchLeaderboard = useCallback(async (limit: number = 10) => {
    setLoading(true);

    try {
      const key = LEADERBOARD_PREFIX + levelId;
      const stored = localStorage.getItem(key);
      const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

      const sorted = leaderboard
        .filter((entry) => isEntryForMode(entry, mode))
        .sort(compareEntries(mode))
        .slice(0, limit);
      setEntries(sorted);

      return sorted;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [levelId, mode]);

  const submitScore = useCallback(
    async (
      userId: string,
      playerName: string,
      timeSeconds: number,
      deaths: number,
      entryMode: LevelMode = mode,
    ) => {
      try {
        const key = LEADERBOARD_PREFIX + levelId;
        const stored = localStorage.getItem(key);
        const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

        // Check if user already has a score
        const existingIndex = leaderboard.findIndex((entry) => entry.user_id === userId && isEntryForMode(entry, entryMode));

        if (existingIndex >= 0) {
          const existing = leaderboard[existingIndex];
          const isBetter = entryMode === 'survival'
            ? timeSeconds > existing.time_seconds || (timeSeconds === existing.time_seconds && deaths < existing.deaths)
            : timeSeconds < existing.time_seconds || (timeSeconds === existing.time_seconds && deaths < existing.deaths);

          if (isBetter) {
            leaderboard[existingIndex] = {
              ...existing,
              time_seconds: timeSeconds,
              deaths,
              mode: entryMode,
              created_at: existing.created_at,
              updated_at: new Date().toISOString(),
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
            mode: entryMode,
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
    [levelId, fetchLeaderboard, mode]
  );

  const getUserRank = useCallback(
    async (userId: string) => {
      try {
        const key = LEADERBOARD_PREFIX + levelId;
        const stored = localStorage.getItem(key);
        const leaderboard: LeaderboardEntry[] = stored ? JSON.parse(stored) : [];

        const sorted = leaderboard.filter((entry) => isEntryForMode(entry, mode)).sort(compareEntries(mode));
        const rank = sorted.findIndex(e => e.user_id === userId) + 1;

        setUserRank(rank > 0 ? rank : null);
        return rank > 0 ? rank : null;
      } catch (error) {
        console.error('Failed to get user rank:', error);
        return null;
      }
    },
    [levelId, mode]
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
