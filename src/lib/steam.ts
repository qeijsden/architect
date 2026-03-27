export type SteamIdentity = {
  steamId: string;
  personaName: string;
  isRunningInSteam: boolean;
};

export function isTauriRuntime() {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export async function getSteamIdentity(): Promise<SteamIdentity | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const identity = await invoke<SteamIdentity | null>('steam_identity');
    if (!identity || !identity.steamId) {
      return null;
    }
    return identity;
  } catch {
    return null;
  }
}
