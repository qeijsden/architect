import { useState, useEffect } from 'react';
import { GameButton } from '@/components/ui/GameButton';

type GridSizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (width: number, height: number) => void;
  defaultWidth: number;
  defaultHeight: number;
};

export function GridSizeDialog({ open, onOpenChange, onConfirm, defaultWidth, defaultHeight }: GridSizeDialogProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);

  useEffect(() => {
    setWidth(defaultWidth);
    setHeight(defaultHeight);
  }, [defaultWidth, defaultHeight, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md p-5 w-full max-w-sm">
        <h2 className="font-pixel text-xs text-primary mb-4">Grid Size</h2>
        <div className="space-y-3">
          <label className="block font-pixel-body text-sm">
            Width (px)
            <input className="mt-1 w-full bg-input border border-border px-2 py-2" type="number" min={320} step={32} value={width} onChange={(e) => setWidth(parseInt(e.target.value || '0', 10))} />
          </label>
          <label className="block font-pixel-body text-sm">
            Height (px)
            <input className="mt-1 w-full bg-input border border-border px-2 py-2" type="number" min={320} step={32} value={height} onChange={(e) => setHeight(parseInt(e.target.value || '0', 10))} />
          </label>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <GameButton variant="outline" onClick={() => onOpenChange(false)}>Cancel</GameButton>
          <GameButton
            variant="primary"
            onClick={() => {
              onConfirm(Math.max(320, width), Math.max(320, height));
              onOpenChange(false);
            }}
          >
            Apply
          </GameButton>
        </div>
      </div>
    </div>
  );
}
