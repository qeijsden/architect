import { BlockSettings, BlockType } from '@/types/game';

type BlockSettingsPanelProps = {
  selectedBlock: BlockType | null;
  blockSettings: BlockSettings;
  onSettingsChange: (next: BlockSettings) => void;
};

export function BlockSettingsPanel({ selectedBlock, blockSettings, onSettingsChange }: BlockSettingsPanelProps) {
  const set = <K extends keyof BlockSettings>(key: K, value: BlockSettings[K]) => {
    onSettingsChange({ ...blockSettings, [key]: value });
  };

  return (
    <div className="w-64 h-[540px] overflow-y-auto game-scrollbar bg-card/70 border border-border rounded-md p-3">
      <h3 className="font-pixel text-[10px] text-primary mb-3">Block Settings</h3>
      <p className="font-pixel-body text-xs text-muted-foreground mb-4">Selected: {selectedBlock || 'None'}</p>

      <div className="space-y-3">
        <label className="block font-pixel-body text-xs">
          Platform Color
          <input type="color" className="mt-1 w-full h-8" value={blockSettings.platformColor} onChange={(e) => set('platformColor', e.target.value)} />
        </label>

        <label className="block font-pixel-body text-xs">
          Conveyor Direction
          <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={blockSettings.conveyorDirection} onChange={(e) => set('conveyorDirection', e.target.value as BlockSettings['conveyorDirection'])}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label className="block font-pixel-body text-xs">
          Conveyor Speed: {blockSettings.conveyorSpeed}
          <input type="range" min="1" max="8" step="0.5" className="mt-1 w-full" value={blockSettings.conveyorSpeed} onChange={(e) => set('conveyorSpeed', parseFloat(e.target.value))} />
        </label>

        <label className="block font-pixel-body text-xs">
          Rotation Speed: {blockSettings.rotationSpeed}
          <input type="range" min="0.5" max="8" step="0.5" className="mt-1 w-full" value={blockSettings.rotationSpeed} onChange={(e) => set('rotationSpeed', parseFloat(e.target.value))} />
        </label>

        <label className="block font-pixel-body text-xs">
          Move Range: {blockSettings.moveRange}
          <input type="range" min="1" max="12" step="1" className="mt-1 w-full" value={blockSettings.moveRange} onChange={(e) => set('moveRange', parseInt(e.target.value, 10))} />
        </label>

        <label className="block font-pixel-body text-xs">
          Wind Force: {blockSettings.windForce.toFixed(1)}
          <input type="range" min="0.1" max="2" step="0.1" className="mt-1 w-full" value={blockSettings.windForce} onChange={(e) => set('windForce', parseFloat(e.target.value))} />
        </label>

        <label className="block font-pixel-body text-xs">
          Ramp Direction
          <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={blockSettings.rampDirection} onChange={(e) => set('rampDirection', e.target.value as BlockSettings['rampDirection'])}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
    </div>
  );
}
