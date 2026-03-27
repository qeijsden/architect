import { BlockSettings, BlockType, TexturePack } from '@/types/game';
import { cn } from '@/lib/utils';

type BlockPaletteProps = {
  selectedBlock: BlockType | null;
  onSelectBlock: (block: BlockType | null) => void;
  blockSettings: BlockSettings;
  onSettingsChange: (settings: BlockSettings) => void;
  texturePack?: TexturePack;
};

const BLOCKS: Array<{ type: BlockType; label: string }> = [
  { type: 'platform', label: 'Platform' },
  { type: 'hazard', label: 'Hazard' },
  { type: 'goal', label: 'Goal' },
  { type: 'spawn', label: 'Spawn' },
  { type: 'checkpoint', label: 'Checkpoint' },
  { type: 'moving', label: 'Moving' },
  { type: 'ice', label: 'Ice' },
  { type: 'teleporter', label: 'Teleporter' },
  { type: 'crumbling', label: 'Crumbling' },
  { type: 'conveyor', label: 'Conveyor' },
  { type: 'rotating_beam', label: 'Beam Pivot' },
  { type: 'bounce', label: 'Bounce' },
  { type: 'cannon', label: 'Cannon' },
  { type: 'water', label: 'Water' },
  { type: 'wind', label: 'Wind' },
  { type: 'ramp', label: 'Ramp' },
  { type: 'air_jump', label: 'Wall Jump' },
];

export function BlockPalette({ selectedBlock, onSelectBlock, texturePack }: BlockPaletteProps) {
  return (
    <div className="w-52 h-[540px] overflow-y-auto game-scrollbar bg-card/70 border border-border rounded-md p-3">
      <h3 className="font-pixel text-[10px] text-primary mb-3">Block Palette</h3>
      {texturePack && (
        <p className="font-pixel-body text-[10px] text-accent mb-2">Texture pack: {texturePack.name}</p>
      )}
      <div className="grid grid-cols-1 gap-2">
        {BLOCKS.map((b) => (
          <button
            key={b.type}
            type="button"
            className={cn(
              'text-left px-2 py-2 rounded border font-pixel-body text-sm transition-colors',
              selectedBlock === b.type
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background/60 text-foreground border-border hover:bg-muted/70',
            )}
            onClick={() => onSelectBlock(b.type)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
