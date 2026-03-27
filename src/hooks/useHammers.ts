import { useState, useCallback, useEffect } from 'react';

const MAX_HAMMERS = 3;
const RECHARGE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const HAMMERS_PREFIX = 'hammers_';

export function useHammers(userId?: string) {
  const [hammers, setHammers] = useState(0);
  const [lastRecharge, setLastRecharge] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHammers = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const key = HAMMERS_PREFIX + userId;
      const stored = localStorage.getItem(key);
      
      let hammersData = {
        hammers: MAX_HAMMERS, // Start with full hammers
        last_hammer_recharge: new Date().toISOString(),
      };

      if (stored) {
        hammersData = JSON.parse(stored);
      }

      let currentHammers = hammersData.hammers;
      const lastRechargeTime = new Date(hammersData.last_hammer_recharge);

      // Calculate if we should recharge
      const now = new Date();
      const timeSinceRecharge = now.getTime() - lastRechargeTime.getTime();
      const rechargesToAdd = Math.floor(timeSinceRecharge / RECHARGE_INTERVAL_MS);

      if (rechargesToAdd > 0 && currentHammers < MAX_HAMMERS) {
        const newHammers = Math.min(MAX_HAMMERS, currentHammers + rechargesToAdd);
        const newRechargeTime = new Date(
          lastRechargeTime.getTime() + rechargesToAdd * RECHARGE_INTERVAL_MS
        );

        // Update in localStorage
        localStorage.setItem(
          key,
          JSON.stringify({
            hammers: newHammers,
            last_hammer_recharge: newRechargeTime.toISOString(),
          })
        );

        currentHammers = newHammers;
        setLastRecharge(newRechargeTime);
      } else {
        setLastRecharge(lastRechargeTime);
      }

      setHammers(currentHammers);
    } catch (error) {
      console.error('Failed to fetch hammers:', error);
      setHammers(MAX_HAMMERS);
      setLastRecharge(new Date());
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHammers();
  }, [fetchHammers]);

  const useHammer = useCallback(async (): Promise<boolean> => {
    if (!userId || hammers <= 0) return false;

    try {
      const key = HAMMERS_PREFIX + userId;
      const newHammerCount = hammers - 1;

      localStorage.setItem(
        key,
        JSON.stringify({
          hammers: newHammerCount,
          last_hammer_recharge: lastRecharge?.toISOString() || new Date().toISOString(),
        })
      );

      setHammers(newHammerCount);
      return true;
    } catch (error) {
      console.error('Failed to use hammer:', error);
      return false;
    }
  }, [userId, hammers, lastRecharge]);

  const getTimeUntilRecharge = useCallback((): string | null => {
    if (hammers >= MAX_HAMMERS || !lastRecharge) return null;

    const now = new Date();
    const nextRecharge = new Date(lastRecharge.getTime() + RECHARGE_INTERVAL_MS);
    const remaining = nextRecharge.getTime() - now.getTime();

    if (remaining <= 0) return 'Recharging...';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }, [hammers, lastRecharge]);

  return {
    hammers,
    maxHammers: MAX_HAMMERS,
    loading,
    useHammer,
    getTimeUntilRecharge,
    refetch: fetchHammers,
  };
}

