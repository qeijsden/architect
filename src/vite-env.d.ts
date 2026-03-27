/// <reference types="vite/client" />
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      steam: {
        unlockAchievement: (achievementId: string) => Promise<{ success: boolean; achievement?: any }>;
        getAchievement: (achievementId: string) => Promise<any>;
        getAllAchievements: () => Promise<any[]>;
        getStats: () => Promise<{ total: number; unlocked: number; percentage: number }>;
        resetAchievements: () => Promise<{ success: boolean }>;
        getUserInfo: () => Promise<{ steamId: string; username: string; createdAt: string }>;
        setUsername: (username: string) => Promise<{ success: boolean; username?: string; error?: string }>;
      };
      discord: {
        setPresence: (data: any) => Promise<{ success: boolean }>;
        clearPresence: () => Promise<{ success: boolean }>;
        getStatus: () => Promise<{ connected: boolean }>;
      };
    };
  }
}