import { useRef } from 'react';
import { Block, BlockSettings, BlockType, CustomBehaviorType } from '@/types/game';
import { CUSTOM_BLOCK_BEHAVIOR_OPTIONS } from '@/lib/blockBehaviors';

const clampAngle = (angle: number) => {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const directionToWindAngle = (direction: Block['windDirection']) => {
  switch (direction) {
    case 'up':
      return 270;
    case 'down':
      return 90;
    case 'left':
      return 180;
    case 'right':
    default:
      return 0;
  }
};

const angleToWindDirection = (angle: number): Block['windDirection'] => {
  const normalized = clampAngle(angle);
  if (normalized >= 45 && normalized < 135) return 'down';
  if (normalized >= 135 && normalized < 225) return 'left';
  if (normalized >= 225 && normalized < 315) return 'up';
  return 'right';
};

type WindDialProps = {
  angle: number;
  onChange: (angle: number) => void;
};

function WindDial({ angle, onChange }: WindDialProps) {
  const dialRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const angleRad = (angle * Math.PI) / 180;
  const stickLength = 26;
  const endX = 40 + Math.cos(angleRad) * stickLength;
  const endY = 40 + Math.sin(angleRad) * stickLength;

  const updateAngle = (clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const nextAngle = clampAngle((Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI);
    onChange(nextAngle);
  };

  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        ref={dialRef}
        className="relative h-20 w-20 rounded-full border-2 border-border bg-background/80 cursor-pointer select-none"
        onPointerDown={(event) => {
          event.preventDefault();
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateAngle(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        }}
        onPointerMove={(event) => {
          if (activePointerIdRef.current !== event.pointerId || !dialRef.current) return;
          updateAngle(event.clientX, event.clientY, dialRef.current.getBoundingClientRect());
        }}
        onPointerUp={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;
          activePointerIdRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <div className="absolute inset-1 rounded-full border border-border/60" />
        <svg className="absolute inset-0" viewBox="0 0 80 80" aria-hidden="true">
          <line x1="40" y1="40" x2={endX} y2={endY} stroke="rgb(226 232 240)" strokeWidth="4" strokeLinecap="round" />
          <circle cx={endX} cy={endY} r="6" fill="hsl(var(--primary))" />
        </svg>
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/70" />
      </div>
      <div className="font-pixel-body text-[10px] text-muted-foreground">
        <div>Angle: {Math.round(angle)}°</div>
        <div>Direction: {angleToWindDirection(angle)}</div>
      </div>
    </div>
  );
}

type BlockSettingsPanelProps = {
  selectedBlock: BlockType | null;
  blockSettings: BlockSettings;
  onSettingsChange: (next: BlockSettings) => void;
  selectedPlacedBlock?: Block | null;
  onUpdateSelectedBlock?: (updates: Partial<Block>) => void;
  activeMode?: 'place' | 'edit';
};

export function BlockSettingsPanel({
  selectedBlock,
  blockSettings,
  onSettingsChange,
  selectedPlacedBlock,
  onUpdateSelectedBlock,
  activeMode = 'place',
}: BlockSettingsPanelProps) {
  const activePlacedBlock = activeMode === 'edit' ? selectedPlacedBlock : null;
  const editingType = activePlacedBlock?.type || selectedBlock;
  const isCustom = editingType === 'custom';

  const set = <K extends keyof BlockSettings>(key: K, value: BlockSettings[K]) => {
    onSettingsChange({ ...blockSettings, [key]: value });
  };

  const setPlaced = (updates: Partial<Block>) => {
    if (!activePlacedBlock || !onUpdateSelectedBlock) return;
    onUpdateSelectedBlock(updates);
  };

  const updateValue = <K extends keyof BlockSettings>(
    key: K,
    value: BlockSettings[K],
    blockField?: keyof Block,
  ) => {
    if (activePlacedBlock) {
      setPlaced({ [(blockField || key) as keyof Block]: value } as Partial<Block>);
      return;
    }
    set(key, value);
  };

  const toggleCustomBehavior = (behaviorType: CustomBehaviorType) => {
    if (activePlacedBlock) {
      const current = new Set(activePlacedBlock.customBehaviorTypes || ['platform']);
      if (current.has(behaviorType)) current.delete(behaviorType);
      else current.add(behaviorType);
      setPlaced({ customBehaviorTypes: Array.from(current) });
      return;
    }

    const current = new Set(blockSettings.customBehaviorTypes || ['platform']);
    if (current.has(behaviorType)) current.delete(behaviorType);
    else current.add(behaviorType);
    set('customBehaviorTypes', Array.from(current) as BlockSettings['customBehaviorTypes']);
  };

  const hasBehavior = (behaviorType: BlockType) => {
    if (isCustom) {
      const source = activePlacedBlock?.customBehaviorTypes || blockSettings.customBehaviorTypes;
      return source.includes(behaviorType as CustomBehaviorType);
    }
    return editingType === behaviorType;
  };

  const windAngle = activePlacedBlock?.windAngle ?? blockSettings.windAngle ?? directionToWindAngle(activePlacedBlock?.windDirection || blockSettings.windDirection);

  return (
    <div className="w-64 h-[540px] overflow-y-auto game-scrollbar bg-card/70 border border-border rounded-md p-3">
      <h3 className="font-pixel text-[10px] text-primary mb-3">BLOX Settings</h3>
      {!editingType && <p className="font-pixel-body text-xs text-muted-foreground">Select a block from the palette or click a placed block.</p>}
      {editingType && (
        <p className="font-pixel-body text-[10px] text-accent mb-3 capitalize">
          {activePlacedBlock ? '▶ Placed ' : '◉ Palette '}{editingType.replace(/_/g, ' ')}
        </p>
      )}

      <div className="space-y-3">
        {isCustom && (
          <div className="border border-border rounded p-2 bg-background/50">
            <p className="font-pixel text-[10px] text-primary mb-2">Enabled Behaviors</p>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {CUSTOM_BLOCK_BEHAVIOR_OPTIONS.map((behaviorType) => {
                const checked = activePlacedBlock
                  ? (activePlacedBlock.customBehaviorTypes || []).includes(behaviorType)
                  : blockSettings.customBehaviorTypes.includes(behaviorType);
                return (
                  <label key={behaviorType} className="flex items-center justify-between gap-2 font-pixel-body text-[11px] text-foreground">
                    <span>{behaviorType.replace(/_/g, ' ')}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleCustomBehavior(behaviorType)} />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {(hasBehavior('platform')) && (
          <label className="block font-pixel-body text-xs">
            Platform Tint
            <input
              type="color"
              className="mt-1 w-full h-8"
              value={activePlacedBlock?.platformColor || blockSettings.platformColor}
              onChange={(event) => updateValue('platformColor', event.target.value, 'platformColor')}
            />
          </label>
        )}

        {hasBehavior('conveyor') && (
          <>
            <label className="block font-pixel-body text-xs">
              Conveyor Direction
              <select
                className="mt-1 w-full bg-input border border-border px-2 py-1"
                value={activePlacedBlock?.direction || blockSettings.conveyorDirection}
                onChange={(event) => updateValue('conveyorDirection', event.target.value as BlockSettings['conveyorDirection'], 'direction')}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="block font-pixel-body text-xs">
              Conveyor Speed: {(activePlacedBlock?.moveSpeed || blockSettings.conveyorSpeed).toFixed(1)}
              <input type="range" min="1" max="8" step="0.5" className="mt-1 w-full" value={activePlacedBlock?.moveSpeed || blockSettings.conveyorSpeed} onChange={(event) => updateValue('conveyorSpeed', parseFloat(event.target.value), 'moveSpeed')} />
            </label>
          </>
        )}

        {hasBehavior('moving') && (
          <>
            <label className="block font-pixel-body text-xs">
              Move Range: {activePlacedBlock?.moveRange || blockSettings.moveRange}
              <input type="range" min="1" max="12" step="1" className="mt-1 w-full" value={activePlacedBlock?.moveRange || blockSettings.moveRange} onChange={(event) => updateValue('moveRange', parseInt(event.target.value, 10), 'moveRange')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Move Speed: {(activePlacedBlock?.moveSpeed || blockSettings.moveSpeed).toFixed(1)}
              <input type="range" min="0.1" max="2" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.moveSpeed || blockSettings.moveSpeed} onChange={(event) => updateValue('moveSpeed', parseFloat(event.target.value), 'moveSpeed')} />
            </label>
          </>
        )}

        {hasBehavior('rotating_beam') && (
          <label className="block font-pixel-body text-xs">
            Rotation Speed: {activePlacedBlock?.rotationSpeed || blockSettings.rotationSpeed}
            <input type="range" min="0.5" max="8" step="0.5" className="mt-1 w-full" value={activePlacedBlock?.rotationSpeed || blockSettings.rotationSpeed} onChange={(event) => updateValue('rotationSpeed', parseFloat(event.target.value), 'rotationSpeed')} />
          </label>
        )}

        {hasBehavior('crumbling') && (
          <>
            <label className="block font-pixel-body text-xs">
              Crumble Time: {Math.round((activePlacedBlock?.crumbleTime || blockSettings.crumbleTime) / 100) / 10}s
              <input type="range" min="200" max="4000" step="100" className="mt-1 w-full" value={activePlacedBlock?.crumbleTime || blockSettings.crumbleTime} onChange={(event) => updateValue('crumbleTime', parseInt(event.target.value, 10), 'crumbleTime')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Reset Time: {Math.round((activePlacedBlock?.resetTime || blockSettings.resetTime) / 100) / 10}s
              <input type="range" min="500" max="8000" step="100" className="mt-1 w-full" value={activePlacedBlock?.resetTime || blockSettings.resetTime} onChange={(event) => updateValue('resetTime', parseInt(event.target.value, 10), 'resetTime')} />
            </label>
          </>
        )}

        {hasBehavior('spawn') && (
          <label className="block font-pixel-body text-xs">
            Ghost
            <input type="checkbox" className="ml-2" checked={activePlacedBlock?.isGhost ?? blockSettings.spawnIsGhost} onChange={(event) => updateValue('spawnIsGhost', event.target.checked, 'isGhost')} />
          </label>
        )}

        {hasBehavior('low_gravity') && (
          <label className="block font-pixel-body text-xs">
            Gravity Multiplier: {(activePlacedBlock?.gravityMultiplier || blockSettings.gravityMultiplier).toFixed(2)}
            <input type="range" min="0.1" max="1" step="0.05" className="mt-1 w-full" value={activePlacedBlock?.gravityMultiplier || blockSettings.gravityMultiplier} onChange={(event) => updateValue('gravityMultiplier', parseFloat(event.target.value), 'gravityMultiplier')} />
          </label>
        )}

        {hasBehavior('tentacle') && (
          <>
            <label className="block font-pixel-body text-xs">
              Tentacle Radius: {(activePlacedBlock?.tentacleRadius || blockSettings.tentacleRadius).toFixed(1)}
              <input type="range" min="1" max="10" step="0.5" className="mt-1 w-full" value={activePlacedBlock?.tentacleRadius || blockSettings.tentacleRadius} onChange={(event) => updateValue('tentacleRadius', parseFloat(event.target.value), 'tentacleRadius')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Tentacle Force: {(activePlacedBlock?.tentacleForce || blockSettings.tentacleForce).toFixed(1)}
              <input type="range" min="5" max="40" step="1" className="mt-1 w-full" value={activePlacedBlock?.tentacleForce || blockSettings.tentacleForce} onChange={(event) => updateValue('tentacleForce', parseFloat(event.target.value), 'tentacleForce')} />
            </label>
          </>
        )}

        {hasBehavior('speed_gate') && (
          <>
            <label className="block font-pixel-body text-xs">
              Speed Multiplier: {(activePlacedBlock?.speedMultiplier || blockSettings.speedMultiplier).toFixed(1)}x
              <input type="range" min="1" max="5" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.speedMultiplier || blockSettings.speedMultiplier} onChange={(event) => updateValue('speedMultiplier', parseFloat(event.target.value), 'speedMultiplier')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Speed Duration: {Math.round((activePlacedBlock?.speedDuration || blockSettings.speedDuration) / 100) / 10}s
              <input type="range" min="500" max="10000" step="100" className="mt-1 w-full" value={activePlacedBlock?.speedDuration || blockSettings.speedDuration} onChange={(event) => updateValue('speedDuration', parseInt(event.target.value, 10), 'speedDuration')} />
            </label>
          </>
        )}

        {hasBehavior('ramp') && (
          <label className="block font-pixel-body text-xs">
            Ramp Direction
            <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={activePlacedBlock?.rampDirection || blockSettings.rampDirection} onChange={(event) => updateValue('rampDirection', event.target.value as BlockSettings['rampDirection'], 'rampDirection')}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
        )}

        {hasBehavior('cannon') && (
          <>
            <label className="block font-pixel-body text-xs">
              Cannon Angle: {Math.round(activePlacedBlock?.cannonAngle || blockSettings.cannonAngle)}°
              <input type="range" min="0" max="360" step="1" className="mt-1 w-full" value={activePlacedBlock?.cannonAngle || blockSettings.cannonAngle} onChange={(event) => updateValue('cannonAngle', parseFloat(event.target.value), 'cannonAngle')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Cannon Arc: {Math.round(activePlacedBlock?.cannonArc || blockSettings.cannonArc)}°
              <input type="range" min="0" max="180" step="1" className="mt-1 w-full" value={activePlacedBlock?.cannonArc || blockSettings.cannonArc} onChange={(event) => updateValue('cannonArc', parseFloat(event.target.value), 'cannonArc')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Cannon Interval: {Math.round((activePlacedBlock?.cannonInterval || blockSettings.cannonInterval) / 100) / 10}s
              <input type="range" min="200" max="5000" step="100" className="mt-1 w-full" value={activePlacedBlock?.cannonInterval || blockSettings.cannonInterval} onChange={(event) => updateValue('cannonInterval', parseInt(event.target.value, 10), 'cannonInterval')} />
            </label>
          </>
        )}

        {hasBehavior('wind') && (
          <>
            <label className="block font-pixel-body text-xs">
              Wind Direction
              <WindDial angle={windAngle} onChange={(angle) => {
                if (activePlacedBlock) {
                  setPlaced({ windAngle: angle, windDirection: angleToWindDirection(angle) });
                  return;
                }
                onSettingsChange({
                  ...blockSettings,
                  windAngle: angle,
                  windDirection: angleToWindDirection(angle),
                });
              }} />
            </label>
            <label className="block font-pixel-body text-xs">
              Wind Force: {(activePlacedBlock?.windForce || blockSettings.windForce).toFixed(1)}
              <input type="range" min="0.1" max="4" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.windForce || blockSettings.windForce} onChange={(event) => updateValue('windForce', parseFloat(event.target.value), 'windForce')} />
            </label>
          </>
        )}

        {hasBehavior('directional_impact') && (
          <>
            <label className="block font-pixel-body text-xs">
              Knockback Force: {(activePlacedBlock?.knockbackForce || blockSettings.knockbackForce).toFixed(1)}
              <input type="range" min="5" max="40" step="1" className="mt-1 w-full" value={activePlacedBlock?.knockbackForce || blockSettings.knockbackForce} onChange={(event) => updateValue('knockbackForce', parseFloat(event.target.value), 'knockbackForce')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Knockback Direction
              <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={activePlacedBlock?.knockbackDirection || blockSettings.knockbackDirection} onChange={(event) => updateValue('knockbackDirection', event.target.value as BlockSettings['knockbackDirection'], 'knockbackDirection')}>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="up">Up</option>
                <option value="down">Down</option>
              </select>
            </label>
          </>
        )}

        {hasBehavior('push_block') && (
          <>
            <label className="block font-pixel-body text-xs">
              Shape
              <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={activePlacedBlock?.pushBlockShape || blockSettings.pushBlockShape} onChange={(event) => updateValue('pushBlockShape', event.target.value as BlockSettings['pushBlockShape'], 'pushBlockShape')}>
                <option value="square">Square</option>
                <option value="rectangle_h">Rectangle H</option>
                <option value="rectangle_v">Rectangle V</option>
                <option value="circle">Circle</option>
              </select>
            </label>
            <label className="block font-pixel-body text-xs">
              Weight: {(activePlacedBlock?.pushBlockWeight || blockSettings.pushBlockWeight).toFixed(1)}
              <input type="range" min="0.5" max="4" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.pushBlockWeight || blockSettings.pushBlockWeight} onChange={(event) => updateValue('pushBlockWeight', parseFloat(event.target.value), 'pushBlockWeight')} />
            </label>
          </>
        )}

        {hasBehavior('water') && (
          <label className="block font-pixel-body text-xs">
            Water Density: {(activePlacedBlock?.waterDensity || blockSettings.waterDensity).toFixed(1)}
            <input type="range" min="0.5" max="2" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.waterDensity || blockSettings.waterDensity} onChange={(event) => updateValue('waterDensity', parseFloat(event.target.value), 'waterDensity')} />
          </label>
        )}

        {hasBehavior('air_jump') && (
          <label className="block font-pixel-body text-xs">
            Wall Jump Power: {(activePlacedBlock?.wallJumpPower || blockSettings.wallJumpPower).toFixed(1)}
            <input type="range" min="0.5" max="3" step="0.1" className="mt-1 w-full" value={activePlacedBlock?.wallJumpPower || blockSettings.wallJumpPower} onChange={(event) => updateValue('wallJumpPower', parseFloat(event.target.value), 'wallJumpPower')} />
          </label>
        )}

        {hasBehavior('ice') && (
          <>
            <label className="block font-pixel-body text-xs">
              Ice Slope
              <select className="mt-1 w-full bg-input border border-border px-2 py-1" value={activePlacedBlock?.iceSlope || blockSettings.iceSlope || ''} onChange={(event) => updateValue('iceSlope', (event.target.value || undefined) as BlockSettings['iceSlope'], 'iceSlope')}>
                <option value="">Flat</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="block font-pixel-body text-xs">
              Capped Sledding
              <input type="checkbox" className="ml-2" checked={activePlacedBlock?.capSledding ?? blockSettings.iceCappedSledding} onChange={(event) => updateValue('iceCappedSledding', event.target.checked, 'capSledding')} />
            </label>
            {(activePlacedBlock?.capSledding ?? blockSettings.iceCappedSledding) && (
              <label className="block font-pixel-body text-xs">
                Max Slide Speed: {(activePlacedBlock?.maxSlideSpeed || blockSettings.iceMaxSlideSpeed).toFixed(1)}
                <input type="range" min="4" max="40" step="0.5" className="mt-1 w-full" value={activePlacedBlock?.maxSlideSpeed || blockSettings.iceMaxSlideSpeed} onChange={(event) => updateValue('iceMaxSlideSpeed', parseFloat(event.target.value), 'maxSlideSpeed')} />
              </label>
            )}
          </>
        )}

        {hasBehavior('pulse_hazard') && (
          <>
            <label className="block font-pixel-body text-xs">
              Pulse Interval: {Math.round((activePlacedBlock?.pulseInterval || blockSettings.pulseInterval) / 100) / 10}s
              <input type="range" min="300" max="6000" step="100" className="mt-1 w-full" value={activePlacedBlock?.pulseInterval || blockSettings.pulseInterval} onChange={(event) => updateValue('pulseInterval', parseInt(event.target.value, 10), 'pulseInterval')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Active Duration: {Math.round((activePlacedBlock?.pulseActiveDuration || blockSettings.pulseActiveDuration) / 100) / 10}s
              <input type="range" min="100" max="4000" step="100" className="mt-1 w-full" value={activePlacedBlock?.pulseActiveDuration || blockSettings.pulseActiveDuration} onChange={(event) => updateValue('pulseActiveDuration', parseInt(event.target.value, 10), 'pulseActiveDuration')} />
            </label>
          </>
        )}

        {hasBehavior('phase_platform') && (
          <>
            <label className="block font-pixel-body text-xs">
              Phase Interval: {Math.round((activePlacedBlock?.phaseInterval || blockSettings.phaseInterval) / 100) / 10}s
              <input type="range" min="300" max="6000" step="100" className="mt-1 w-full" value={activePlacedBlock?.phaseInterval || blockSettings.phaseInterval} onChange={(event) => updateValue('phaseInterval', parseInt(event.target.value, 10), 'phaseInterval')} />
            </label>
            <label className="block font-pixel-body text-xs">
              Solid Duration: {Math.round((activePlacedBlock?.phaseActiveDuration || blockSettings.phaseActiveDuration) / 100) / 10}s
              <input type="range" min="100" max="4000" step="100" className="mt-1 w-full" value={activePlacedBlock?.phaseActiveDuration || blockSettings.phaseActiveDuration} onChange={(event) => updateValue('phaseActiveDuration', parseInt(event.target.value, 10), 'phaseActiveDuration')} />
            </label>
          </>
        )}

        {hasBehavior('timer_orb') && (
          <label className="block font-pixel-body text-xs">
            Timer Bonus: {(activePlacedBlock?.timerBonusSeconds || blockSettings.timerBonusSeconds).toFixed(0)}s
            <input type="range" min="1" max="30" step="1" className="mt-1 w-full" value={activePlacedBlock?.timerBonusSeconds || blockSettings.timerBonusSeconds} onChange={(event) => updateValue('timerBonusSeconds', parseFloat(event.target.value), 'timerBonusSeconds')} />
          </label>
        )}
      </div>
    </div>
  );
}