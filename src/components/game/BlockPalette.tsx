import { useMemo, useState } from 'react';
import { BlockSettings, BlockType, CustomBlockDefinition, TexturePack } from '@/types/game';
import { cn } from '@/lib/utils';
import { isSpriteReadyBlock } from '@/lib/editor-sprites';
import { CustomBlockDialog } from '@/components/game/CustomBlockDialog';
import { GameButton } from '@/components/ui/GameButton';

type BlockPaletteProps = {
  selectedBlock: BlockType | null;
  selectedCustomBlockId?: string | null;
  onSelectBlock: (block: BlockType | null) => void;
  onSelectCustomBlock: (customBlockId: string) => void;
  onSaveCustomBlock: (definition: CustomBlockDefinition) => void;
  onDeleteCustomBlock: (customBlockId: string) => void;
  blockSettings: BlockSettings;
  onSettingsChange: (settings: BlockSettings) => void;
  texturePack?: TexturePack;
  customBlocks?: CustomBlockDefinition[];
};

const BLOCK_LABELS: Record<BlockType, string> = {
  platform: 'Platform',
  hazard: 'Hazard',
  goal: 'Goal',
  spawn: 'Spawn',
  checkpoint: 'Checkpoint',
  moving: 'Moving',
  bounce: 'Bounce',
  air_jump: 'Wall Jump',
  speed_gate: 'Speed Gate',
  low_gravity: 'Low Gravity',
  ice: 'Ice',
  ramp: 'Ramp',
  crumbling: 'Crumbling',
  conveyor: 'Conveyor',
  water: 'Water',
  teleporter: 'Teleporter',
  rotating_beam: 'Beam Pivot',
  wind: 'Wind',
  cannon: 'Cannon',
  push_block: 'Push Block',
  directional_impact: 'Impact',
  tentacle: 'Tentacle',
  pulse_hazard: 'Pulse Hazard',
  phase_platform: 'Phase Platform',
  timer_orb: 'Timer Orb',
  zone: 'Zone',
  custom: 'Custom BLOX',
};

const BLOCK_CATEGORIES: Array<{ name: string; types: BlockType[] }> = [
  { name: 'Core', types: ['platform', 'hazard', 'goal', 'spawn', 'checkpoint'] },
  { name: 'Movement', types: ['moving', 'bounce', 'air_jump', 'speed_gate', 'low_gravity'] },
  { name: 'Terrain', types: ['ice', 'ramp', 'crumbling', 'conveyor', 'water', 'phase_platform'] },
  { name: 'Mechanics', types: ['teleporter', 'rotating_beam', 'wind', 'cannon', 'push_block', 'directional_impact', 'tentacle', 'pulse_hazard', 'timer_orb', 'zone'] },
  { name: 'Custom', types: ['custom'] },
];

const BUILT_IN_ENABLED = new Set<BlockType>([
  'platform',
  'hazard',
  'goal',
  'spawn',
  'checkpoint',
  'moving',
  'bounce',
  'air_jump',
  'speed_gate',
  'low_gravity',
  'ice',
  'ramp',
  'crumbling',
  'conveyor',
  'water',
  'teleporter',
  'rotating_beam',
  'wind',
  'cannon',
  'push_block',
  'directional_impact',
  'tentacle',
  'pulse_hazard',
  'phase_platform',
  'timer_orb',
  'zone',
]);

export function BlockPalette({
  selectedBlock,
  selectedCustomBlockId,
  onSelectBlock,
  onSelectCustomBlock,
  onSaveCustomBlock,
  onDeleteCustomBlock,
  texturePack,
  customBlocks = [],
}: BlockPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<string>(BLOCK_CATEGORIES[0].name);
  const [editingCustomBlock, setEditingCustomBlock] = useState<CustomBlockDefinition | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const currentCategory = useMemo(
    () => BLOCK_CATEGORIES.find((category) => category.name === activeCategory) || BLOCK_CATEGORIES[0],
    [activeCategory],
  );

  const isBuiltInBlockEnabled = (blockType: BlockType) => {
    if (BUILT_IN_ENABLED.has(blockType)) return true;
    return isSpriteReadyBlock(blockType);
  };

  return (
    <>
      <div className="w-56 h-[540px] flex flex-col bg-card/70 border border-border rounded-md">
        <div className="p-3 pb-0">
          <h3 className="font-pixel text-[10px] text-primary mb-2">Block Palette</h3>
          {texturePack && <p className="font-pixel-body text-[10px] text-accent mb-2">Pack: {texturePack.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-1 px-3 pb-2">
          {BLOCK_CATEGORIES.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => setActiveCategory(category.name)}
              className={cn(
                'font-pixel text-[8px] px-1 py-1.5 rounded border transition-colors',
                activeCategory === category.name
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background/60 text-muted-foreground border-border hover:bg-muted/60',
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto game-scrollbar px-3 pb-3 space-y-1">
          {currentCategory.name === 'Custom' ? (
            <div className="space-y-2">
              <GameButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setEditingCustomBlock(null);
                  setShowCustomDialog(true);
                }}
              >
                New Custom BLOX
              </GameButton>

              {customBlocks.length === 0 && (
                <p className="font-pixel-body text-[11px] text-muted-foreground leading-relaxed">
                  Create a 32x32 custom BLOX here, then tune every enabled behavior from the settings panel.
                </p>
              )}

              {customBlocks.map((customBlock) => {
                const isSelected = selectedBlock === 'custom' && selectedCustomBlockId === customBlock.id;
                return (
                  <div key={customBlock.id} className={cn('border rounded p-2', isSelected ? 'border-primary bg-primary/10' : 'border-border bg-background/50')}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        onSelectBlock('custom');
                        onSelectCustomBlock(customBlock.id);
                      }}
                    >
                      <div className="font-pixel-body text-xs text-foreground truncate">{customBlock.name}</div>
                      <div className="font-pixel-body text-[10px] text-muted-foreground truncate mt-1">
                        {customBlock.behaviorTypes.join(', ')}
                      </div>
                    </button>
                    <div className="mt-2 space-y-2">
                      <GameButton
                        variant="outline"
                        size="sm"
                        className="w-full text-[10px] leading-none"
                        onClick={() => {
                          setEditingCustomBlock(customBlock);
                          setShowCustomDialog(true);
                        }}
                      >
                        Edit
                      </GameButton>
                      <GameButton variant="destructive" size="sm" className="w-full text-[10px] leading-none" onClick={() => onDeleteCustomBlock(customBlock.id)}>
                        Delete
                      </GameButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            currentCategory.types.map((blockType) => {
              const enabled = isBuiltInBlockEnabled(blockType);
              return (
                <button
                  key={blockType}
                  type="button"
                  disabled={!enabled}
                  className={cn(
                    'w-full text-left px-2 py-2 rounded border font-pixel-body text-sm transition-colors',
                    selectedBlock === blockType
                      ? 'bg-primary text-primary-foreground border-primary'
                      : enabled
                        ? 'bg-background/60 text-foreground border-border hover:bg-muted/70'
                        : 'bg-background/30 text-muted-foreground/40 border-border/50 cursor-not-allowed',
                  )}
                  onClick={() => {
                    if (!enabled) return;
                    onSelectBlock(blockType);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{BLOCK_LABELS[blockType]}</span>
                    {!enabled && <span className="text-[10px]">Soon</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <CustomBlockDialog
        open={showCustomDialog}
        customBlock={editingCustomBlock}
        onClose={() => {
          setShowCustomDialog(false);
          setEditingCustomBlock(null);
        }}
        onSave={(definition) => {
          onSaveCustomBlock(definition);
          setShowCustomDialog(false);
          setEditingCustomBlock(null);
          onSelectBlock('custom');
          onSelectCustomBlock(definition.id);
        }}
      />
    </>
  );
}