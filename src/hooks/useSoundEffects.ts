import { useCallback, useRef, useEffect } from 'react';

// Sound effect types
type SoundEffect = 'jump' | 'bounce' | 'teleport' | 'checkpoint' | 'death' | 'win' | 'crumble' | 'cannon' | 'tentacle' | 'speedBoost';

// Simple oscillator-based sound effects (no external files needed)
const SOUND_CONFIGS: Record<SoundEffect, { frequency: number; duration: number; type: OscillatorType; volume?: number }> = {
  jump: { frequency: 400, duration: 0.1, type: 'square' },
  bounce: { frequency: 600, duration: 0.15, type: 'sine' },
  teleport: { frequency: 800, duration: 0.2, type: 'sawtooth', volume: 0.3 },
  checkpoint: { frequency: 523.25, duration: 0.3, type: 'sine' }, // C5
  death: { frequency: 150, duration: 0.4, type: 'sawtooth', volume: 0.4 },
  win: { frequency: 784, duration: 0.5, type: 'sine' }, // G5
  crumble: { frequency: 100, duration: 0.2, type: 'square', volume: 0.3 },
  cannon: { frequency: 200, duration: 0.15, type: 'square', volume: 0.5 },
  tentacle: { frequency: 300, duration: 0.25, type: 'triangle' },
  speedBoost: { frequency: 1000, duration: 0.15, type: 'sine', volume: 0.4 },
};

export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const customTrackRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((effect: SoundEffect) => {
    if (!enabledRef.current) return;

    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const config = SOUND_CONFIGS[effect];
      if (!config) return;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;

      // Add some variation for more natural sound
      if (effect === 'jump') {
        oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 1.5, ctx.currentTime + config.duration);
      }

      if (effect === 'death') {
        oscillator.frequency.setValueAtTime(config.frequency * 2, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency, ctx.currentTime + config.duration);
      }

      if (effect === 'win') {
        // Play a short melody
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      }

      gainNode.gain.setValueAtTime(config.volume || 0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch (e) {
      // Silently fail if audio doesn't work
      console.warn('Audio playback failed:', e);
    }
  }, [initAudio]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled && customTrackRef.current) {
      customTrackRef.current.pause();
    }
  }, []);

  const playCustomTrack = useCallback((url: string) => {
    if (!enabledRef.current) return;

    if (customTrackRef.current) {
      customTrackRef.current.pause();
    }

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(console.warn);
      customTrackRef.current = audio;
    } catch (e) {
      console.warn('Custom track playback failed:', e);
    }
  }, []);

  const stopCustomTrack = useCallback(() => {
    if (customTrackRef.current) {
      customTrackRef.current.pause();
      customTrackRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (customTrackRef.current) {
        customTrackRef.current.pause();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSound,
    setEnabled,
    playCustomTrack,
    stopCustomTrack,
    isEnabled: enabledRef.current,
  };
}
