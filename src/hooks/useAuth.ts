import { useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { Profile } from '@/types/game';
import { getSteamIdentity, SteamIdentity } from '@/lib/steam';

const PROFILE_STORAGE_KEY = 'architect_profile';
const STEAM_LINK_PREFIX = 'steam_link_';

export function useAuth() {
  const clerkAuth = useClerkAuth();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [steamMode, setSteamMode] = useState(false);
  const [steamIdentity, setSteamIdentity] = useState<SteamIdentity | null>(null);

  const linkSteamAccount = useCallback((appUserId: string, steamId: string) => {
    localStorage.setItem(`${STEAM_LINK_PREFIX}${appUserId}`, steamId);
    localStorage.setItem(`${STEAM_LINK_PREFIX}reverse_${steamId}`, appUserId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const steam = await getSteamIdentity();
      if (cancelled) return;
      setSteamIdentity(steam);

      if (steam?.isRunningInSteam) {
        const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
        const savedData = storedProfile ? JSON.parse(storedProfile) : {};

        const steamProfile: Profile = {
          id: steam.steamId,
          user_id: steam.steamId,
          playfab_id: steam.steamId,
          display_name: savedData?.display_name || steam.personaName || 'Steam Player',
          avatar_color: savedData?.avatar_color || '#26c6da',
          created_at: savedData?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider: 'steam',
          provider_id: steam.steamId,
        };

        setProfile(steamProfile);
        setSteamMode(true);
        setLoading(false);
        return;
      }

      setSteamMode(false);
      setLoading(!clerkLoaded);

      if (clerkLoaded && clerkUser?.id) {
        const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
        const savedData = storedProfile ? JSON.parse(storedProfile) : {};

        const linkedSteamId = localStorage.getItem(`${STEAM_LINK_PREFIX}${clerkUser.id}`) || undefined;

        const nextProfile: Profile = {
          id: clerkUser.id,
          user_id: clerkUser.id,
          playfab_id: linkedSteamId || null,
          display_name: savedData?.display_name || clerkUser.fullName || clerkUser.username || 'Player',
          avatar_color: savedData?.avatar_color || '#26c6da',
          created_at: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider: linkedSteamId ? 'steam+clerk' : (clerkUser.externalAccounts?.[0]?.provider || 'email'),
          provider_id: linkedSteamId || clerkUser.externalAccounts?.[0]?.externalId,
        };

        if (steam?.steamId) {
          linkSteamAccount(clerkUser.id, steam.steamId);
          nextProfile.playfab_id = steam.steamId;
          nextProfile.provider = 'steam+clerk';
          nextProfile.provider_id = steam.steamId;
        }

        setProfile(nextProfile);
      } else if (clerkLoaded && !clerkUser) {
        setProfile(null);
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, clerkUser, linkSteamAccount]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile?.id) {
      throw new Error('Not authenticated');
    }

    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    const currentData = storedProfile ? JSON.parse(storedProfile) : {};
    const merged = { ...currentData, ...updates };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    return { success: true };
  };

  const linkedSteamId = profile?.provider?.includes('steam') ? profile.provider_id : undefined;

  return {
    user: steamMode
      ? {
          id: profile?.id || 'steam_user',
          email: undefined,
          name: profile?.display_name || steamIdentity?.personaName || 'Steam Player',
        }
      : clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.emailAddresses?.[0]?.emailAddress,
            name: clerkUser.fullName || clerkUser.username,
          }
        : null,
    profile,
    loading,
    isAuthenticated: steamMode || (!!clerkUser && clerkLoaded),
    signOut: () => {
      if (steamMode) {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        window.location.reload();
      } else {
        clerkAuth.signOut();
      }
    },
    updateProfile,
    steamMode,
    steamIdentity,
    linkedSteamId,
    linkSteamAccount,
  };
}
