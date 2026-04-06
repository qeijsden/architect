import { Level, Block, PixelData, TexturePack } from '@/types/game';
import { getSession } from './client';

const LEVELS_KEY = 'architect_levels_v2';
const REQUESTS_KEY = 'playfab_friend_requests';
const FRIENDS_KEY_PREFIX = 'playfab_friends_';
const GHOST_RUNS_PREFIX = 'architect_ghost_runs_level_';
const PLAYFAB_TITLE_ID = import.meta.env.VITE_PLAYFAB_TITLE_ID || '1FC26D';

type EncodedPixelData =
  | {
      width: number;
      height: number;
      encoding: 'rle1';
      rle: string;
    }
  | {
      width: number;
      height: number;
      encoding: 'prle1';
      palette: string[];
      rle: string;
    };

type PackedBlock = [string, string, number, number, number, number, Record<string, unknown>?];

const MAX_PUBLISH_ARGUMENT_BYTES = 300 * 1024;

const getJsonByteLength = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

const encodePixelsRle = (pixels: string[]): string => {
  if (!pixels.length) return '';
  const chunks: string[] = [];
  let runColor = pixels[0] || 'transparent';
  let runCount = 1;

  for (let i = 1; i < pixels.length; i += 1) {
    const color = pixels[i] || 'transparent';
    if (color === runColor) {
      runCount += 1;
      continue;
    }
    chunks.push(`${runCount}:${runColor}`);
    runColor = color;
    runCount = 1;
  }
  chunks.push(`${runCount}:${runColor}`);
  return chunks.join('|');
};

const decodePixelsRle = (rle: string): string[] => {
  if (!rle) return [];
  const out: string[] = [];
  const tokens = rle.split('|');
  for (const token of tokens) {
    const sep = token.indexOf(':');
    if (sep <= 0) continue;
    const count = Number(token.slice(0, sep));
    const color = token.slice(sep + 1) || 'transparent';
    for (let i = 0; i < count; i += 1) out.push(color);
  }
  return out;
};

const encodePixelData = (pixelData: PixelData): EncodedPixelData => {
  const pixels = pixelData.pixels || [];
  const palette: string[] = [];
  const paletteIndex = new Map<string, number>();
  const runs: string[] = [];
  let lastIndex = -1;
  let runLength = 0;

  for (const pixel of pixels) {
    const color = pixel || 'transparent';
    let index = paletteIndex.get(color);
    if (index === undefined) {
      index = palette.length;
      palette.push(color);
      paletteIndex.set(color, index);
    }

    if (index === lastIndex) {
      runLength += 1;
      continue;
    }

    if (runLength > 0 && lastIndex >= 0) {
      runs.push(`${runLength.toString(36)}.${lastIndex.toString(36)}`);
    }

    lastIndex = index;
    runLength = 1;
  }

  if (runLength > 0 && lastIndex >= 0) {
    runs.push(`${runLength.toString(36)}.${lastIndex.toString(36)}`);
  }

  return {
    width: pixelData.width,
    height: pixelData.height,
    encoding: 'prle1',
    palette,
    rle: runs.join(','),
  };
};

const decodePixelData = (encoded: EncodedPixelData): PixelData => {
  if (encoded.encoding === 'prle1') {
    const pixels: string[] = [];
    const runs = encoded.rle ? encoded.rle.split(',') : [];

    for (const token of runs) {
      const sep = token.indexOf('.');
      if (sep <= 0) continue;
      const count = Number.parseInt(token.slice(0, sep), 36);
      const paletteSlot = Number.parseInt(token.slice(sep + 1), 36);
      const color = encoded.palette[paletteSlot] || 'transparent';
      for (let i = 0; i < count; i += 1) {
        pixels.push(color);
      }
    }

    return {
      width: encoded.width,
      height: encoded.height,
      pixels,
    };
  }

  return {
    width: encoded.width,
    height: encoded.height,
    pixels: decodePixelsRle(encoded.rle),
  };
};

const packBlocks = (blocks: Block[]): PackedBlock[] => {
  return blocks.map((block) => {
    const { id, type, x, y, width, height, ...rest } = block as Block & Record<string, unknown>;
    const restKeys = Object.keys(rest).filter((k) => typeof rest[k] !== 'undefined');
    if (restKeys.length === 0) {
      return [id, type, x, y, width, height];
    }
    const compactRest: Record<string, unknown> = {};
    restKeys.forEach((key) => {
      compactRest[key] = rest[key];
    });
    return [id, type, x, y, width, height, compactRest];
  });
};

const unpackBlocks = (packed: PackedBlock[]): Block[] => {
  return packed.map((entry) => {
    const [id, type, x, y, width, height, rest] = entry;
    return {
      id,
      type: type as Block['type'],
      x,
      y,
      width,
      height,
      ...(rest || {}),
    } as Block;
  });
};

const pruneEmptyFields = <T extends Record<string, unknown>>(value: T): T => {
  const next = { ...value };
  Object.keys(next).forEach((key) => {
    const fieldValue = next[key];
    if (
      typeof fieldValue === 'undefined' ||
      fieldValue === null ||
      (typeof fieldValue === 'string' && fieldValue.trim() === '')
    ) {
      delete next[key];
    }
  });
  return next;
};

const trimRecentIds = (values?: string[], limit = 256): string[] | undefined => {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  if (values.length <= limit) return values;
  return values.slice(values.length - limit);
};

const packLevelCoreFields = (level: Level): Record<string, unknown> => {
  return pruneEmptyFields({
    id: level.id,
    name: level.name,
    author: level.author,
    author_name: level.author,
    author_id: level.author_id,
    validated: level.validated,
    plays: level.plays ?? 0,
    likes: level.likes ?? 0,
    createdAt: level.createdAt instanceof Date ? level.createdAt.toISOString() : level.createdAt,
    seed: level.seed,
    max_time_seconds: level.max_time_seconds,
    completion_count: level.completion_count ?? 0,
    played_by: trimRecentIds(level.played_by),
    completed_by: trimRecentIds(level.completed_by),
    liked_by: trimRecentIds(level.liked_by),
    trackUrl: level.trackUrl,
    trackTitle: level.trackTitle,
    trackArtist: level.trackArtist,
    allowImport: level.allowImport,
    gridSize: level.gridSize,
  });
};

export const prepareLevelForPublishTransport = (
  level: Level,
  options?: { maxArgumentBytes?: number },
): Record<string, unknown> => {
  const maxArgumentBytes = options?.maxArgumentBytes ?? MAX_PUBLISH_ARGUMENT_BYTES;
  const packed: Record<string, unknown> = {
    ...packLevelCoreFields(level),
    __packed: true,
    __packVersion: 2,
    blocks: packBlocks(level.blocks || []),
  };

  if (level.texturePack) {
    const encodedTextures: Record<string, EncodedPixelData> = {};
    Object.entries(level.texturePack.textures || {}).forEach(([blockType, pixelData]) => {
      if (!pixelData || !Array.isArray(pixelData.pixels)) return;
      encodedTextures[blockType] = encodePixelData(pixelData);
    });

    packed.texturePack = {
      id: level.texturePack.id,
      name: level.texturePack.name,
      size: level.texturePack.size,
      createdAt: level.texturePack.createdAt,
      createdBy: level.texturePack.createdBy,
      textures: encodedTextures,
      __encoded: 'prle1',
    };
  }

  const getArgumentSize = () => getJsonByteLength({ Level: packed });

  if (getArgumentSize() > maxArgumentBytes) {
    delete packed.played_by;
    delete packed.completed_by;
    delete packed.liked_by;
  }

  if (getArgumentSize() > maxArgumentBytes) {
    delete packed.texturePack;
  }

  if (getArgumentSize() > maxArgumentBytes) {
    throw new Error('Level is too large to publish. Reduce block count or shrink the BLOX texture pack for this level.');
  }

  return packed;
};

const unpackLevelFromTransport = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return raw;

  const unpacked = { ...raw } as any;

  if (raw.__packed && Array.isArray(raw.blocks)) {
    unpacked.blocks = unpackBlocks(raw.blocks as PackedBlock[]);
  }

  const texturePack = raw.texturePack;
  if (texturePack && texturePack.textures && typeof texturePack.textures === 'object') {
    const decodedTextures: TexturePack['textures'] = {};
    Object.entries(texturePack.textures as Record<string, any>).forEach(([blockType, payload]) => {
      if ((payload?.encoding === 'rle1' || payload?.encoding === 'prle1') && typeof payload.rle === 'string') {
        decodedTextures[blockType as keyof TexturePack['textures']] = decodePixelData(payload as EncodedPixelData);
      } else if (payload && Array.isArray(payload.pixels)) {
        decodedTextures[blockType as keyof TexturePack['textures']] = payload as PixelData;
      }
    });

    unpacked.texturePack = {
      ...texturePack,
      textures: decodedTextures,
    };
  }

  return unpacked;
};

export type GhostPoint = {
  t: number;
  x: number;
  y: number;
};

export type GhostRunPayload = {
  levelId: string;
  userId: string;
  playerName: string;
  color: string;
  avatarPixels?: string[];
  durationMs: number;
  completedAt: string;
  path: GhostPoint[];
};

export type FeatureRequestPayload = {
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  blox?: {
    name?: string | null;
    content?: string | null;
  } | null;
};

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

type CloudScriptResponse<T> = {
  code?: number;
  status?: string;
  data?: {
    FunctionResult?: T;
    Error?: {
      Message?: string;
      Error?: string;
      StackTrace?: string;
    };
  };
  error?: string;
  errorMessage?: string;
};

const normalizeLevel = (raw: any): Level => {
  const unpacked = unpackLevelFromTransport(raw);
  const createdAtValue = unpacked?.createdAt || unpacked?.created_at || new Date().toISOString();
  return {
    ...unpacked,
    plays: unpacked?.plays ?? 0,
    likes: unpacked?.likes ?? 0,
    completion_count: unpacked?.completion_count ?? 0,
    played_by: Array.isArray(unpacked?.played_by) ? unpacked.played_by : [],
    completed_by: Array.isArray(unpacked?.completed_by) ? unpacked.completed_by : [],
    liked_by: Array.isArray(unpacked?.liked_by) ? unpacked.liked_by : [],
    createdAt: new Date(createdAtValue),
  } as Level;
};

const executeCloudScript = async <T>(functionName: string, functionParameter: Record<string, unknown> = {}): Promise<T> => {
  const session = getSession();
  if (!session?.sessionTicket) {
    throw new Error('No active PlayFab session');
  }

  const response = await fetch(`https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': session.sessionTicket,
    },
    body: JSON.stringify({
      FunctionName: functionName,
      FunctionParameter: functionParameter,
      GeneratePlayStreamEvent: true,
    }),
  });

  const payload = (await response.json()) as CloudScriptResponse<T>;
  if (!response.ok) {
    throw new Error(payload?.errorMessage || payload?.error || `PlayFab request failed (${response.status})`);
  }

  if (payload?.data?.Error) {
    const err = payload.data.Error;
    throw new Error(err.Message || err.Error || 'CloudScript execution failed');
  }

  if (!payload?.data?.FunctionResult) {
    throw new Error('CloudScript returned no result');
  }

  return payload.data.FunctionResult;
};

export async function getSharedLevels(): Promise<Level[]> {
  try {
    const result = await executeCloudScript<{ success: boolean; levels?: any[] }>('GetPublishedLevels', {});
    const rawLevels = Array.isArray(result?.levels) ? result.levels : [];
    const levels = rawLevels.map(normalizeLevel);

    // Keep a local cache for fast startup/offline fallback.
    writeJson(LEVELS_KEY, levels);
    return levels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Falling back to cached levels after PlayFab fetch failure:', error);
    const cachedLevels = readJson<any[]>(LEVELS_KEY, []).map(normalizeLevel);
    return cachedLevels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function publishLevelToPlayFab(level: Level): Promise<boolean> {
  const payload = prepareLevelForPublishTransport(level);

  let result: { success: boolean; error?: string };

  try {
    result = await executeCloudScript<{ success: boolean; error?: string }>('PublishLevel', {
      Level: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('CloudScriptFunctionArgumentSizeExceeded')) {
      throw new Error('Level is too large to publish. Reduce block count or shrink the BLOX texture pack for this level.');
    }
    throw error;
  }

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to publish level to PlayFab');
  }

  // Refresh and cache latest levels from cloud after publish.
  await getSharedLevels();
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

const readGhostRunsCache = (levelId: string): GhostRunPayload[] => {
  return readJson<GhostRunPayload[]>(`${GHOST_RUNS_PREFIX}${levelId}`, []);
};

const writeGhostRunsCache = (levelId: string, runs: GhostRunPayload[]) => {
  writeJson(`${GHOST_RUNS_PREFIX}${levelId}`, runs);
};

export async function getLevelGhostRunsFromPlayFab(levelId: string): Promise<GhostRunPayload[]> {
  if (!levelId) return [];

  try {
    const result = await executeCloudScript<{ success: boolean; runs?: GhostRunPayload[]; error?: string }>('GetLevelGhostRuns', {
      LevelId: levelId,
    });

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to fetch ghost runs');
    }

    const runs = Array.isArray(result?.runs) ? result.runs : [];
    writeGhostRunsCache(levelId, runs);
    return runs;
  } catch (error) {
    console.warn('Ghost run cloud fetch failed, using cache:', error);
    return readGhostRunsCache(levelId);
  }
}

export async function publishGhostRunToPlayFab(run: GhostRunPayload): Promise<void> {
  if (!run?.levelId || !run?.userId || !Array.isArray(run.path) || run.path.length < 2) {
    throw new Error('Invalid ghost run payload');
  }

  try {
    const result = await executeCloudScript<{ success: boolean; runs?: GhostRunPayload[]; error?: string }>('PublishGhostRun', {
      Run: run,
    });

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to publish ghost run');
    }

    if (Array.isArray(result?.runs)) {
      writeGhostRunsCache(run.levelId, result.runs);
    }
    return;
  } catch (error) {
    console.warn('Ghost run cloud publish failed, writing local fallback:', error);
    const cached = readGhostRunsCache(run.levelId).filter((r) => r.userId !== run.userId);
    cached.push(run);
    cached.sort((a, b) => a.durationMs - b.durationMs);
    writeGhostRunsCache(run.levelId, cached.slice(0, 120));
  }
}

export async function publishFeatureRequestToPlayFab(request: FeatureRequestPayload): Promise<{ requestId?: string }> {
  if (!request?.title?.trim()) {
    throw new Error('Feature request title is required');
  }

  const localKey = 'architect_feature_requests';
  try {
    const result = await executeCloudScript<{ success: boolean; requestId?: string; error?: string }>('PublishFeatureRequest', {
      Title: request.title.trim(),
      Description: request.description?.trim() || '',
      UserId: request.userId,
      UserName: request.userName,
      BloxName: request.blox?.name || null,
      BloxContent: request.blox?.content || null,
    });

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to save feature request');
    }

    return { requestId: result.requestId };
  } catch (error) {
    const existing = readJson<any[]>(localKey, []);
    existing.push({
      id: `local_${Date.now()}`,
      title: request.title.trim(),
      text: request.description?.trim() || '',
      createdAt: new Date().toISOString(),
      blox: request.blox || null,
      pendingSync: true,
    });
    writeJson(localKey, existing);
    throw error;
  }
}
