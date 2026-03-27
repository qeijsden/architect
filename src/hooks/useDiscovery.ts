import { useState, useCallback } from 'react';
import { Level } from '@/types/game';
import { getSharedLevels } from '@/integrations/playfab/api';
import { usePlayFabAuth } from '@/hooks/usePlayFabAuth';
import { useAuth } from '@/hooks/useAuth';

export function useDiscovery(userId?: string) {
  const { user, profile } = useAuth();
  const { loginWithCustomID, isAuthenticated: isPlayFabAuthed } = usePlayFabAuth();
  const [loading, setLoading] = useState(false);
  const [playedLevelIds, setPlayedLevelIds] = useState<Set<string>>(new Set());

  const getAnonId = () => {
    const key = 'playfab_anon_id';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const anonId = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    sessionStorage.setItem(key, anonId);
    return anonId;
  };

  const ensurePlayFabSession = useCallback(async () => {
    if (isPlayFabAuthed) return;
    const idToUse = user?.id || userId || getAnonId();
    const nameToUse = profile?.display_name || 'Guest';
    await loginWithCustomID(idToUse, nameToUse);
  }, [isPlayFabAuthed, loginWithCustomID, user?.id, userId, profile?.display_name]);

  // Check if a level has been played by this user
  const isLevelPlayed = useCallback((levelId: string) => {
    return playedLevelIds.has(levelId);
  }, [playedLevelIds]);

  // Get levels user hasn't played yet
  const getDiscoveryQueue = useCallback(async (limit = 10): Promise<Level[]> => {
    setLoading(true);

    try {
      await ensurePlayFabSession();
      const allLevels: Level[] = await getSharedLevels();

      // Filter for validated levels
      let unplayedLevels = allLevels.filter(l => l.validated);

      // Filter out played levels if user is logged in
      if (userId) {
        unplayedLevels = unplayedLevels.filter(l => !playedLevelIds.has(l.id));
      }

      // Shuffle and take random selection
      const shuffled = unplayedLevels.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, limit);

      return selected;
    } catch (error) {
      console.error('Failed to get discovery queue:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, playedLevelIds]);

  // Get Architect's Hell - completion rate < 25%
  const getArchitectsHell = useCallback(async (limit = 3): Promise<Level[]> => {
    setLoading(true);

    try {
      await ensurePlayFabSession();
      const allLevels: Level[] = await getSharedLevels();

      // Filter for hard levels
      const hardLevels = allLevels.filter(l => {
        if (l.validated === false) return false;
        if (!l.plays || l.plays < 5) return false; // Need enough plays
        const rate = (l.completion_count || 0) / l.plays * 100;
        return rate < 25;
      });

      const shuffled = hardLevels.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, limit);

      return selected;
    } catch (error) {
      console.error('Failed to get architect hell:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Architect's Heaven - completion rate > 75%
  const getArchitectsHeaven = useCallback(async (limit = 3): Promise<Level[]> => {
    setLoading(true);

    try {
      await ensurePlayFabSession();
      const allLevels: Level[] = await getSharedLevels();

      // Filter for easy levels
      const easyLevels = allLevels.filter(l => {
        if (l.validated === false) return false;
        if (!l.plays || l.plays < 5) return false; // Need enough plays
        const rate = (l.completion_count || 0) / l.plays * 100;
        return rate > 75;
      });

      const shuffled = easyLevels.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, limit);

      return selected;
    } catch (error) {
      console.error('Failed to get architect heaven:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user's own levels (Crafted)
  const getCraftedLevels = useCallback(async (): Promise<Level[]> => {
    if (!userId) return [];
    setLoading(true);

    try {
      await ensurePlayFabSession();
      const allLevels: Level[] = await getSharedLevels();

      // Filter for user's levels
      const userLevels = allLevels.filter(l => l.author_id === userId);
      
      // Sort by creation date descending
      userLevels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return userLevels;
    } catch (error) {
      console.error('Failed to get crafted levels:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, ensurePlayFabSession]);

  // Record that user played a level
  const recordPlay = useCallback(async (levelId: string, completed: boolean) => {
    if (!userId) return;
    const next = new Set(playedLevelIds);
    next.add(levelId);
    setPlayedLevelIds(next);
  }, [playedLevelIds, userId]);

  return {
    loading,
    playedLevelIds,
    isLevelPlayed,
    getDiscoveryQueue,
    getArchitectsHell,
    getArchitectsHeaven,
    getCraftedLevels,
    recordPlay,
  };
}
