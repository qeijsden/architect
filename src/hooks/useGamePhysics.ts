import { useCallback, useRef } from 'react';
import { Block, Player, CannonBall } from '@/types/game';
import { GamepadInput } from './useXboxGamepad';
import { blockHasBehavior, isSolidBlock } from '@/lib/blockBehaviors';
import { isPhasePlatformActive, isPulseHazardActive } from '@/lib/survivalBlocks';

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 8;
const FRICTION = 0.85;
const ICE_FRICTION = 0.98;
const ICE_MAX_SPEED_DEFAULT = 20;
const BOUNCE_FORCE = -18;
const CONVEYOR_SPEED = 3;
const GRID_SIZE = 32;
const COYOTE_TIME_FRAMES = 6; // Frames to allow jump after leaving ground
const WIND_FORCE_MULTIPLIER = 2;

const directionToAngle = (direction: Block['windDirection']): number => {
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

export function useGamePhysics() {
  const keysRef = useRef<Set<string>>(new Set());
  const gamepadInputRef = useRef<GamepadInput | null>(null);
  const crumbleTimersRef = useRef<Map<string, { breakTimer: number; resetTimer?: number }>>(new Map());
  const rotationAnglesRef = useRef<Map<string, number>>(new Map());
  const movingBlockPhaseRef = useRef<Map<string, number>>(new Map());
  const cannonTimersRef = useRef<Map<string, number>>(new Map());
  const cannonBallsRef = useRef<CannonBall[]>([]);
  const cannonSweepPhaseRef = useRef<Map<string, number>>(new Map());
  const tentacleActiveRef = useRef<Map<string, number>>(new Map());
  const checkpointTouchedRef = useRef<boolean>(false);
  const coyoteFramesRef = useRef<Map<string, number>>(new Map()); // Track frames since last ground contact

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.code);
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code);
  }, []);

  const checkCollision = useCallback((player: Player, block: Block): boolean => {
    const playerSize = 32;
    return (
      player.x < block.x + block.width &&
      player.x + playerSize > block.x &&
      player.y < block.y + block.height &&
      player.y + playerSize > block.y
    );
  }, []);

  const blocksOverlap = useCallback((a: Block, b: Block): boolean => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }, []);

  const findTeleportDestination = useCallback((block: Block, blocks: Block[]): Block | null => {
    if (block.teleportTarget) {
      return blocks.find(b => b.id === block.teleportTarget) || null;
    }
    if (!block.teleporterId) return null;
    return blocks.find(b => 
      blockHasBehavior(b, 'teleporter') && 
      b.teleporterId === block.teleporterId && 
      b.id !== block.id
    ) || null;
  }, []);

  // Get blocks adjacent to rotating beam for auto-connection
  const getAdjacentBlocks = useCallback((pivot: Block, blocks: Block[]): string[] => {
    const adjacent: string[] = [];
    const directions = [
      { dx: -GRID_SIZE, dy: 0 },
      { dx: GRID_SIZE, dy: 0 },
      { dx: 0, dy: -GRID_SIZE },
      { dx: 0, dy: GRID_SIZE },
      { dx: -GRID_SIZE, dy: -GRID_SIZE },
      { dx: GRID_SIZE, dy: -GRID_SIZE },
      { dx: -GRID_SIZE, dy: GRID_SIZE },
      { dx: GRID_SIZE, dy: GRID_SIZE },
    ];
    
    for (const block of blocks) {
      if (block.id === pivot.id || blockHasBehavior(block, 'rotating_beam')) continue;
      if (block.isLocked) continue;
      
      for (const dir of directions) {
        if (Math.abs(block.x - (pivot.x + dir.dx)) < 2 && Math.abs(block.y - (pivot.y + dir.dy)) < 2) {
          adjacent.push(block.id);
          break;
        }
      }
    }
    
    return adjacent;
  }, []);

  // Update rotating blocks - FIXED to properly rotate
  const updateRotatingBlocks = useCallback((blocks: Block[]): Block[] => {
    const pivots = blocks.filter((block) => blockHasBehavior(block, 'rotating_beam'));
    if (pivots.length === 0) return blocks;
    
    // First pass: update rotation angles for all pivots
    for (const pivot of pivots) {
      let angle = rotationAnglesRef.current.get(pivot.id) || 0;
      const speed = (pivot.rotationSpeed || 2) * 0.02;
      angle += speed;
      rotationAnglesRef.current.set(pivot.id, angle);
    }
    
    return blocks.map(block => {
      if (blockHasBehavior(block, 'rotating_beam')) return block;
      
      // Find which pivot this block should be attached to
      let attachedPivot: Block | undefined;
      
      // Explicit connection via pivotId
      if (block.pivotId) {
        attachedPivot = pivots.find(p => p.id === block.pivotId);
      }
      
      // Auto-connect if adjacent to any pivot
      if (!attachedPivot && !block.isLocked) {
        for (const pivot of pivots) {
          const adjacentIds = getAdjacentBlocks(pivot, blocks);
          if (adjacentIds.includes(block.id)) {
            attachedPivot = pivot;
            break;
          }
        }
      }
      
      if (!attachedPivot) return block;
      
      const angle = rotationAnglesRef.current.get(attachedPivot.id) || 0;
      
      const pivotCenterX = attachedPivot.x + attachedPivot.width / 2;
      const pivotCenterY = attachedPivot.y + attachedPivot.height / 2;
      
      // Store original position on first rotation
      const originalX = block.originalX ?? block.x;
      const originalY = block.originalY ?? block.y;
      
      const dx = originalX + block.width / 2 - pivotCenterX;
      const dy = originalY + block.height / 2 - pivotCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 1) return block; // Too close to pivot
      
      const initialAngle = Math.atan2(dy, dx);
      const newCenterX = pivotCenterX + distance * Math.cos(initialAngle + angle);
      const newCenterY = pivotCenterY + distance * Math.sin(initialAngle + angle);
      
      return {
        ...block,
        x: newCenterX - block.width / 2,
        y: newCenterY - block.height / 2,
        originalX,
        originalY,
        pivotId: attachedPivot.id,
      };
    });
  }, [getAdjacentBlocks]);

  // Update moving platforms
  const updateMovingBlocks = useCallback((blocks: Block[]): Block[] => {
    return blocks.map(block => {
      if (!blockHasBehavior(block, 'moving')) return block;
      
      const originalX = block.originalX ?? block.x;
      const range = (block.moveRange || 3) * GRID_SIZE;
      const speed = (block.moveSpeed || 0.5) * 0.1;
      
      let phase = movingBlockPhaseRef.current.get(block.id) || 0;
      phase += speed;
      movingBlockPhaseRef.current.set(block.id, phase);
      
      const offset = Math.sin(phase) * range;
      
      return {
        ...block,
        x: originalX + offset,
        originalX,
      };
    });
  }, []);

  // Update cannon balls with 360 degree support
  const updateCannonBalls = useCallback((blocks: Block[]): CannonBall[] => {
    const now = Date.now();
    
    const cannons = blocks.filter((block) => blockHasBehavior(block, 'cannon'));
    for (const cannon of cannons) {
      const lastFired = cannonTimersRef.current.get(cannon.id) || 0;
      const interval = cannon.cannonInterval || 2000;
      
      if (now - lastFired >= interval) {
        cannonTimersRef.current.set(cannon.id, now);
        
        let sweepPhase = cannonSweepPhaseRef.current.get(cannon.id) || 0;
        sweepPhase += 0.4;
        cannonSweepPhaseRef.current.set(cannon.id, sweepPhase);
        
        // Convert angle to radians (0 = right, 90 = up, 180 = left, 270 = down)
        const centerAngle = ((cannon.cannonAngle || 45) - 90) * (Math.PI / 180);
        const arc = (cannon.cannonArc || 30) * (Math.PI / 180);
        const currentAngle = centerAngle + Math.sin(sweepPhase) * (arc / 2);
        
        const speed = cannon.cannonSpeed || 8;
        const ball: CannonBall = {
          id: `ball-${cannon.id}-${now}`,
          x: cannon.x + cannon.width / 2,
          y: cannon.y + cannon.height / 2,
          vx: Math.cos(currentAngle) * speed,
          vy: Math.sin(currentAngle) * speed,
          cannonId: cannon.id,
        };
        cannonBallsRef.current.push(ball);
      }
    }
    
    // Update existing balls with gravity
    cannonBallsRef.current = cannonBallsRef.current
      .map(ball => ({
        ...ball,
        x: ball.x + ball.vx,
        y: ball.y + ball.vy,
        vy: ball.vy + 0.2,
      }))
      .filter(ball => ball.y < 2000 && ball.y > -1000 && ball.x > -5000 && ball.x < 10000);
    
    return cannonBallsRef.current;
  }, []);

  const updatePlayer = useCallback((
    player: Player, 
    blocks: Block[], 
    canvasHeight: number,
    updateBlock?: (id: string, updates: Partial<Block>) => void,
    cameraY?: number
  ): Player => {
    if (player.isDead || player.hasWon) return player;

    let updatedBlocks = updateRotatingBlocks(blocks);
    updatedBlocks = updateMovingBlocks(updatedBlocks);
    
    updateCannonBalls(blocks);

    let { x, y, vx, vy, isGrounded, onIce = false, lastCheckpoint, speedBoostMultiplier, speedBoostEndTime } = player;
    const playerSize = 32;
    let currentFriction = FRICTION;
    let currentGravity = GRAVITY;
    const isSolidNow = (block: Block) => {
      if (!isSolidBlock(block)) return false;
      if (blockHasBehavior(block, 'crumbling') && block.crumbleState === 'broken') return false;
      if (blockHasBehavior(block, 'phase_platform') && !isPhasePlatformActive(block)) return false;
      if (block.isGhost) return false;
      return true;
    };

    const now = Date.now();
    if (speedBoostEndTime && now >= speedBoostEndTime) {
      speedBoostMultiplier = undefined;
      speedBoostEndTime = undefined;
    }

    const effectiveSpeed = MOVE_SPEED * (speedBoostMultiplier || 1);

    // Check for wall jump blocks (before input handling)
    let canWallJump = false;
    let wallJumpPower = 1;
    for (const block of updatedBlocks) {
      if (blockHasBehavior(block, 'air_jump') && checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead: false, hasWon: false }, block)) {
        canWallJump = true;
        wallJumpPower = block.wallJumpPower || 1;
        break;
      }
    }

    // Input handling (keyboard + gamepad)
    const moveLeft = keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA') || gamepadInputRef.current?.moveLeft || false;
    const moveRight = keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD') || gamepadInputRef.current?.moveRight || false;
    const jump = keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW') || keysRef.current.has('Space') || gamepadInputRef.current?.jump || false;

    if (moveLeft) {
      vx -= effectiveSpeed * 0.3;
    }
    if (moveRight) {
      vx += effectiveSpeed * 0.3;
    }

    // Get coyote time (can jump for a few frames after leaving ground)
    const coyoteFrames = coyoteFramesRef.current.get(player.id) || 0;
    const canCoyoteJump = coyoteFrames < COYOTE_TIME_FRAMES;

    if (jump && (isGrounded || canWallJump || canCoyoteJump)) {
      vy = JUMP_FORCE * wallJumpPower;
      isGrounded = false;
      coyoteFramesRef.current.set(player.id, COYOTE_TIME_FRAMES + 1); // Consume coyote time
    }

    // Check for low gravity zones (5x5 area)
    for (const block of updatedBlocks) {
      if (blockHasBehavior(block, 'low_gravity')) {
        // 5x5 zone centered on block
        const zoneLeft = block.x - GRID_SIZE * 2;
        const zoneRight = block.x + GRID_SIZE * 3;
        const zoneTop = block.y - GRID_SIZE * 2;
        const zoneBottom = block.y + GRID_SIZE * 3;
        
        const playerCenterX = x + playerSize / 2;
        const playerCenterY = y + playerSize / 2;
        
        if (playerCenterX >= zoneLeft && playerCenterX <= zoneRight &&
            playerCenterY >= zoneTop && playerCenterY <= zoneBottom) {
          currentGravity = GRAVITY * (block.gravityMultiplier || 0.3);
          // Also reduce fall speed for floating effect
          if (vy > 0) vy *= 0.92;
          // Slight upward drift
          vy -= 0.1;
          break;
        }
      }
    }

    // Apply physics
    vx *= currentFriction;
    vy += currentGravity;

    if (!onIce) {
      vx = Math.max(-effectiveSpeed, Math.min(effectiveSpeed, vx));
    }
    vy = Math.max(-20, Math.min(15, vy));

    x += vx;
    y += vy;

    isGrounded = false;
    let isDead = false;
    let hasWon = false;
    let onIceNow = false;
    let iceBlock: Block | null = null;
    let conveyorForce = 0;

    // Cannon ball collisions
    for (const ball of cannonBallsRef.current) {
      const dist = Math.sqrt(
        Math.pow(x + playerSize / 2 - ball.x, 2) + 
        Math.pow(y + playerSize / 2 - ball.y, 2)
      );
      if (dist < 24) {
        vx += ball.vx * 0.5;
        vy += ball.vy * 0.5 - 8;
        cannonBallsRef.current = cannonBallsRef.current.filter(b => b.id !== ball.id);
      }
    }

    // Block collisions
    for (const block of updatedBlocks) {
      // Checkpoint - touching it sets respawn and deactivates spawn
      if (blockHasBehavior(block, 'checkpoint')) {
        if (checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead, hasWon }, block)) {
          if (!checkpointTouchedRef.current || 
              !lastCheckpoint || 
              lastCheckpoint.x !== block.x || 
              lastCheckpoint.y !== block.y - playerSize) {
            lastCheckpoint = { x: block.x, y: block.y - playerSize };
            checkpointTouchedRef.current = true;
          }
        }
        continue;
      }

      // Ghost spawn - no collision when checkpoint touched
      if (blockHasBehavior(block, 'spawn')) {
        if (block.isGhost || checkpointTouchedRef.current) {
          continue;
        }
      }

      // Low gravity zone - no collision
      if (blockHasBehavior(block, 'low_gravity')) {
        continue;
      }

      // Speed gate - no collision
      if (blockHasBehavior(block, 'speed_gate')) {
        if (checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead, hasWon }, block)) {
          speedBoostMultiplier = block.speedMultiplier || 2;
          speedBoostEndTime = now + (block.speedDuration || 3000);
        }
        continue;
      }

      // Tentacle - proximity slam
      if (blockHasBehavior(block, 'tentacle')) {
        const radius = (block.tentacleRadius || 3) * GRID_SIZE;
        const centerX = block.x + block.width / 2;
        const centerY = block.y + block.height / 2;
        const playerCenterX = x + playerSize / 2;
        const playerCenterY = y + playerSize / 2;
        const dist = Math.sqrt(Math.pow(playerCenterX - centerX, 2) + Math.pow(playerCenterY - centerY, 2));
        
        if (dist < radius) {
          const lastTrigger = tentacleActiveRef.current.get(block.id) || 0;
          if (now - lastTrigger > 1000) {
            tentacleActiveRef.current.set(block.id, now);
            const force = block.tentacleForce || 20;
            vy = -force;
            const pushDir = playerCenterX > centerX ? 1 : -1;
            vx += pushDir * 8;
          }
        }
        continue;
      }

      // Zone blocks - no collision, just detection
      if (blockHasBehavior(block, 'zone')) {
        // Zone detection for scoring happens in game component
        continue;
      }

      if (!checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead, hasWon }, block)) continue;

      if (blockHasBehavior(block, 'pulse_hazard') && !isPulseHazardActive(block)) {
        continue;
      }

      if (blockHasBehavior(block, 'phase_platform') && !isPhasePlatformActive(block)) {
        continue;
      }

      if (blockHasBehavior(block, 'timer_orb')) {
        if (!block.collected && updateBlock) {
          updateBlock(block.id, { collected: true });
        }
        continue;
      }

      if (blockHasBehavior(block, 'hazard') || blockHasBehavior(block, 'pulse_hazard')) {
        isDead = true;
        break;
      }

      if (blockHasBehavior(block, 'goal')) {
        hasWon = true;
        break;
      }

      if (blockHasBehavior(block, 'bounce')) {
        vy = BOUNCE_FORCE;
        continue;
      }

      if (blockHasBehavior(block, 'teleporter')) {
        const destination = findTeleportDestination(block, updatedBlocks);
        if (destination) {
          x = destination.x;
          y = destination.y - playerSize;
          vx = 0;
          vy = 0;
        }
        continue;
      }

      // Crumbling platforms
      if (blockHasBehavior(block, 'crumbling')) {
        if (block.crumbleState === 'broken') continue;
        
        const timers = crumbleTimersRef.current.get(block.id);
        if (!timers && updateBlock) {
          const crumbleTime = block.crumbleTime || 1000;
          const resetTime = block.resetTime || 3000;
          
          const breakTimer = window.setTimeout(() => {
            updateBlock(block.id, { crumbleState: 'broken' });
            
            const resetTimer = window.setTimeout(() => {
              updateBlock(block.id, { crumbleState: 'solid' });
              crumbleTimersRef.current.delete(block.id);
            }, resetTime);
            
            crumbleTimersRef.current.set(block.id, { breakTimer: 0, resetTimer });
          }, crumbleTime);
          
          crumbleTimersRef.current.set(block.id, { breakTimer });
          updateBlock(block.id, { crumbleState: 'crumbling' });
        }
      }

      // Water - buoyancy and slowness
      if (blockHasBehavior(block, 'water')) {
        if (checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead: false, hasWon: false }, block)) {
          const density = block.waterDensity || 1.2;
          vy *= 0.6; // Slow vertical movement
          vx *= 0.8; // Slow horizontal movement
          // Buoyancy and gentle rise while submerged
          vy -= currentGravity * (density - 1);
          vy -= 0.2 * density;
        }
        continue;
      }

      // Wind - applies force in direction
      if (blockHasBehavior(block, 'wind')) {
        if (checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead, hasWon }, block)) {
          const force = (block.windForce || 0.8) * WIND_FORCE_MULTIPLIER;
          const angle = ((block.windAngle ?? directionToAngle(block.windDirection)) * Math.PI) / 180;
          vx += Math.cos(angle) * force;
          vy += Math.sin(angle) * force;
        }
        continue;
      }

      // Directional Impact - knockback instead of death
      if (blockHasBehavior(block, 'directional_impact')) {
        if (checkCollision({ ...player, x, y, vx, vy, isGrounded, isDead, hasWon }, block)) {
          const force = block.knockbackForce || 15;
          const dir = block.knockbackDirection || 'up';
          if (dir === 'left') { vx = -force; vy = -8; }
          else if (dir === 'right') { vx = force; vy = -8; }
          else if (dir === 'up') { vy = -force; vx = 0; }
          else if (dir === 'down') { vy = force; vx = 0; }
        }
        continue;
      }

      // Air Jump - allows jumping off air_jump platforms
      if (blockHasBehavior(block, 'air_jump')) {
        // Just mark as solid for collision purposes
        continue;
      }

      // Ramp collision - smooth slope
      if (blockHasBehavior(block, 'ramp')) {
        const rampDir = block.rampDirection || 'right';
        const playerEdge = rampDir === 'left' ? x : x + playerSize;
        const relativeX = playerEdge - block.x;
        const progress = Math.max(0, Math.min(1, relativeX / block.width));
        const rampHeight = rampDir === 'right' 
          ? (1 - progress) * block.height 
          : progress * block.height;
        
        const rampY = block.y + block.height - rampHeight;
        if (y + playerSize > rampY && y + playerSize < block.y + block.height + 10) {
          y = rampY - playerSize;
          vy = Math.min(vy, 0);
          isGrounded = true;
          if (rampDir === 'right') vx += 0.3;
          else vx -= 0.3;
        }
        continue;
      }

      // Ice Slope collision - ice can act as a ramp
      if (blockHasBehavior(block, 'ice') && block.isSlopeIce) {
        const slopeDir = block.iceSlope || 'right';
        const relativeX = (x + playerSize / 2) - block.x;
        const progress = Math.max(0, Math.min(1, relativeX / block.width));
        const slopeHeight = slopeDir === 'right' 
          ? (1 - progress) * block.height 
          : progress * block.height;
        
        const slopeY = block.y + block.height - slopeHeight;
        if (y + playerSize > slopeY && y + playerSize < block.y + block.height + 10) {
          y = slopeY - playerSize;
          vy = Math.min(vy, 0);
          isGrounded = true;
          onIce = true;
          if (slopeDir === 'right') vx += 0.2; // Slightly less boost than ramps
          else vx -= 0.2;
        }
        continue;
      }

      // Solid block collision
      if (isSolidNow(block)) {
        const prevBottom = player.y + playerSize;
        const blockTop = block.y;

        // Landing on top
        if (prevBottom <= blockTop + 10 && vy > 0) {
          y = block.y - playerSize;
          vy = 0;
          isGrounded = true;

          if (blockHasBehavior(block, 'ice')) {
            onIceNow = true;
            iceBlock = block;
          }

          if (blockHasBehavior(block, 'conveyor')) {
            const speed = block.moveSpeed || CONVEYOR_SPEED;
            conveyorForce = block.direction === 'left' ? -speed : speed;
          }
          
          // Moving platform velocity inheritance
          if (blockHasBehavior(block, 'moving')) {
            const range = (block.moveRange || 3) * GRID_SIZE;
            const speed = (block.moveSpeed || 0.5) * 0.1;
            const phase = movingBlockPhaseRef.current.get(block.id) || 0;
            const platformVelocity = Math.cos(phase) * range * speed;
            x += platformVelocity;
          }
        }
        // Hitting from bottom
        else if (player.y >= block.y + block.height - 10 && vy < 0) {
          y = block.y + block.height;
          vy = 0;
        }
        // Side collision
        else {
          if (blockHasBehavior(block, 'push_block') && updateBlock && vx !== 0) {
            const weight = block.pushBlockWeight || 1;
            const pushDelta = Math.sign(vx) * Math.max(0.5, Math.min(4, Math.abs(vx))) / weight;
            const newX = block.x + pushDelta;
            const candidate = { ...block, x: newX };
            const isBlocked = updatedBlocks.some(other => {
              if (other.id === block.id) return false;
              if (!isSolidNow(other)) return false;
              return blocksOverlap(candidate, other);
            });

            if (!isBlocked) {
              updateBlock(block.id, { x: newX });
              if (vx > 0) x = newX - playerSize;
              else if (vx < 0) x = newX + block.width;
              vx = 0;
              continue;
            }
          }

          if (vx > 0) {
            x = block.x - playerSize;
          } else if (vx < 0) {
            x = block.x + block.width;
          }
          vx = 0;
        }
      }
    }

    if (onIceNow) {
      vx *= ICE_FRICTION / FRICTION;
      const maxIceSpeed = (iceBlock?.capSledding && iceBlock?.maxSlideSpeed)
        ? iceBlock.maxSlideSpeed
        : ICE_MAX_SPEED_DEFAULT;
      vx = Math.max(-maxIceSpeed, Math.min(maxIceSpeed, vx));
    }

    x += conveyorForce;

    if (x < -5000) x = -5000;
    
    const worldBottom = (cameraY || 0) + canvasHeight + 100;
    if (y > worldBottom) isDead = true;

    // Update coyote time
    if (isGrounded) {
      coyoteFramesRef.current.set(player.id, 0); // Reset when grounded
    } else {
      coyoteFramesRef.current.set(player.id, (coyoteFramesRef.current.get(player.id) || 0) + 1); // Increment when airborne
    }

    return { 
      ...player, 
      x, y, vx, vy, isGrounded, isDead, hasWon, lastCheckpoint,
      onIce: onIceNow,
      speedBoostMultiplier,
      speedBoostEndTime,
    };
  }, [checkCollision, findTeleportDestination, updateRotatingBlocks, updateMovingBlocks, updateCannonBalls, blocksOverlap]);

  const resetCrumbleTimers = useCallback(() => {
    crumbleTimersRef.current.forEach(timers => {
      clearTimeout(timers.breakTimer);
      if (timers.resetTimer) clearTimeout(timers.resetTimer);
    });
    crumbleTimersRef.current.clear();
  }, []);

  const resetRotationAngles = useCallback(() => {
    rotationAnglesRef.current.clear();
    movingBlockPhaseRef.current.clear();
    cannonBallsRef.current = [];
    cannonTimersRef.current.clear();
    cannonSweepPhaseRef.current.clear();
    tentacleActiveRef.current.clear();
    checkpointTouchedRef.current = false;
  }, []);

  const getUpdatedBlockPositions = useCallback((blocks: Block[]): Block[] => {
    let updated = updateRotatingBlocks(blocks);
    updated = updateMovingBlocks(updated);
    return updated;
  }, [updateRotatingBlocks, updateMovingBlocks]);

  const getCannonBalls = useCallback(() => cannonBallsRef.current, []);

  // Update gamepad input for physics calculations
  const updateGamepadInput = useCallback((input: GamepadInput | null) => {
    gamepadInputRef.current = input;
  }, []);

  return {
    handleKeyDown,
    handleKeyUp,
    updatePlayer,
    keysRef,
    resetCrumbleTimers,
    resetRotationAngles,
    getUpdatedBlockPositions,
    getCannonBalls,
    updateGamepadInput,
  };
}
