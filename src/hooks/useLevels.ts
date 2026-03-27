import { useState, useCallback, useEffect } from 'react';
import { Level, Block } from '@/types/game';
import { getSharedLevels } from '@/integrations/playfab/api';
import { usePlayFabAuth } from '@/hooks/usePlayFabAuth';
import { useAuth } from '@/hooks/useAuth';

export function useLevels() {
  const { user, profile } = useAuth();
  const { loginWithCustomID, isAuthenticated: isPlayFabAuthed } = usePlayFabAuth();
  const [levels, setLevels] = useState<Level[]>(() => {
    return [];
  });
  const [loading, setLoading] = useState(false);

  const getAnonId = () => {
    const key = 'playfab_anon_id';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const anonId = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    sessionStorage.setItem(key, anonId);
    return anonId;
  };

  const ensurePlayFabSession = useCallback(async (userId?: string, displayName?: string) => {
    if (isPlayFabAuthed) return;
    const idToUse = userId || getAnonId();
    const nameToUse = displayName || 'Guest';
    await loginWithCustomID(idToUse, nameToUse);
  }, [isPlayFabAuthed, loginWithCustomID]);

  // Fetch levels from PlayFab Title Data on mount
  useEffect(() => {
    const fetchFromCloud = async () => {
      setLoading(true);
      try {
        await ensurePlayFabSession(user?.id, profile?.display_name);
        const cloudLevels = await getSharedLevels();
        console.log(`Loaded ${cloudLevels.length} levels from PlayFab Title Data`);
        setLevels(cloudLevels);
      } catch (error) {
        console.error('Failed to fetch from PlayFab:', error);
        setLevels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFromCloud();
  }, [ensurePlayFabSession, user?.id, profile?.display_name]);

  const fetchLevels = useCallback(async (options?: {
    validated?: boolean;
    authorId?: string;
    limit?: number;
    orderBy?: 'plays' | 'likes' | 'created_at';
  }) => {
    setLoading(true);
    
    try {
      await ensurePlayFabSession(user?.id, profile?.display_name);
      let allLevels = await getSharedLevels();

      // Filter by validation
      if (options?.validated !== undefined) {
        allLevels = allLevels.filter(l => l.validated === options.validated);
      }

      // Filter by author
      if (options?.authorId) {
        allLevels = allLevels.filter(l => l.author_id === options.authorId);
      }

      // Sort
      if (options?.orderBy === 'plays') {
        allLevels.sort((a, b) => (b.plays || 0) - (a.plays || 0));
      } else if (options?.orderBy === 'likes') {
        allLevels.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      } else {
        allLevels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Limit
      if (options?.limit) {
        allLevels = allLevels.slice(0, options.limit);
      }

      setLevels(allLevels);
      return allLevels;
    } catch (error) {
      console.error('Failed to fetch levels:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [ensurePlayFabSession, user?.id, profile?.display_name]);

  const createLevel = useCallback(async (
    name: string,
    authorId: string,
    authorName: string,
    blocks: Block[],
    validated: boolean = false,
    maxTimeSeconds?: number,
    allowImport: boolean = false,
    trackUrl?: string,
    gridSize?: number
  ): Promise<Level> => {
    try {
      await ensurePlayFabSession(authorId, authorName);
      const newLevel: Level = {
        id: `level_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name,
        author: authorName,
        author_id: authorId,
        blocks,
        validated,
        plays: 0,
        likes: 0,
        createdAt: new Date(),
        completion_count: 0,
        allowImport,
        trackUrl,
        max_time_seconds: maxTimeSeconds,
        gridSize,
      };

      const allLevels = [...levels, newLevel];
      setLevels(allLevels);

      // Save to PlayFab cloud via CloudScript (ONLY storage now)
      try {
        const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
        await publishLevelToPlayFab(newLevel);
        console.log('Level saved to PlayFab Title Data');
      } catch (error) {
        console.error('Failed to save to PlayFab:', error);
        throw error; // Don't fall back - if PlayFab fails, creation fails
      }

      console.log('Level created:', newLevel);
      return newLevel;
    } catch (error) {
      console.error('Failed to create level:', error);
      throw error;
    }
  }, []);

  const updateLevel = useCallback(async (
    levelId: string,
    updates: {
      name?: string;
      blocks?: Block[];
      validated?: boolean;
    }
  ): Promise<void> => {
    const allLevels = [...levels];
    const levelIndex = allLevels.findIndex(l => l.id === levelId);

    if (levelIndex >= 0) {
      if (updates.name) allLevels[levelIndex].name = updates.name;
      if (updates.blocks) allLevels[levelIndex].blocks = updates.blocks;
      if (updates.validated !== undefined) allLevels[levelIndex].validated = updates.validated;

      setLevels(allLevels);
      
      // Update in PlayFab
      try {
        await ensurePlayFabSession(allLevels[levelIndex].author_id, allLevels[levelIndex].author);
        const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
        await publishLevelToPlayFab(allLevels[levelIndex]);
      } catch (error) {
        console.error('Failed to update level in PlayFab:', error);
      }
    }
  }, [levels, ensurePlayFabSession]);

  const deleteLevel = useCallback(async (levelId: string): Promise<void> => {
    const filtered = levels.filter(l => l.id !== levelId);
    setLevels(filtered);
    // Note: No PlayFab API to delete from Title Data from client
  }, [levels]);

  const incrementPlays = useCallback(async (levelId: string): Promise<void> => {
    const allLevels = [...levels];
    const level = allLevels.find(l => l.id === levelId);

    if (level) {
      level.plays = (level.plays || 0) + 1;
      setLevels(allLevels);
    }
  }, [levels]);

  const incrementCompletions = useCallback(async (levelId: string): Promise<void> => {
    const allLevels = [...levels];
    const level = allLevels.find(l => l.id === levelId);

    if (level) {
      level.completion_count = (level.completion_count || 0) + 1;
      setLevels(allLevels);
    }
  }, [levels]);

  const toggleLike = useCallback(async (levelId: string, userId: string): Promise<boolean> => {
    const allLevels = [...levels];
    const level = allLevels.find(l => l.id === levelId);

    if (!level) return false;

    // Track likes in memory only (will reset on page refresh)
    const likedIndex = -1; // Simplified - no persistent like tracking

    if (likedIndex >= 0) {
      level.likes = Math.max(0, (level.likes || 1) - 1);
    } else {
      level.likes = (level.likes || 0) + 1;
    }

    setLevels(allLevels);
    return likedIndex < 0;
  }, [levels]);

  const checkLiked = useCallback(async (levelId: string, userId: string): Promise<boolean> => {
    // Simplified - no persistent like tracking
    return false;
  }, []);

  return {
    levels,
    loading,
    fetchLevels,
    createLevel,
    updateLevel,
    deleteLevel,
    incrementPlays,
    incrementCompletions,
    toggleLike,
    checkLiked,
  };
}