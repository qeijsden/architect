import { BlockType } from '@/types/game';

// Only blocks that currently have custom sprite art are enabled in the editor.
const SPRITE_READY_BLOCKS: BlockType[] = [
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
  'ramp',
  'crumbling',
  'conveyor',
  'speed_gate',
  'ice',
  'wind',
  'water',
  'teleporter',
  'rotating_beam',
  'cannon',
  'push_block',
  'directional_impact',
  'tentacle',
  'pulse_hazard',
  'phase_platform',
  'timer_orb',
  'zone',
  'custom',
];

const BLOCK_SET = new Set<BlockType>(SPRITE_READY_BLOCKS);

export const isSpriteReadyBlock = (blockType: BlockType): boolean => BLOCK_SET.has(blockType);

export const spriteReadyBlocks = SPRITE_READY_BLOCKS;
