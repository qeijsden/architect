import { useState, useCallback, useEffect } from 'react';
import { Level, Block, TexturePack, CustomBlockDefinition, LevelMode } from '@/types/game';
import { getSharedLevels } from '@/integrations/playfab/api';
import { usePlayFabAuth } from '@/hooks/usePlayFabAuth';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_TEXTURE_COLORS: Record<string, string> = {
  platform: '#6b7280',
  hazard: '#dc2626',
  goal: '#fbbf24',
  spawn: '#22c55e',
  bounce: '#a855f7',
  ice: '#06b6d4',
  teleporter: '#6366f1',
  crumbling: '#b45309',
  conveyor: '#0ea5e9',
  rotating_beam: '#f97316',
  checkpoint: '#3b82f6',
  moving: '#8b5cf6',
  low_gravity: '#ec4899',
  tentacle: '#8b5cf6',
  speed_gate: '#eab308',
  ramp: '#14b8a6',
  cannon: '#f97316',
  wind: '#60a5fa',
  directional_impact: '#f43f5e',
  push_block: '#a3e635',
  water: '#0284c7',
  air_jump: '#a78bfa',
};

const compactTexturePack = (texturePack?: TexturePack): TexturePack | undefined => {
  if (!texturePack) return undefined;

  const compactedTextures: TexturePack['textures'] = {};
  const entries = Object.entries(texturePack.textures || {});

  for (const [blockType, pixelData] of entries) {
    if (!pixelData || !Array.isArray(pixelData.pixels)) continue;
    const fallback = DEFAULT_TEXTURE_COLORS[blockType] || '#ffffff';
    const isDefaultFill = pixelData.pixels.every((p) => p === fallback);
    if (isDefaultFill) continue;
    compactedTextures[blockType as keyof TexturePack['textures']] = pixelData;
  }

  return {
    ...texturePack,
    textures: compactedTextures,
  };
};

const sanitizeBlocksForPublish = (blocks: Block[]): Block[] => {
  return blocks.map((b) => {
    const {
      rotationAngle,
      crumbleState,
      crumbleTimer,
      isLocked,
      ...persisted
    } = b;
    return persisted;
  });
};

const sanitizeLevelForPublish = (level: Level): Level => {
  return {
    ...level,
    blocks: sanitizeBlocksForPublish(level.blocks || []),
    texturePack: compactTexturePack(level.texturePack),
  };
};

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
    trackTitle?: string,
    trackArtist?: string,
    gridSize?: number,
    texturePack?: TexturePack,
    mode?: LevelMode,
    survivalTimeSeconds?: number,
    customBlocks?: CustomBlockDefinition[]
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
        mode,
        survival_time_seconds: survivalTimeSeconds,
        completion_count: 0,
        played_by: [],
        completed_by: [],
        liked_by: [],
        allowImport,
        trackUrl,
        trackTitle,
        trackArtist,
        max_time_seconds: maxTimeSeconds,
        gridSize,
        texturePack,
        customBlocks,
      };

      const allLevels = [...levels, newLevel];
      setLevels(allLevels);

      // Save to PlayFab cloud via CloudScript (ONLY storage now)
      try {
        const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
        await publishLevelToPlayFab(sanitizeLevelForPublish(newLevel));
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
      allowImport?: boolean;
      max_time_seconds?: number;
      trackUrl?: string;
      trackTitle?: string;
      trackArtist?: string;
      texturePack?: TexturePack;
      gridSize?: number;
      mode?: LevelMode;
      survival_time_seconds?: number;
      customBlocks?: CustomBlockDefinition[];
    }
  ): Promise<void> => {
    const allLevels = [...levels];
    const levelIndex = allLevels.findIndex(l => l.id === levelId);

    if (levelIndex >= 0) {
      if (updates.name !== undefined) allLevels[levelIndex].name = updates.name;
      if (updates.blocks !== undefined) allLevels[levelIndex].blocks = updates.blocks;
      if (updates.validated !== undefined) allLevels[levelIndex].validated = updates.validated;
      if (updates.allowImport !== undefined) allLevels[levelIndex].allowImport = updates.allowImport;
      if (updates.max_time_seconds !== undefined) allLevels[levelIndex].max_time_seconds = updates.max_time_seconds;
      if (updates.trackUrl !== undefined) allLevels[levelIndex].trackUrl = updates.trackUrl;
      if (updates.trackTitle !== undefined) allLevels[levelIndex].trackTitle = updates.trackTitle;
      if (updates.trackArtist !== undefined) allLevels[levelIndex].trackArtist = updates.trackArtist;
      if (updates.texturePack !== undefined) (allLevels[levelIndex] as Level & { texturePack?: TexturePack }).texturePack = updates.texturePack;
      if (updates.gridSize !== undefined) allLevels[levelIndex].gridSize = updates.gridSize;
      if (updates.mode !== undefined) allLevels[levelIndex].mode = updates.mode;
      if (updates.survival_time_seconds !== undefined) allLevels[levelIndex].survival_time_seconds = updates.survival_time_seconds;
      if (updates.customBlocks !== undefined) allLevels[levelIndex].customBlocks = updates.customBlocks;

      setLevels(allLevels);
      
      // Update in PlayFab
      try {
        await ensurePlayFabSession(allLevels[levelIndex].author_id, allLevels[levelIndex].author);
        const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
        await publishLevelToPlayFab(sanitizeLevelForPublish(allLevels[levelIndex]));
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

  const resolveLevelForMutation = useCallback(async (levelId: string): Promise<{ allLevels: Level[]; levelIndex: number }> => {
    let allLevels = [...levels];
    let levelIndex = allLevels.findIndex(l => l.id === levelId);
    if (levelIndex >= 0) return { allLevels, levelIndex };

    await ensurePlayFabSession(user?.id, profile?.display_name);
    allLevels = await getSharedLevels();
    levelIndex = allLevels.findIndex(l => l.id === levelId);
    return { allLevels, levelIndex };
  }, [levels, ensurePlayFabSession, user?.id, profile?.display_name]);

  const recordUniquePlay = useCallback(async (levelId: string, playerId: string): Promise<boolean> => {
    const { allLevels, levelIndex } = await resolveLevelForMutation(levelId);
    if (levelIndex < 0) return false;

    const level = allLevels[levelIndex];
    const playedBy = new Set(level.played_by || []);
    if (playedBy.has(playerId)) return false;

    playedBy.add(playerId);
    level.played_by = Array.from(playedBy);
    level.plays = level.played_by.length;
    setLevels(allLevels);

    try {
      await ensurePlayFabSession(level.author_id, level.author);
      const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
      await publishLevelToPlayFab(sanitizeLevelForPublish(level));
    } catch (error) {
      console.error('Failed to persist unique play:', error);
    }

    return true;
  }, [ensurePlayFabSession, resolveLevelForMutation]);

  const recordUniqueCompletion = useCallback(async (levelId: string, playerId: string): Promise<boolean> => {
    const { allLevels, levelIndex } = await resolveLevelForMutation(levelId);
    if (levelIndex < 0) return false;

    const level = allLevels[levelIndex];
    const completedBy = new Set(level.completed_by || []);
    if (completedBy.has(playerId)) return false;

    completedBy.add(playerId);
    level.completed_by = Array.from(completedBy);
    level.completion_count = level.completed_by.length;
    setLevels(allLevels);

    try {
      await ensurePlayFabSession(level.author_id, level.author);
      const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
      await publishLevelToPlayFab(sanitizeLevelForPublish(level));
    } catch (error) {
      console.error('Failed to persist unique completion:', error);
    }

    return true;
  }, [ensurePlayFabSession, resolveLevelForMutation]);

  const toggleLike = useCallback(async (levelId: string, userId: string): Promise<boolean> => {
    const { allLevels, levelIndex } = await resolveLevelForMutation(levelId);
    if (levelIndex < 0) return false;

    const level = allLevels[levelIndex];
    const likedBy = new Set(level.liked_by || []);
    const wasLiked = likedBy.has(userId);

    if (wasLiked) {
      likedBy.delete(userId);
    } else {
      likedBy.add(userId);
    }

    level.liked_by = Array.from(likedBy);
    level.likes = level.liked_by.length;
    setLevels(allLevels);

    try {
      await ensurePlayFabSession(level.author_id, level.author);
      const { publishLevelToPlayFab } = await import('@/integrations/playfab/api');
      await publishLevelToPlayFab(sanitizeLevelForPublish(level));
    } catch (error) {
      console.error('Failed to persist like update:', error);
    }

    return !wasLiked;
  }, [ensurePlayFabSession, resolveLevelForMutation]);

  const checkLiked = useCallback(async (levelId: string, userId: string): Promise<boolean> => {
    const { allLevels, levelIndex } = await resolveLevelForMutation(levelId);
    if (levelIndex < 0) return false;
    return (allLevels[levelIndex].liked_by || []).includes(userId);
  }, [resolveLevelForMutation]);

  return {
    levels,
    loading,
    fetchLevels,
    createLevel,
    updateLevel,
    deleteLevel,
    incrementPlays,
    incrementCompletions,
    recordUniquePlay,
    recordUniqueCompletion,
    toggleLike,
    checkLiked,
  };
}