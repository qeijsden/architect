export const SETTINGS_KEY = 'game_settings';

export interface GameSettings {
  masterVolume: number;
  soundVolume: number;
  musicVolume: number;
  particlesEnabled: boolean;
  renderDistance: number;
  windOpacity: number;
  ghostBlocksUseWindOpacity: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1.0,
  soundVolume: 1.0,
  musicVolume: 0.7,
  particlesEnabled: true,
  renderDistance: 200,
  windOpacity: 0.5,
  ghostBlocksUseWindOpacity: false,
};

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as Array<keyof GameSettings>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const mergeGameSettings = (input: unknown): GameSettings => {
  if (!isRecord(input)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    masterVolume: typeof input.masterVolume === 'number' ? input.masterVolume : DEFAULT_SETTINGS.masterVolume,
    soundVolume: typeof input.soundVolume === 'number' ? input.soundVolume : DEFAULT_SETTINGS.soundVolume,
    musicVolume: typeof input.musicVolume === 'number' ? input.musicVolume : DEFAULT_SETTINGS.musicVolume,
    particlesEnabled: typeof input.particlesEnabled === 'boolean' ? input.particlesEnabled : DEFAULT_SETTINGS.particlesEnabled,
    renderDistance: typeof input.renderDistance === 'number' ? input.renderDistance : DEFAULT_SETTINGS.renderDistance,
    windOpacity: typeof input.windOpacity === 'number' ? input.windOpacity : DEFAULT_SETTINGS.windOpacity,
    ghostBlocksUseWindOpacity:
      typeof input.ghostBlocksUseWindOpacity === 'boolean'
        ? input.ghostBlocksUseWindOpacity
        : DEFAULT_SETTINGS.ghostBlocksUseWindOpacity,
  };
};

export const getStoredGameSettings = (): unknown => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getGameSettings = (): GameSettings => mergeGameSettings(getStoredGameSettings());

export const getMissingGameSettingKeys = (input: unknown): Array<keyof GameSettings> => {
  if (!isRecord(input)) {
    return [...SETTINGS_KEYS];
  }

  return SETTINGS_KEYS.filter((key) => !(key in input));
};

export const saveGameSettings = (settings: GameSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('game-settings-updated', { detail: settings }));
};

export const resetGameSettings = () => {
  saveGameSettings({ ...DEFAULT_SETTINGS });
};

export const useDefaultGameSettings = () => {
  saveGameSettings({ ...DEFAULT_SETTINGS });
};
