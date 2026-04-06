import { describe, expect, it } from 'vitest';
import { parseLevelMusicLink } from '@/lib/levelMusic';

describe('parseLevelMusicLink', () => {
  it('parses spotify track links', () => {
    const result = parseLevelMusicLink('https://open.spotify.com/track/1234567890abcdef');
    expect(result?.provider).toBe('spotify');
    expect(result?.embedUrl).toContain('/embed/track/1234567890abcdef');
    expect(result?.prefersExternalAutoplayFallback).toBe(true);
  });

  it('parses apple music links', () => {
    const result = parseLevelMusicLink('https://music.apple.com/us/album/test-album/123456789?i=987654321');
    expect(result?.provider).toBe('apple-music');
    expect(result?.embedUrl).toContain('embed.music.apple.com');
  });

  it('parses youtube share links', () => {
    const result = parseLevelMusicLink('https://youtu.be/dQw4w9WgXcQ');
    expect(result?.provider).toBe('youtube');
    expect(result?.embedUrl).toContain('/embed/dQw4w9WgXcQ');
  });

  it('parses direct audio links', () => {
    const result = parseLevelMusicLink('https://cdn.example.com/song.mp3');
    expect(result?.provider).toBe('direct-audio');
    expect(result?.supportsAutoplay).toBe(true);
    expect(result?.prefersExternalAutoplayFallback).toBe(false);
  });

  it('rejects unsupported links', () => {
    const result = parseLevelMusicLink('https://example.com/article');
    expect(result?.provider).toBe('unsupported');
    expect(result?.isSupported).toBe(false);
  });
});