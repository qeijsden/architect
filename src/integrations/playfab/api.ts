import { Level } from '@/types/game';
import { getSession } from './client';

const LEVELS_KEY = 'architect_levels_v2';
const REQUESTS_KEY = 'playfab_friend_requests';
const FRIENDS_KEY_PREFIX = 'playfab_friends_';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export async function getSharedLevels(): Promise<Level[]> {
  const levels = readJson<Level[]>(LEVELS_KEY, []);
  return levels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function publishLevelToPlayFab(level: Level): Promise<boolean> {
  const levels = readJson<Level[]>(LEVELS_KEY, []);
  const idx = levels.findIndex((l) => l.id === level.id);
  if (idx >= 0) {
    levels[idx] = level;
  } else {
    levels.push(level);
  }
  writeJson(LEVELS_KEY, levels);
  return true;
}

export async function sendFriendRequestToPlayFabId(
  toCustomId: string,
  fromCustomId?: string,
  fromDisplayName?: string,
  fromColor?: string,
): Promise<boolean> {
  const session = getSession();
  const sourceId = fromCustomId || session?.playerId;
  if (!sourceId || !toCustomId || sourceId === toCustomId) return false;

  const requests = readJson<any[]>(REQUESTS_KEY, []);
  const exists = requests.some((r) => r.FromCustomId === sourceId && r.ToCustomId === toCustomId);
  if (!exists) {
    requests.push({
      id: `${sourceId}_${toCustomId}_${Date.now()}`,
      FromCustomId: sourceId,
      ToCustomId: toCustomId,
      FromPlayFabId: sourceId,
      FromDisplayName: fromDisplayName || 'Player',
      Color: fromColor || '#26c6da',
      createdAt: new Date().toISOString(),
    });
    writeJson(REQUESTS_KEY, requests);
  }
  return true;
}

export async function getFriendRequests(targetCustomId?: string): Promise<any[]> {
  const session = getSession();
  const me = targetCustomId || session?.playerId;
  if (!me) return [];
  const requests = readJson<any[]>(REQUESTS_KEY, []);
  return requests.filter((r) => r.ToCustomId === me);
}

const addFriend = (ownerId: string, friendId: string, displayName: string, color: string) => {
  const key = `${FRIENDS_KEY_PREFIX}${ownerId}`;
  const list = readJson<any[]>(key, []);
  if (!list.some((f) => f.PlayFabId === friendId)) {
    list.push({ PlayFabId: friendId, DisplayName: displayName, Color: color });
    writeJson(key, list);
  }
};

export async function acceptFriendRequest(
  myCustomId: string,
  fromCustomId: string,
  fromPlayFabId?: string,
  fromDisplayName?: string,
  myDisplayName?: string,
  myColor?: string,
): Promise<boolean> {
  const requests = readJson<any[]>(REQUESTS_KEY, []).filter(
    (r) => !(r.FromCustomId === fromCustomId && r.ToCustomId === myCustomId),
  );
  writeJson(REQUESTS_KEY, requests);

  const friendId = fromPlayFabId || fromCustomId;
  addFriend(myCustomId, friendId, fromDisplayName || 'Player', '#26c6da');
  addFriend(friendId, myCustomId, myDisplayName || 'Player', myColor || '#26c6da');
  return true;
}

export async function rejectFriendRequest(myCustomId: string, fromCustomId: string): Promise<boolean> {
  const requests = readJson<any[]>(REQUESTS_KEY, []).filter(
    (r) => !(r.FromCustomId === fromCustomId && r.ToCustomId === myCustomId),
  );
  writeJson(REQUESTS_KEY, requests);
  return true;
}

export async function getCloudFriendsList(): Promise<any[]> {
  const me = getSession()?.playerId;
  if (!me) return [];
  return readJson<any[]>(`${FRIENDS_KEY_PREFIX}${me}`, []);
}

export async function removeCloudFriend(friendId: string): Promise<boolean> {
  const me = getSession()?.playerId;
  if (!me) return false;

  const key = `${FRIENDS_KEY_PREFIX}${me}`;
  const list = readJson<any[]>(key, []).filter((f) => f.PlayFabId !== friendId);
  writeJson(key, list);
  return true;
}
