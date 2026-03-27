import { RealtimeChannel } from '@supabase/supabase-js';

type LobbyStatus = 'waiting' | 'playing' | 'finished';

export type SupabaseLobbyPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  player_name: string;
  color: string;
  is_ready: boolean;
  has_finished: boolean;
  position_x: number;
  position_y: number;
};

export type LobbyWithPlayers = {
  id: string;
  level_id: string;
  host_id: string;
  host_name: string;
  room_code: string | null;
  is_public: boolean;
  max_players: number;
  current_players: number;
  status: LobbyStatus;
  created_at: string;
  players: SupabaseLobbyPlayer[];
};

const LOBBIES_KEY = 'architect_lobbies_v1';
const channelMap = new Map<string, BroadcastChannel>();

const readLobbies = (): LobbyWithPlayers[] => {
  try {
    const raw = localStorage.getItem(LOBBIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLobbies = (lobbies: LobbyWithPlayers[]) => {
  localStorage.setItem(LOBBIES_KEY, JSON.stringify(lobbies));
};

const notifyLobbyChanged = (lobbyId: string) => {
  const channel = channelMap.get(lobbyId);
  if (channel) channel.postMessage({ type: 'changed', lobbyId });
};

export async function createLobby(
  levelId: string,
  hostId: string,
  hostName: string,
  isPublic: boolean,
  roomCode: string | null,
  maxPlayers: number,
  playerColor: string,
): Promise<LobbyWithPlayers> {
  const lobbies = readLobbies();
  const lobby: LobbyWithPlayers = {
    id: `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    level_id: levelId,
    host_id: hostId,
    host_name: hostName,
    room_code: roomCode,
    is_public: isPublic,
    max_players: maxPlayers,
    current_players: 1,
    status: 'waiting',
    created_at: new Date().toISOString(),
    players: [
      {
        id: `${hostId}_${Date.now()}`,
        lobby_id: '',
        user_id: hostId,
        player_name: hostName,
        color: playerColor,
        is_ready: false,
        has_finished: false,
        position_x: 64,
        position_y: 64,
      },
    ],
  };
  lobby.players[0].lobby_id = lobby.id;
  lobbies.push(lobby);
  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return lobby;
}

export async function joinLobby(
  lobbyId: string,
  userId: string,
  displayName: string,
  playerColor: string,
): Promise<LobbyWithPlayers | null> {
  const lobbies = readLobbies();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) return null;
  if (lobby.players.some((p) => p.user_id === userId)) return lobby;
  if (lobby.current_players >= lobby.max_players) throw new Error('Lobby is full');

  lobby.players.push({
    id: `${userId}_${Date.now()}`,
    lobby_id: lobby.id,
    user_id: userId,
    player_name: displayName,
    color: playerColor,
    is_ready: false,
    has_finished: false,
    position_x: 64,
    position_y: 64,
  });
  lobby.current_players = lobby.players.length;
  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return lobby;
}

export async function findLobbyByCode(code: string): Promise<LobbyWithPlayers | null> {
  const lobbies = readLobbies();
  return lobbies.find((l) => l.room_code === code && l.status === 'waiting') || null;
}

export async function getLobby(lobbyId: string): Promise<LobbyWithPlayers | null> {
  const lobbies = readLobbies();
  return lobbies.find((l) => l.id === lobbyId) || null;
}

export async function getPublicLobbies(): Promise<LobbyWithPlayers[]> {
  const lobbies = readLobbies();
  return lobbies
    .filter((l) => l.is_public && l.status === 'waiting')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function setPlayerReady(lobbyId: string, userId: string, ready: boolean): Promise<boolean> {
  const lobbies = readLobbies();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) return false;
  const player = lobby.players.find((p) => p.user_id === userId);
  if (!player) return false;
  player.is_ready = ready;
  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return true;
}

export async function startGame(lobbyId: string, userId: string): Promise<boolean> {
  const lobbies = readLobbies();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby || lobby.host_id !== userId) return false;
  lobby.status = 'playing';
  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return true;
}

export async function leaveLobby(lobbyId: string, userId: string): Promise<boolean> {
  const lobbies = readLobbies();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) return false;

  lobby.players = lobby.players.filter((p) => p.user_id !== userId);
  lobby.current_players = lobby.players.length;

  if (lobby.players.length === 0) {
    writeLobbies(lobbies.filter((l) => l.id !== lobbyId));
    notifyLobbyChanged(lobbyId);
    return true;
  }

  if (lobby.host_id === userId) {
    const nextHost = lobby.players[0];
    lobby.host_id = nextHost.user_id;
    lobby.host_name = nextHost.player_name;
  }

  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return true;
}

export async function updatePlayerPosition(
  lobbyId: string,
  userId: string,
  x: number,
  y: number,
): Promise<boolean> {
  const lobbies = readLobbies();
  const lobby = lobbies.find((l) => l.id === lobbyId);
  if (!lobby) return false;
  const player = lobby.players.find((p) => p.user_id === userId);
  if (!player) return false;
  player.position_x = x;
  player.position_y = y;
  writeLobbies(lobbies);
  notifyLobbyChanged(lobby.id);
  return true;
}

export function subscribeLobbyChanges(
  lobbyId: string,
  callback: (lobby: LobbyWithPlayers) => void,
): RealtimeChannel {
  const channel = new BroadcastChannel(`architect_lobby_${lobbyId}`);
  channelMap.set(lobbyId, channel);

  channel.onmessage = async () => {
    const lobby = await getLobby(lobbyId);
    if (lobby) callback(lobby);
  };

  getLobby(lobbyId).then((lobby) => {
    if (lobby) callback(lobby);
  });

  return ({ id: lobbyId } as unknown) as RealtimeChannel;
}

export function unsubscribeLobbyChanges(channel: RealtimeChannel | null) {
  if (!channel) return;
  const lobbyId = (channel as unknown as { id?: string }).id;
  if (!lobbyId) return;
  const existing = channelMap.get(lobbyId);
  if (existing) {
    existing.close();
    channelMap.delete(lobbyId);
  }
}
