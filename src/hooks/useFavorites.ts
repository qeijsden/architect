import { useState, useCallback, useEffect } from 'react';
import { Level } from '@/types/game';

const FAVORITES_PREFIX = 'favorites_';

export function useFavorites(userId?: string) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    if (!userId) return;
    
    try {
      const key = FAVORITES_PREFIX + userId;
      const stored = localStorage.getItem(key);
      const favs = stored ? JSON.parse(stored) : [];
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, [userId]);

  const fetchFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      return;
    }

    try {
      const key = FAVORITES_PREFIX + userId;
      const stored = localStorage.getItem(key);
      const favs = stored ? JSON.parse(stored) : [];
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
    setLoading(false);
  }, [userId]);

  const toggleFavorite = useCallback(
    async (levelId: string): Promise<boolean> => {
      if (!userId) return false;

      const isFavorited = favorites.includes(levelId);
      const key = FAVORITES_PREFIX + userId;

      try {
        if (isFavorited) {
          const updated = favorites.filter(id => id !== levelId);
          localStorage.setItem(key, JSON.stringify(updated));
          setFavorites(updated);
          return false;
        } else {
          const updated = [...favorites, levelId];
          localStorage.setItem(key, JSON.stringify(updated));
          setFavorites(updated);
          return true;
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        return isFavorited;
      }
    },
    [userId, favorites]
  );

  const getFavoriteLevels = useCallback(async (): Promise<Level[]> => {
    if (!userId) return [];

    try {
      const stored = localStorage.getItem('architect_levels_v2');
      const allLevels: Level[] = stored ? JSON.parse(stored) : [];

      // Return only levels that are in favorites list
      return allLevels.filter(level => favorites.includes(level.id));
    } catch (error) {
      console.error('Failed to get favorite levels:', error);
      return [];
    }
  }, [userId, favorites]);

  const isFavorited = useCallback((levelId: string) => {
    return favorites.includes(levelId);
  }, [favorites]);

  return {
    favorites,
    loading,
    fetchFavorites,
    toggleFavorite,
    getFavoriteLevels,
    isFavorited,
  };
}

