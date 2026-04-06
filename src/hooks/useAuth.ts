import { useState, useEffect, useCallback } from 'react';
import { Profile } from '@/types/game';
import { getSteamIdentity, SteamIdentity } from '@/lib/steam';
import { PlayFab, hasActiveSession, setSession, PlayFabSession } from '@/integrations/playfab/client';
import { GoogleUser, getStoredGoogleUser, storeGoogleUser, clearStoredGoogleUser, decodeGoogleCredential, revokeGoogleSession } from '@/lib/google-auth';
import {
  AuthenticatorSetup,
  canSignInWithAuthenticator,
  clearLocalSessionUser,
  confirmAuthenticatorSetup,
  createUsernameAccount,
  createAuthenticatorSetup,
  getLocalSessionUser,
  setLocalSessionUser,
  verifyAuthenticatorCode,
} from '@/lib/local-auth';

const PROFILE_STORAGE_KEY = 'architect_profile';
const STEAM_LINK_PREFIX = 'steam_link_';
const LOCAL_ID_PREFIX = 'usr_';

type AuthMethod = 'steam' | 'google' | 'username' | null;

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [steamMode, setSteamMode] = useState(false);
  const [steamIdentity, setSteamIdentity] = useState<SteamIdentity | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>(null);
  const [usernameAuth, setUsernameAuth] = useState<string | null>(null);

  const linkSteamAccount = useCallback((appId: string, steamId: string) => {
    localStorage.setItem(`${STEAM_LINK_PREFIX}${appId}`, steamId);
    localStorage.setItem(`${STEAM_LINK_PREFIX}reverse_${steamId}`, appId);
  }, []);

  const loginToPlayFab = useCallback(async (customId: string, displayName: string) => {
    if (hasActiveSession()) return;

    await new Promise<void>((resolve, reject) => {
      if (!PlayFab.ClientApi) {
        reject(new Error('PlayFab SDK not initialized'));
        return;
      }
      PlayFab.ClientApi.LoginWithCustomID(
        { CustomId: customId, CreateAccount: true },
        (result: any) => {
          if (result?.code !== 200 || !result?.data?.SessionTicket) {
            reject(new Error(result?.errorMessage || 'PlayFab login failed'));
            return;
          }
          const newSession: PlayFabSession = {
            playerId: result.data.PlayFabPlayerId,
            sessionTicket: result.data.SessionTicket,
            entityId: result.data.EntityToken?.Entity?.Id || '',
            entityType: result.data.EntityToken?.Entity?.Type || '',
          };
          setSession(newSession);
          const updateFn = PlayFab.ClientApi.UpdateUserTitleDisplayName || PlayFab.ClientApi.UpdateUserProfile;
          if (updateFn) {
            updateFn({ DisplayName: displayName }, () => resolve());
          } else {
            resolve();
          }
        }
      );
    });
  }, []);

  const hydrateProfile = useCallback((id: string, displayName: string, provider: 'google' | 'username' | 'steam', providerId: string) => {
    const savedData = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    const nextProfile: Profile = {
      id,
      user_id: id,
      playfab_id: id,
      display_name: savedData?.display_name || displayName,
      avatar_color: savedData?.avatar_color || '#26c6da',
      avatar_pixels: Array.isArray(savedData?.avatar_pixels) ? savedData.avatar_pixels : undefined,
      created_at: savedData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider,
      provider_id: providerId,
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 1. Check Steam first
      const steam = await getSteamIdentity();
      if (cancelled) return;
      setSteamIdentity(steam);

      if (steam?.isRunningInSteam) {
        const savedData = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
        const steamProfile: Profile = {
          id: steam.steamId,
          user_id: steam.steamId,
          playfab_id: steam.steamId,
          display_name: savedData?.display_name || steam.personaName || 'Steam Player',
          avatar_color: savedData?.avatar_color || '#26c6da',
          avatar_pixels: Array.isArray(savedData?.avatar_pixels) ? savedData.avatar_pixels : undefined,
          created_at: savedData?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider: 'steam',
          provider_id: steam.steamId,
        };
        setProfile(steamProfile);
        setSteamMode(true);
        setAuthMethod('steam');
        setLoading(false);
        return;
      }

      setSteamMode(false);

      const localSessionUser = getLocalSessionUser();
      if (localSessionUser) {
        try {
          await loginToPlayFab(`${LOCAL_ID_PREFIX}${localSessionUser}`, localSessionUser);
          if (!cancelled) {
            setUsernameAuth(localSessionUser);
            setAuthMethod('username');
            hydrateProfile(localSessionUser, localSessionUser, 'username', localSessionUser);
          }
          if (!cancelled) setLoading(false);
          return;
        } catch (err) {
          console.warn('Local username auto-login failed:', err);
          clearLocalSessionUser();
        }
      }

      // 2. Re-authenticate with stored Google credentials
      const stored = getStoredGoogleUser();
      if (stored) {
        setGoogleUser(stored);
        try {
          await loginToPlayFab(stored.sub, stored.name);
          if (!cancelled) {
            setAuthMethod('google');
            hydrateProfile(stored.sub, stored.name, 'google', stored.sub);
          }
        } catch (err) {
          console.warn('Auto-login failed:', err);
          clearStoredGoogleUser();
        }
      }

      if (!cancelled) setLoading(false);
    };

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateProfile, loginToPlayFab]);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const gUser = decodeGoogleCredential(credential);
    storeGoogleUser(gUser);
    setGoogleUser(gUser);

    await loginToPlayFab(gUser.sub, gUser.name);
    setAuthMethod('google');
    setUsernameAuth(null);
    hydrateProfile(gUser.sub, gUser.name, 'google', gUser.sub);
  }, [hydrateProfile, loginToPlayFab]);

  const signUpWithUsername = useCallback(async (username: string) => {
    const created = await createUsernameAccount(username);
    return { username: created.username };
  }, []);

  const signInWithUsername = useCallback(async (username: string, code: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!canSignInWithAuthenticator(normalizedUsername)) {
      throw new Error('Authenticator is not configured for this username yet');
    }

    const ok = await verifyAuthenticatorCode(normalizedUsername, code);
    if (!ok) {
      throw new Error('Invalid authenticator code');
    }

    setLocalSessionUser(normalizedUsername);
    await loginToPlayFab(`${LOCAL_ID_PREFIX}${normalizedUsername}`, normalizedUsername);
    setUsernameAuth(normalizedUsername);
    setGoogleUser(null);
    setAuthMethod('username');
    hydrateProfile(normalizedUsername, normalizedUsername, 'username', normalizedUsername);
    return { success: true };
  }, [hydrateProfile, loginToPlayFab]);

  const completeUsernameSignup = useCallback(async (username: string, code: string) => {
    const ok = await confirmAuthenticatorSetup(username, code);
    if (!ok) {
      throw new Error('Invalid authenticator code');
    }

    setLocalSessionUser(username);
    await loginToPlayFab(`${LOCAL_ID_PREFIX}${username}`, username);
    setUsernameAuth(username);
    setGoogleUser(null);
    setAuthMethod('username');
    hydrateProfile(username, username, 'username', username);
  }, [hydrateProfile, loginToPlayFab]);

  const beginAuthenticatorSetup = useCallback(async (username?: string): Promise<AuthenticatorSetup> => {
    const target = username || usernameAuth;
    if (!target) {
      throw new Error('Username is required to configure authenticator');
    }
    return createAuthenticatorSetup(target);
  }, [usernameAuth]);

  const confirmAuthenticator = useCallback(async (code: string) => {
    if (!usernameAuth) {
      throw new Error('No username account is currently signed in');
    }
    const ok = await confirmAuthenticatorSetup(usernameAuth, code);
    if (!ok) {
      throw new Error('Invalid code. Please try again.');
    }
  }, [usernameAuth]);

  const buildProfileBase = useCallback((): Profile | null => {
    if (profile) {
      return profile;
    }

    const now = new Date().toISOString();

    if (steamMode) {
      const steamId = steamIdentity?.steamId || 'steam_user';
      return {
        id: steamId,
        user_id: steamId,
        playfab_id: steamId,
        display_name: steamIdentity?.personaName || 'Steam Player',
        avatar_color: '#26c6da',
        created_at: now,
        updated_at: now,
        provider: 'steam',
        provider_id: steamId,
      };
    }

    if (authMethod === 'google' && googleUser) {
      return {
        id: googleUser.sub,
        user_id: googleUser.sub,
        playfab_id: googleUser.sub,
        display_name: googleUser.name,
        avatar_color: '#26c6da',
        created_at: now,
        updated_at: now,
        provider: 'google',
        provider_id: googleUser.sub,
      };
    }

    if (authMethod === 'username' && usernameAuth) {
      return {
        id: usernameAuth,
        user_id: usernameAuth,
        playfab_id: usernameAuth,
        display_name: usernameAuth,
        avatar_color: '#26c6da',
        created_at: now,
        updated_at: now,
        provider: 'username',
        provider_id: usernameAuth,
      };
    }

    return null;
  }, [authMethod, googleUser, profile, steamIdentity, steamMode, usernameAuth]);

  const updateProfile = async (updates: Partial<Profile>) => {
    const baseProfile = buildProfileBase();
    if (!baseProfile) {
      throw new Error('No active profile is available to update');
    }

    const current = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    const merged: Profile = {
      ...baseProfile,
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
    setProfile(merged);
    return { success: true };
  };

  const signOut = useCallback(() => {
    if (steamMode) {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
      setSession(null);
      window.location.reload();
      return;
    }

    if (authMethod === 'username') {
      clearLocalSessionUser();
      setUsernameAuth(null);
    }

    const stored = getStoredGoogleUser();
    if (stored?.email) revokeGoogleSession(stored.email);
    clearStoredGoogleUser();
    setGoogleUser(null);
    setAuthMethod(null);
    setProfile(null);
    setSession(null);
    window.location.href = '/';
  }, [authMethod, steamMode]);

  const linkedSteamId = profile?.provider?.includes('steam') ? profile.provider_id : undefined;

  return {
    user: steamMode
      ? {
          id: profile?.id || 'steam_user',
          email: undefined,
          name: profile?.display_name || steamIdentity?.personaName || 'Steam Player',
        }
      : profile
      ? {
          id: profile.id,
          email: authMethod === 'google' ? googleUser?.email : undefined,
          name: profile.display_name,
        }
      : null,
    profile,
    loading,
    isAuthenticated: steamMode ? Boolean(profile) : Boolean(profile && hasActiveSession()),
    requiresGoogleAuth: false,
    requiresUsernameSetup: false,
    signOut,
    signInWithGoogle,
    signInWithUsername,
    signUpWithUsername,
    completeUsernameSignup,
    beginAuthenticatorSetup,
    confirmAuthenticator,
    isAuthenticatorEnabled: usernameAuth ? canSignInWithAuthenticator(usernameAuth) : false,
    isUsernameAuth: authMethod === 'username',
    updateProfile,
    steamMode,
    steamIdentity,
    linkedSteamId,
    linkSteamAccount,
    completeUsernameSetup: async (_username: string) => {
      // No-op: username is set via updateProfile in this auth system
    },
  };
}
