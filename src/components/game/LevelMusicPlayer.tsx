import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Music4 } from 'lucide-react';
import { getGameSettings, GameSettings } from '@/lib/gameSettings';
import { parseLevelMusicLink } from '@/lib/levelMusic';

type LevelMusicPlayerProps = {
  trackUrl?: string;
  trackTitle?: string;
  trackArtist?: string;
  enabled?: boolean;
  autoplayExternalFallback?: boolean;
  className?: string;
};

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export function LevelMusicPlayer({
  trackUrl,
  trackTitle,
  trackArtist,
  enabled = true,
  autoplayExternalFallback = false,
  className = '',
}: LevelMusicPlayerProps) {
  const parsedTrack = useMemo(() => parseLevelMusicLink(trackUrl || ''), [trackUrl]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const externalFallbackOpenedRef = useRef<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>(() => getGameSettings());
  const titleLine = trackTitle?.trim() || parsedTrack?.providerLabel || 'Level Song';
  const subtitleLine = trackArtist?.trim() || parsedTrack?.normalizedUrl || '';

  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<GameSettings>).detail;
      if (detail) {
        setSettings(detail);
        return;
      }
      setSettings(getGameSettings());
    };

    window.addEventListener('game-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('game-settings-updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !parsedTrack || parsedTrack.provider !== 'direct-audio') {
      return;
    }

    audio.volume = clampVolume(settings.masterVolume * settings.musicVolume);

    if (!enabled) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      // Browser autoplay policy may still block direct audio on some platforms.
    });
  }, [enabled, parsedTrack, settings.masterVolume, settings.musicVolume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !autoplayExternalFallback || !parsedTrack?.prefersExternalAutoplayFallback) {
      return;
    }

    if (externalFallbackOpenedRef.current === parsedTrack.normalizedUrl) {
      return;
    }

    externalFallbackOpenedRef.current = parsedTrack.normalizedUrl;
    window.open(parsedTrack.normalizedUrl, '_blank', 'noopener,noreferrer');
  }, [autoplayExternalFallback, enabled, parsedTrack]);

  if (!parsedTrack?.isSupported) {
    return null;
  }

  const showEmbeddedPlayer = enabled && parsedTrack.requiresVisiblePlayer && Boolean(parsedTrack.embedUrl);

  return (
    <div className={`w-full max-w-[1200px] mb-4 border border-[#334a70] bg-[#0b1528]/95 px-3 py-3 ${className}`.trim()}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <Music4 size={16} />
            <span className="font-pixel text-xs">Level Song</span>
            <span className="font-pixel-body text-[11px] text-muted-foreground">{parsedTrack.providerLabel}</span>
          </div>
          <p className="font-pixel text-[10px] text-foreground mt-2 break-words">{titleLine}</p>
          <p className="font-pixel-body text-xs text-muted-foreground mt-1 break-all">{subtitleLine}</p>
          <p className="font-pixel-body text-[11px] text-muted-foreground mt-2">{enabled ? parsedTrack.helperText : 'Music is muted in the current audio settings.'}</p>
        </div>

        <div className="shrink-0">
          <a
            href={parsedTrack.normalizedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-[#334a70] px-3 py-2 font-pixel text-[10px] text-primary hover:bg-white/5"
          >
            <ExternalLink size={12} />
            {parsedTrack.openLabel}
          </a>
        </div>
      </div>

      {parsedTrack.provider === 'direct-audio' && (
        <audio ref={audioRef} src={parsedTrack.normalizedUrl} loop preload="metadata" />
      )}

      {showEmbeddedPlayer && parsedTrack.embedUrl && (
        <div className="mt-3 overflow-hidden border border-[#334a70] bg-black/30">
          <iframe
            src={parsedTrack.embedUrl}
            title={`${parsedTrack.providerLabel} player`}
            width="100%"
            height={parsedTrack.embedHeight || 180}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}