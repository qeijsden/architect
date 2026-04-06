import { Block } from '@/types/game';
import { blockHasBehavior } from '@/lib/blockBehaviors';

const getCyclePosition = (block: Block, interval: number): number => {
  const anchor = Number.parseInt(block.id.replace(/\D/g, '').slice(-6) || '0', 10);
  return (Date.now() + anchor) % interval;
};

export const isPulseHazardActive = (block: Block): boolean => {
  if (!blockHasBehavior(block, 'pulse_hazard')) return false;
  const interval = Math.max(300, block.pulseInterval || 2000);
  const activeDuration = Math.max(100, Math.min(interval, block.pulseActiveDuration || 1200));
  return getCyclePosition(block, interval) < activeDuration;
};

export const isPhasePlatformActive = (block: Block): boolean => {
  if (!blockHasBehavior(block, 'phase_platform')) return false;
  const interval = Math.max(300, block.phaseInterval || 2200);
  const activeDuration = Math.max(100, Math.min(interval, block.phaseActiveDuration || 1400));
  return getCyclePosition(block, interval) < activeDuration;
};