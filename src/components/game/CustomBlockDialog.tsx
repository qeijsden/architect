import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomBlockDefinition, PixelData, DEFAULT_BLOCK_SETTINGS } from '@/types/game';
import { GameButton } from '@/components/ui/GameButton';

type CustomBlockDialogProps = {
  open: boolean;
  customBlock?: CustomBlockDefinition | null;
  onClose: () => void;
  onSave: (definition: CustomBlockDefinition) => void;
};

const SPRITE_SIZE = 32;
const PIXEL_SIZE = 10;

const blankSprite = (): string[] => new Array(SPRITE_SIZE * SPRITE_SIZE).fill('transparent');

const cloneSprite = (sprite?: PixelData | null): string[] => {
  if (!sprite) return blankSprite();
  const next = blankSprite();
  for (let y = 0; y < SPRITE_SIZE; y += 1) {
    for (let x = 0; x < SPRITE_SIZE; x += 1) {
      const srcX = Math.floor((x / SPRITE_SIZE) * sprite.width);
      const srcY = Math.floor((y / SPRITE_SIZE) * sprite.height);
      next[y * SPRITE_SIZE + x] = sprite.pixels[srcY * sprite.width + srcX] || 'transparent';
    }
  }
  return next;
};

export function CustomBlockDialog({ open, customBlock, onClose, onSave }: CustomBlockDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [name, setName] = useState('');
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [selectedColor, setSelectedColor] = useState('#3d4a5c');
  const [pixels, setPixels] = useState<string[]>(blankSprite);

  useEffect(() => {
    if (!open) return;
    setName(customBlock?.name || 'Custom BLOX');
    setPixels(cloneSprite(customBlock?.sprite));
  }, [customBlock, open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = SPRITE_SIZE * PIXEL_SIZE;
    canvas.height = SPRITE_SIZE * PIXEL_SIZE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < SPRITE_SIZE; y += 1) {
      for (let x = 0; x < SPRITE_SIZE; x += 1) {
        const color = pixels[y * SPRITE_SIZE + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i <= SPRITE_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * PIXEL_SIZE, 0);
      ctx.lineTo(i * PIXEL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * PIXEL_SIZE);
      ctx.lineTo(canvas.width, i * PIXEL_SIZE);
      ctx.stroke();
    }
  }, [pixels]);

  const sprite = useMemo<PixelData>(() => ({ width: SPRITE_SIZE, height: SPRITE_SIZE, pixels }), [pixels]);

  const paint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((clientY - rect.top) / PIXEL_SIZE);
    if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) return;
    const index = y * SPRITE_SIZE + x;
    setPixels((prev) => {
      const next = [...prev];
      next[index] = tool === 'draw' ? selectedColor : 'transparent';
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-pixel text-xs text-primary">{customBlock ? 'Edit Custom BLOX' : 'New Custom BLOX'}</h2>
            <p className="font-pixel-body text-xs text-muted-foreground mt-1">Draw a 32x32 sprite for the custom block. Behavior is edited from the settings panel after you select it.</p>
          </div>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-64 bg-input border border-border px-3 py-2 font-pixel-body text-xs"
            placeholder="Custom BLOX name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_220px]">
          <div className="overflow-auto border border-border bg-background/70 p-3">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair border border-border"
              onMouseDown={(event) => paint(event.clientX, event.clientY)}
              onMouseMove={(event) => {
                if (event.buttons === 0) return;
                paint(event.clientX, event.clientY);
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="border border-border bg-background/60 p-3">
              <label className="block font-pixel-body text-xs mb-2">Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="h-10 w-10" />
                <input type="text" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="flex-1 bg-input border border-border px-2 py-2 font-pixel-body text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <GameButton variant={tool === 'draw' ? 'primary' : 'outline'} size="sm" onClick={() => setTool('draw')}>Draw</GameButton>
              <GameButton variant={tool === 'erase' ? 'primary' : 'outline'} size="sm" onClick={() => setTool('erase')}>Erase</GameButton>
            </div>

            <GameButton variant="outline" size="sm" onClick={() => setPixels(blankSprite())} className="w-full">
              Clear Sprite
            </GameButton>
            <GameButton variant="outline" size="sm" onClick={() => setPixels(new Array(SPRITE_SIZE * SPRITE_SIZE).fill(selectedColor))} className="w-full">
              Fill Sprite
            </GameButton>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <GameButton variant="outline" onClick={onClose}>Cancel</GameButton>
          <GameButton
            variant="primary"
            onClick={() => {
              const now = new Date().toISOString();
              onSave({
                id: customBlock?.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: name.trim() || 'Custom BLOX',
                sprite,
                behaviorTypes: customBlock?.behaviorTypes || ['platform'],
                settings: customBlock?.settings || { ...DEFAULT_BLOCK_SETTINGS },
                createdAt: customBlock?.createdAt || now,
                updatedAt: now,
              });
            }}
          >
            Save Custom BLOX
          </GameButton>
        </div>
      </div>
    </div>
  );
}