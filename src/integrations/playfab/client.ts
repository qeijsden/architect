export type RoomPlayer = {
  PlayerId: string;
  DisplayName: string;
  Color: string;
  IsReady: boolean;
  IsHost: boolean;
};

export type GameRoom = {
  RoomId: string;
  HostId: string;
  HostName: string;
  LevelId: string;
  IsPublic: boolean;
  MaxPlayers: number;
  CurrentPlayers: number;
  Status: 'waiting' | 'playing' | 'finished';
  CreatedAt: string;
  GameCode?: string;
};

export type PlayFabSession = {
  playerId: string;
  customId?: string;
  sessionTicket: string;
  entityId: string;
  entityType: string;
};

const PLAYFAB_SESSION_KEY = 'architect_playfab_session';

const readStoredSession = (): PlayFabSession | null => {
  try {
    const raw = localStorage.getItem(PLAYFAB_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayFabSession;
  } catch {
    return null;
  }
};

let session: PlayFabSession | null = readStoredSession();

export function setSession(next: PlayFabSession | null) {
  session = next;
  if (next) {
    localStorage.setItem(PLAYFAB_SESSION_KEY, JSON.stringify(next));
  } else {
    localStorage.removeItem(PLAYFAB_SESSION_KEY);
  }
}

export function getSession() {
  return session;
}

export function hasActiveSession() {
  return Boolean(session?.sessionTicket);
}

type Callback = (result: any) => void;

const clientPost = async (endpoint: string, payload: Record<string, unknown>, sessionTicket?: string) => {
  const titleId = PlayFab.settings.titleId;
  if (!titleId || titleId === 'LOCAL') {
    return {
      code: 500,
      errorMessage: 'PlayFab titleId is not configured',
    };
  }

  try {
    const response = await fetch(`https://${titleId}.playfabapi.com/Client/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionTicket ? { 'X-Authorization': sessionTicket } : {}),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return {
      code: response.status,
      ...result,
    };
  } catch (error) {
    return {
      code: 500,
      errorMessage: error instanceof Error ? error.message : 'Network error',
    };
  }
};

const loginWithCustomID = (payload: { CustomId: string; CreateAccount?: boolean }, callback: Callback) => {
  clientPost('LoginWithCustomID', {
    TitleId: PlayFab.settings.titleId,
    CustomId: payload.CustomId,
    CreateAccount: payload.CreateAccount ?? true,
  }).then((result) => callback(result));
};

const updateDisplayName = (payload: { DisplayName?: string }, callback: Callback) => {
  const sessionTicket = getSession()?.sessionTicket;
  if (!sessionTicket) {
    callback({ code: 401, errorMessage: 'No active PlayFab session' });
    return;
  }

  clientPost('UpdateUserTitleDisplayName', payload, sessionTicket).then((result) => callback(result));
};

export const PlayFab = {
  settings: {
    titleId: import.meta.env.VITE_PLAYFAB_TITLE_ID || 'LOCAL',
  },
  ClientApi: {
    LoginWithCustomID: loginWithCustomID,
    UpdateUserTitleDisplayName: updateDisplayName,
    UpdateUserProfile: updateDisplayName,
  },
};
