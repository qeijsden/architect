import { useState, useCallback } from 'react';
import { PlayFab, PlayFabSession, setSession, getSession, hasActiveSession } from '@/integrations/playfab/client';

const LOGIN_COOLDOWN_MS = 5000;
const LOGIN_THROTTLE_MS = 30000;
let loginPromise: Promise<PlayFabResponse<any>> | null = null;
let lastLoginAttempt = 0;
let nextLoginAllowedAt = 0;

interface PlayFabResponse<T> {
  code: number;
  status: string;
  data: T;
}

export function usePlayFabAuth() {
  const [session, setSessionState] = useState<PlayFabSession | null>(getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithEmailPassword = useCallback(async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    setError(null);

    try {
      // For now, we'll use a simplified approach with custom ID login
      // In production, you'd want proper email/password authentication
      return await loginWithCustomID(email, displayName);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithCustomID = useCallback(async (customId: string, displayName?: string) => {
    if (hasActiveSession()) {
      return getSession() as PlayFabSession;
    }

    const now = Date.now();
    if (now < nextLoginAllowedAt) {
      const waitMs = nextLoginAllowedAt - now;
      throw new Error(`Login throttled. Try again in ${Math.ceil(waitMs / 1000)}s`);
    }

    if (loginPromise) {
      const response = await loginPromise;
      if (response.data?.SessionTicket) {
        const existingSession: PlayFabSession = {
          playerId: response.data.PlayFabPlayerId,
          sessionTicket: response.data.SessionTicket,
          entityId: response.data.EntityToken?.Entity?.Id || '',
          entityType: response.data.EntityToken?.Entity?.Type || '',
        };
        setSession(existingSession);
        setSessionState(existingSession);
        return existingSession;
      }
    }

    const nowForCooldown = Date.now();
    if (nowForCooldown - lastLoginAttempt < LOGIN_COOLDOWN_MS) {
      const waitMs = LOGIN_COOLDOWN_MS - (nowForCooldown - lastLoginAttempt);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    lastLoginAttempt = Date.now();
    setLoading(true);
    setError(null);

    try {
      loginPromise = new Promise((resolve, reject) => {
        if (!PlayFab.ClientApi) {
          reject(new Error('PlayFab SDK not initialized'));
          return;
        }

        PlayFab.ClientApi.LoginWithCustomID({
          CustomId: customId,
          CreateAccount: true,
        }, (result: any) => {
          if (result.code === 429) {
            nextLoginAllowedAt = Date.now() + LOGIN_THROTTLE_MS;
            reject(new Error(result.errorMessage || 'Login throttled'));
            return;
          }

          if (result.code === 200) {
            if (displayName) {
              const updateFn = PlayFab.ClientApi.UpdateUserTitleDisplayName || PlayFab.ClientApi.UpdateUserProfile;
              if (!updateFn) {
                resolve(result);
                return;
              }

              updateFn({
                DisplayName: displayName,
              }, () => {
                resolve(result);
              });
            } else {
              resolve(result);
            }
          } else {
            reject(new Error(result.errorMessage || 'Login failed'));
          }
        });
      }) as Promise<PlayFabResponse<any>>;

      const response = await loginPromise;

      if (response.data.SessionTicket) {
        const newSession: PlayFabSession = {
          playerId: response.data.PlayFabPlayerId,
          sessionTicket: response.data.SessionTicket,
          entityId: response.data.EntityToken?.Entity?.Id || '',
          entityType: response.data.EntityToken?.Entity?.Type || '',
        };

        setSession(newSession);
        setSessionState(newSession);
        return newSession;
      }

      throw new Error('No session ticket received');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errMsg);
      throw err;
    } finally {
      loginPromise = null;
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setSessionState(null);
  }, []);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!hasActiveSession()) {
      throw new Error('No active session');
    }

    return new Promise<void>((resolve, reject) => {
      if (!PlayFab.ClientApi) {
        reject(new Error('PlayFab SDK not initialized'));
        return;
      }

      const updateFn = PlayFab.ClientApi.UpdateUserTitleDisplayName || PlayFab.ClientApi.UpdateUserProfile;
      if (!updateFn) {
        reject(new Error('Update display name not supported'));
        return;
      }

      updateFn({
        DisplayName: displayName,
      }, (result: any) => {
        if (result.code === 200) {
          resolve();
        } else {
          reject(new Error(result.errorMessage || 'Failed to update display name'));
        }
      });
    });
  }, []);

  return {
    session,
    loading,
    error,
    loginWithEmailPassword,
    loginWithCustomID,
    logout,
    updateDisplayName,
    isAuthenticated: hasActiveSession(),
  };
}
