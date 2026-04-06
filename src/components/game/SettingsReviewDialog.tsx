import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { DEFAULT_SETTINGS, GameSettings, getMissingGameSettingKeys, getStoredGameSettings, saveGameSettings } from '@/lib/gameSettings';

const SETTING_LABELS: Record<keyof GameSettings, string> = {
  masterVolume: 'Master volume',
  soundVolume: 'Sound effects volume',
  musicVolume: 'Music volume',
  particlesEnabled: 'Particle effects',
  renderDistance: 'Render distance',
  windOpacity: 'Wind opacity',
  ghostBlocksUseWindOpacity: 'Ghost block transparency',
};

export function SettingsReviewDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [missingKeys, setMissingKeys] = useState<Array<keyof GameSettings>>([]);

  useEffect(() => {
    const stored = getStoredGameSettings();
    const missing = getMissingGameSettingKeys(stored);
    setMissingKeys(missing);
    setOpen(missing.length > 0);
  }, [location.pathname]);

  const title = useMemo(() => {
    if (missingKeys.length === 0) return '';
    return missingKeys.length === Object.keys(DEFAULT_SETTINGS).length ? 'Set up your settings' : 'New settings available';
  }, [missingKeys]);

  if (!open || location.pathname === '/auth' || location.pathname === '/settings') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-lg">
        <h2 className="font-pixel text-xs text-primary mb-3">{title}</h2>
        <p className="font-pixel-body text-sm text-muted-foreground mb-4">
          Some settings still use defaults. Review them now or keep the defaults and continue.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {missingKeys.map((key) => (
            <span key={key} className="px-2 py-1 border border-border rounded font-pixel-body text-xs text-foreground bg-background/60">
              {SETTING_LABELS[key]}
            </span>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <GameButton
            variant="outline"
            onClick={() => {
              saveGameSettings({ ...DEFAULT_SETTINGS });
              setOpen(false);
            }}
          >
            Use Defaults
          </GameButton>
          <GameButton
            variant="primary"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          >
            Review Settings
          </GameButton>
        </div>
      </div>
    </div>
  );
}