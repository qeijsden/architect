import { describe, expect, it } from 'vitest';
import { prepareLevelForPublishTransport } from '@/integrations/playfab/api';
import { Level, TexturePack } from '@/types/game';

const buildNoisyTexturePack = (): TexturePack => ({
  id: 'pack-1',
  name: 'Test Pack',
  size: 16,
  createdAt: new Date().toISOString(),
  createdBy: 'tester',
  textures: {
    platform: {
      width: 16,
      height: 16,
      pixels: Array.from({ length: 256 }, (_, index) => `#${(index % 256).toString(16).padStart(2, '0')}aa${(255 - (index % 256)).toString(16).padStart(2, '0')}`),
    },
  },
});

const buildLevel = (): Level => ({
  id: 'level-test',
  name: 'Payload Test',
  author: 'Tester',
  author_id: 'user-1',
  blocks: [{ id: 'spawn', type: 'spawn', x: 0, y: 0, width: 32, height: 32 }],
  validated: true,
  plays: 42,
  likes: 17,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  completion_count: 9,
  played_by: Array.from({ length: 120 }, (_, index) => `played-user-${index.toString().padStart(4, '0')}`),
  completed_by: Array.from({ length: 120 }, (_, index) => `completed-user-${index.toString().padStart(4, '0')}`),
  liked_by: Array.from({ length: 120 }, (_, index) => `liked-user-${index.toString().padStart(4, '0')}`),
  trackUrl: 'https://music.apple.com/us/song/test/123456789',
  trackTitle: 'Song Name',
  trackArtist: 'Artist Name',
  texturePack: buildNoisyTexturePack(),
});

describe('prepareLevelForPublishTransport', () => {
  it('preserves song metadata in the publish payload', () => {
    const payload = prepareLevelForPublishTransport(buildLevel());
    expect(payload.trackUrl).toBe('https://music.apple.com/us/song/test/123456789');
    expect(payload.trackTitle).toBe('Song Name');
    expect(payload.trackArtist).toBe('Artist Name');
  });

  it('drops large arrays and texture data when the request budget is exceeded', () => {
    const payload = prepareLevelForPublishTransport(buildLevel(), { maxArgumentBytes: 1500 });
    expect(payload.played_by).toBeUndefined();
    expect(payload.completed_by).toBeUndefined();
    expect(payload.liked_by).toBeUndefined();
    expect(payload.texturePack).toBeUndefined();
  });
});
