import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { ArrowLeft, Volume2, VolumeX, Zap, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const SETTINGS_KEY = 'game_settings';

interface GameSettings {
  masterVolume: number; // 0-1
  soundVolume: number; // 0-1
  musicVolume: number; // 0-1
  cameraSpeed: number; // 0.01-0.3
  particlesEnabled: boolean;
  renderDistance: number; // 50-500 pixels
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 1.0,
  soundVolume: 1.0,
  musicVolume: 0.7,
  cameraSpeed: 0.1,
  particlesEnabled: true,
  renderDistance: 200,
};

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Auto-save settings whenever they change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        setIsDirty(false);
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
    localStorage.removeItem(SETTINGS_KEY);
    setIsDirty(false);
    toast.success('Settings reset to defaults');
  };

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

          {/* Gameplay Settings */}
          <div className="bg-card/50 p-6 pixel-border">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-accent" />
              <h2 className="font-pixel text-sm text-foreground">Gameplay Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Camera Speed */}
              <div>
                <label className="font-pixel-body text-sm text-foreground block mb-2">
                  Camera Pan Speed: {(settings.cameraSpeed * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.3"
                  step="0.01"
                  value={settings.cameraSpeed}
                  onChange={(e) => handleSettingChange('cameraSpeed', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background border border-border rounded cursor-pointer"
                />
                <p className="font-pixel-body text-xs text-muted-foreground mt-1">
                  Lower = slower panning, better for precision. Higher = faster panning, better for exploration.
                </p>
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
