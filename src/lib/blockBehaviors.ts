import { Block, BlockType, CustomBehaviorType } from '@/types/game';

export const CUSTOM_BLOCK_BEHAVIOR_OPTIONS: CustomBehaviorType[] = [
  'platform',
  'hazard',
  'goal',
  'spawn',
  'bounce',
  'moving',
  'ice',
  'teleporter',
  'crumbling',
  'conveyor',
  'rotating_beam',
  'checkpoint',
  'low_gravity',
  'tentacle',
  'speed_gate',
  'ramp',
  'cannon',
  'wind',
  'directional_impact',
  'push_block',
  'water',
  'air_jump',
  'pulse_hazard',
  'phase_platform',
  'timer_orb',
  'zone',
];

export const getBlockBehaviorTypes = (block: Block): CustomBehaviorType[] => {
  if (block.type !== 'custom') {
    return [block.type as CustomBehaviorType];
  }

  if (Array.isArray(block.customBehaviorTypes) && block.customBehaviorTypes.length > 0) {
    return [...new Set(block.customBehaviorTypes)];
  }

  return ['platform'];
};

export const blockHasBehavior = (block: Block, behaviorType: CustomBehaviorType): boolean => {
  return getBlockBehaviorTypes(block).includes(behaviorType);
};

export const getPrimaryBlockBehavior = (block: Block): CustomBehaviorType => {
  return getBlockBehaviorTypes(block)[0] || 'platform';
};

export const isSolidBlock = (block: Block): boolean => {
  return [
    'platform',
    'spawn',
    'moving',
    'ice',
    'crumbling',
    'conveyor',
    'rotating_beam',
    'cannon',
    'push_block',
    'phase_platform',
  ].some((behavior) => blockHasBehavior(block, behavior));
};