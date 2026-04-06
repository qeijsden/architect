export type LevelMusicProvider = 'spotify' | 'apple-music' | 'youtube' | 'direct-audio' | 'unsupported';

export interface ParsedLevelMusicLink {
  originalUrl: string;
  normalizedUrl: string;
  provider: LevelMusicProvider;
  providerLabel: string;
  isSupported: boolean;
  supportsAutoplay: boolean;
  prefersExternalAutoplayFallback: boolean;
  requiresVisiblePlayer: boolean;
  openLabel: string;
  helperText: string;
  embedUrl?: string;
  embedHeight?: number;
  error?: string;
}

const DIRECT_AUDIO_PATTERN = /\.(mp3|wav|ogg|m4a|aac|flac|opus)(?:$|[?#])/i;

const createUnsupportedResult = (originalUrl: string, normalizedUrl: string, error?: string): ParsedLevelMusicLink => ({
  originalUrl,
  normalizedUrl,
  provider: 'unsupported',
  providerLabel: 'Unsupported link',
  isSupported: false,
  supportsAutoplay: false,
  prefersExternalAutoplayFallback: false,
  requiresVisiblePlayer: false,
  openLabel: 'Open link',
  helperText: error || 'Use a Spotify, Apple Music, YouTube, or direct audio URL.',
  error,
});

const normalizeUrlInput = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const parseSpotifyUrl = (url: URL, originalUrl: string): ParsedLevelMusicLink => {
  const segments = url.pathname.split('/').filter(Boolean);
  const mediaType = segments[0];
  const mediaId = segments[1];

  if (!mediaType || !mediaId || !['track', 'album', 'playlist', 'episode', 'show'].includes(mediaType)) {
    return createUnsupportedResult(originalUrl, url.toString(), 'Spotify links must point to a track, album, playlist, episode, or show.');
  }

  return {
    originalUrl,
    normalizedUrl: url.toString(),
    provider: 'spotify',
    providerLabel: 'Spotify',
    isSupported: true,
    supportsAutoplay: false,
    prefersExternalAutoplayFallback: true,
    requiresVisiblePlayer: true,
    openLabel: 'Open in Spotify',
    helperText: 'Spotify does not reliably autoplay in embeds, so the game opens the song immediately as a fallback.',
    embedUrl: `https://open.spotify.com/embed/${mediaType}/${mediaId}?utm_source=generator`,
    embedHeight: mediaType === 'track' || mediaType === 'episode' ? 152 : 352,
  };
};

const parseAppleMusicUrl = (url: URL, originalUrl: string): ParsedLevelMusicLink => {
  if (!url.pathname || url.pathname === '/') {
    return createUnsupportedResult(originalUrl, url.toString(), 'Apple Music links must point to a song, album, or playlist.');
  }

  const embedUrl = new URL(url.toString());
  embedUrl.hostname = 'embed.music.apple.com';
  if (!embedUrl.searchParams.has('app')) {
    embedUrl.searchParams.set('app', 'music');
  }

  return {
    originalUrl,
    normalizedUrl: url.toString(),
    provider: 'apple-music',
    providerLabel: 'Apple Music',
    isSupported: true,
    supportsAutoplay: false,
    prefersExternalAutoplayFallback: true,
    requiresVisiblePlayer: true,
    openLabel: 'Open in Apple Music',
    helperText: 'Apple Music does not reliably autoplay in embeds, so the game opens the song immediately as a fallback.',
    embedUrl: embedUrl.toString(),
    embedHeight: 190,
  };
};

const parseYouTubeUrl = (url: URL, originalUrl: string): ParsedLevelMusicLink => {
  let videoId = '';

  if (url.hostname === 'youtu.be') {
    videoId = url.pathname.replace(/^\//, '').split('/')[0] || '';
  } else if (url.pathname.startsWith('/shorts/')) {
    videoId = url.pathname.split('/')[2] || '';
  } else if (url.pathname.startsWith('/embed/')) {
    videoId = url.pathname.split('/')[2] || '';
  } else {
    videoId = url.searchParams.get('v') || '';
  }

  if (!videoId) {
    return createUnsupportedResult(originalUrl, url.toString(), 'YouTube links must include a valid video ID.');
  }

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  embedUrl.searchParams.set('autoplay', '1');
  embedUrl.searchParams.set('playsinline', '1');
  embedUrl.searchParams.set('rel', '0');

  const start = url.searchParams.get('t') || url.searchParams.get('start');
  if (start) {
    const numericStart = Number.parseInt(start, 10);
    if (Number.isFinite(numericStart) && numericStart > 0) {
      embedUrl.searchParams.set('start', String(numericStart));
    }
  }

  const playlistId = url.searchParams.get('list');
  if (playlistId) {
    embedUrl.searchParams.set('list', playlistId);
  }

  return {
    originalUrl,
    normalizedUrl: url.toString(),
    provider: 'youtube',
    providerLabel: 'YouTube',
    isSupported: true,
    supportsAutoplay: true,
    prefersExternalAutoplayFallback: false,
    requiresVisiblePlayer: true,
    openLabel: 'Open in YouTube',
    helperText: 'YouTube embeds attempt to autoplay when the level starts.',
    embedUrl: embedUrl.toString(),
    embedHeight: 192,
  };
};

export const parseLevelMusicLink = (input: string): ParsedLevelMusicLink | null => {
  const normalizedInput = normalizeUrlInput(input);
  if (!normalizedInput) return null;

  let url: URL;
  try {
    url = new URL(normalizedInput);
  } catch {
    return createUnsupportedResult(input, normalizedInput, 'Enter a valid URL.');
  }

  if (DIRECT_AUDIO_PATTERN.test(url.pathname)) {
    return {
      originalUrl: input,
      normalizedUrl: url.toString(),
      provider: 'direct-audio',
      providerLabel: 'Audio file',
      isSupported: true,
      supportsAutoplay: true,
      prefersExternalAutoplayFallback: false,
      requiresVisiblePlayer: false,
      openLabel: 'Open audio file',
      helperText: 'Direct audio files autoplay in-game and loop while the level is active.',
    };
  }

  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

  if (hostname === 'open.spotify.com' || hostname === 'play.spotify.com') {
    return parseSpotifyUrl(url, input);
  }

  if (hostname === 'music.apple.com' || hostname === 'embed.music.apple.com') {
    return parseAppleMusicUrl(url, input);
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be') {
    return parseYouTubeUrl(url, input);
  }

  return createUnsupportedResult(input, url.toString());
};