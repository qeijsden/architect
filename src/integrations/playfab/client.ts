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

let session: PlayFabSession | null = null;

export function setSession(next: PlayFabSession | null) {
  session = next;
}

export function getSession() {
  return session;
}

export function hasActiveSession() {
  return Boolean(session?.sessionTicket);
}

type Callback = (result: any) => void;

const loginWithCustomID = (payload: { CustomId: string; CreateAccount?: boolean }, callback: Callback) => {
  const now = Date.now();
  callback({
    code: 200,
    data: {
      PlayFabPlayerId: payload.CustomId,
      SessionTicket: `local_${payload.CustomId}_${now}`,
      EntityToken: {
        Entity: {
          Id: payload.CustomId,
          Type: 'title_player_account',
        },
      },
    },
  });
};

const updateDisplayName = (_payload: any, callback: Callback) => {
  callback({ code: 200, data: {} });
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
