import { useEffect, useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';

const KEY = 'architect_startup_warning_dismissed';

export function StartupWarningDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(KEY) === '1';
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-lg">
        <h2 className="font-pixel text-xs text-primary mb-3">Warning</h2>
        <p className="font-pixel-body text-sm text-muted-foreground mb-4">
          Warning this game is missing art assets, create and share them using BLOX editor in level creation and share them through feature request to add the BLOX back.
        </p>
        <div className="flex justify-end">
          <GameButton
            variant="primary"
            onClick={() => {
              localStorage.setItem(KEY, '1');
              setOpen(false);
            }}
          >
            Continue
          </GameButton>
        </div>
      </div>
    </div>
  );
}
