import { useState, useEffect, useCallback } from 'react';
import type { Achievement, AchievementStats } from '@/types/game';

export interface SteamAchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedTime: string | null;
}

export function useSteamAchievements() {
  const [achievements, setAchievements] = useState<SteamAchievementData[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    total: 0,
    unlocked: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load all achievements on mount
  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const api = (window as any).electronAPI?.steam;
      if (api) {
        const allAchievements = await api.getAllAchievements();
        setAchievements(allAchievements);

        const achievementStats = await api.getStats();
        setStats(achievementStats);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockAchievement = useCallback(
    async (achievementId: string) => {
      try {
        const api = (window as any).electronAPI?.steam;
        const result = await api?.unlockAchievement(achievementId);
        if (result?.success) {
          // Update local state
          setAchievements(prev =>
            prev.map(a =>
              a.id === achievementId
                ? { ...a, unlocked: true, unlockedTime: new Date().toISOString() }
                : a
            )
          );

          // Update stats
          const newStats = await api.getStats();
          setStats(newStats);

          return true;
        }
      } catch (error) {
        console.error('Failed to unlock achievement:', error);
      }
      return false;
    },
    []
  );

  const getAchievement = useCallback(
    (achievementId: string) => {
      return achievements.find(a => a.id === achievementId);
    },
    [achievements]
  );

  const isAchievementUnlocked = useCallback(
    (achievementId: string) => {
      return achievements.some(a => a.id === achievementId && a.unlocked);
    },
    [achievements]
  );

  const resetAchievements = useCallback(async () => {
    try {
      const api = (window as any).electronAPI?.steam;
      const result = await api?.resetAchievements();
      if (result?.success) {
        await loadAchievements();
        return true;
      }
    } catch (error) {
      console.error('Failed to reset achievements:', error);
    }
    return false;
  }, [loadAchievements]);

  return {
    achievements,
    stats,
    loading,
    unlockAchievement,
    getAchievement,
    isAchievementUnlocked,
    resetAchievements,
    reloadAchievements: loadAchievements,
  };
}
