import { useEffect, useCallback } from 'react';

export interface DiscordPresenceData {
  state?: string;
  details?: string;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  partySize?: number;
  partyMax?: number;
  matchSecret?: string;
  spectateSecret?: string;
  joinSecret?: string;
  instance?: boolean;
  buttons?: Array<{ label: string; url: string }>;
}

export function useDiscordPresence() {
  const setPresence = useCallback(async (data: DiscordPresenceData) => {
    try {
      const api = (window as any).electronAPI?.discord;
      if (api) {
        const result = await api.setPresence(data);
        return result?.success || false;
      }
    } catch (error) {
      console.error('Failed to set Discord presence:', error);
    }
    return false;
  }, []);

  const clearPresence = useCallback(async () => {
    try {
      const api = (window as any).electronAPI?.discord;
      if (api) {
        const result = await api.clearPresence();
        return result?.success || false;
      }
    } catch (error) {
      console.error('Failed to clear Discord presence:', error);
    }
    return false;
  }, []);

  const getStatus = useCallback(async () => {
    try {
      const api = (window as any).electronAPI?.discord;
      if (api) {
        return await api.getStatus();
      }
    } catch (error) {
      console.error('Failed to get Discord status:', error);
    }
    return { connected: false };
  }, []);

  // Update presence when component mounts
  useEffect(() => {
    setPresence({
      state: 'In Main Menu',
      details: 'Browsing levels',
      largeImageKey: 'architect_logo',
      largeImageText: 'Architect - Player\'s Playground',
    });

    return () => {
      clearPresence();
    };
  }, [setPresence, clearPresence]);

  return {
    setPresence,
    clearPresence,
    getStatus,
  };
}
