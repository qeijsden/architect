import { useEffect, useRef } from 'react';

/**
 * Hook for Steam overlay integration
 * - Detects if Steam is running
 * - Allows access to Steam overlay while playing
 * - Notifies Steam of gameplay state
 */
export function useSteamOverlay() {
  const isSteamRef = useRef(false);
  const overlayEnabledRef = useRef(false);

  useEffect(() => {
    // Detect if running in Electron with Steam integration
    const isElectron = typeof window !== 'undefined' && 
      ((window as any).electronAPI?.isElectron === true || window.location.protocol === 'file:');
    
    if (!isElectron) return;

    // Check for Steam runtime environment variables
    // Steam sets these when the app is launched through Steam
    const hasSteamEnv = typeof process !== 'undefined' && 
      process.env && 
      (process.env.STEAM_COMPAT_TOOLS_PATHS !== undefined || 
       process.env.STEAM_COMPAT_TOOL_PATHS !== undefined);

    isSteamRef.current = hasSteamEnv || false;

    // Try to access Steam overlay via Electron IPC
    if ((window as any).electronAPI?.setSteamOverlayState) {
      (window as any).electronAPI.setSteamOverlayState(true);
      overlayEnabledRef.current = true;
    }

    // Listen for Steam overlay visibility changes
    const handleKeyPress = (e: KeyboardEvent) => {
      // Steam overlay typically opens with Shift+Tab
      // We don't intercept it, just track it
      if (e.shiftKey && e.key === 'Tab') {
        console.log('Steam overlay may be opening (Shift+Tab pressed)');
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      // Disable overlay on unmount if it was enabled
      if ((window as any).electronAPI?.setSteamOverlayState) {
        (window as any).electronAPI.setSteamOverlayState(false);
      }
    };
  }, []);

  /**
   * Show Steam overlay (if available)
   */
  const showSteamOverlay = () => {
    if ((window as any).electronAPI?.showSteamOverlay) {
      (window as any).electronAPI.showSteamOverlay();
    }
  };

  /**
   * Post achievement to Steam
   */
  const postSteamAchievement = (achievementName: string) => {
    if ((window as any).electronAPI?.postSteamAchievement) {
      (window as any).electronAPI.postSteamAchievement(achievementName);
    }
  };

  /**
   * Set rich presence for Steam profile
   */
  const setSteamPresence = (state: string, details?: string) => {
    if ((window as any).electronAPI?.setSteamPresence) {
      (window as any).electronAPI.setSteamPresence({ state, details });
    }
  };

  return {
    isSteamRunning: isSteamRef.current,
    overlayEnabled: overlayEnabledRef.current,
    showSteamOverlay,
    postSteamAchievement,
    setSteamPresence,
  };
}

export default useSteamOverlay;
