import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { ArrowLeft, Eye, Volume2, Zap, RotateCcw } from 'lucide-react';
import { toast } from '@/lib/announcer';
import { DEFAULT_SETTINGS, GameSettings, SETTINGS_KEY, getMissingGameSettingKeys, getStoredGameSettings, mergeGameSettings, resetGameSettings, saveGameSettings } from '@/lib/gameSettings';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);
  const [missingKeys, setMissingKeys] = useState<Array<keyof GameSettings>>([]);

  // Load settings from localStorage
  useEffect(() => {
    const stored = getStoredGameSettings();
    setSettings(mergeGameSettings(stored));
    setMissingKeys(getMissingGameSettingKeys(stored));
  }, []);

  // Auto-save settings whenever they change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty) {
        saveGameSettings(settings);
        setIsDirty(false);
        setMissingKeys([]);
        toast.success('Settings saved', { duration: 2000 });
      }
    }, 1000); // Wait 1 second after last change before saving

    return () => clearTimeout(timer);
  }, [settings, isDirty]);

  const handleSettingChange = <K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    resetGameSettings();
    setIsDirty(false);
    setMissingKeys([]);
    toast.success('Settings reset to defaults');
  };

  const hasMissingSettings = useMemo(() => missingKeys.length > 0, [missingKeys]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <GameButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>

          <div className="mt-6">
            <h1 className="font-pixel text-2xl text-primary text-glow">SETTINGS</h1>
            <p className="font-pixel-body text-muted-foreground text-sm mt-2">
              Customize your game experience. Changes are auto-saved.
            </p>
          </div>
        </div>

        {/* Settings Panels */}
        <div className="space-y-6">
          {hasMissingSettings && (
            <div className="bg-accent/10 p-4 pixel-border border border-accent/40">
              <h2 className="font-pixel text-xs text-accent mb-2">Settings need review</h2>
              <p className="font-pixel-body text-sm text-muted-foreground">
                New or unset settings were found. Adjust them here, or keep the defaults and they will save automatically.
              </p>
            </div>
          )}

          {/* Audio Settings */}
          <div className="bg-card/50 p-6 pixel-border">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 size={16} className="text-accent" />
              <h2 className="font-pixel text-sm text-foreground">Audio Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Master Volume */}
              <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Master Volume: {(settings.masterVolume * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.masterVolume}
                  onChange={(e) => handleSettingChange('masterVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
              </div>

              {/* Sound Volume */}
              <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Sound Effects Volume: {(settings.soundVolume * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.soundVolume}
                  onChange={(e) => handleSettingChange('soundVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Music Volume: {(settings.musicVolume * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.musicVolume}
                  onChange={(e) => handleSettingChange('musicVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Visual Settings */}
          <div className="bg-card/50 p-6 pixel-border">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-accent" />
              <h2 className="font-pixel text-sm text-foreground">Visual Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Wind Opacity: {(settings.windOpacity * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={settings.windOpacity}
                  onChange={(e) => handleSettingChange('windOpacity', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
                <p className="font-pixel-body text-xs text-muted-foreground mt-1">
                  Wind blocks render at 50% opacity by default. This value also drives ghost-block transparency if you enable the option below.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="font-pixel-body text-sm text-foreground block">
                    Ghost blocks use wind opacity
                  </label>
                  <p className="font-pixel-body text-xs text-muted-foreground mt-1">
                    Applies the same transparency to ghost blocks such as ghost spawns.
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('ghostBlocksUseWindOpacity', !settings.ghostBlocksUseWindOpacity)}
                  className={`px-4 py-2 font-pixel text-xs border-2 transition-colors ${
                    settings.ghostBlocksUseWindOpacity
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-foreground'
                  }`}
                >
                  {settings.ghostBlocksUseWindOpacity ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-card/50 p-6 pixel-border">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-accent" />
              <h2 className="font-pixel text-sm text-foreground">Performance Settings</h2>
            </div>

            <div className="space-y-4">
            {/* Render Distance */}
            <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Render Distance: {settings.renderDistance}px
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={settings.renderDistance}
                  onChange={(e) => handleSettingChange('renderDistance', parseInt(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
                <p className="font-pixel-body text-xs text-muted-foreground mt-1">
                  Lower = faster performance, less detail. Higher = better detail, may impact performance.
                </p>
              </div>

              {/* Particles Toggle */}
              <div className="flex items-center justify-between">
                <label className="font-pixel-body text-sm text-foreground">
                  Particle Effects
                </label>
                <button
                  onClick={() => handleSettingChange('particlesEnabled', !settings.particlesEnabled)}
                  className={`px-4 py-2 font-pixel text-xs border-2 transition-colors ${
                    settings.particlesEnabled
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-foreground'
                  }`}
                >
                  {settings.particlesEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex gap-3">
            <GameButton
              variant="outline"
              className="flex-1"
              onClick={handleResetToDefaults}
            >
              <RotateCcw size={14} className="mr-2" />
              Reset to Defaults
            </GameButton>
          </div>

          {/* Status indicator */}
          {isDirty && (
            <div className="text-center text-sm font-pixel-body text-muted-foreground animate-pulse">
              Saving changes...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_SETTINGS, SETTINGS_KEY };
export type { GameSettings };
