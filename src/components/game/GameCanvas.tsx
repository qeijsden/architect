import { useEffect, useMemo, useRef, useState } from 'react';
import { Block, BlockType, CannonBall, CustomBlockDefinition, PixelData, Player, TexturePack } from '@/types/game';
import { blockHasBehavior, getPrimaryBlockBehavior } from '@/lib/blockBehaviors';
import { isPhasePlatformActive, isPulseHazardActive } from '@/lib/survivalBlocks';
import { DEFAULT_SETTINGS, GameSettings, getGameSettings } from '@/lib/gameSettings';

type SpriteSource = HTMLCanvasElement;

type GameCanvasProps = {
  blocks: Block[];
  players: Player[];
  isEditing: boolean;
  selectedBlock: string | null;
  onPlaceBlock: (x: number, y: number) => void;
  onRemoveBlock: (id: string) => void;
  onSelectExistingBlock?: (id: string) => void;
  onMoveBlock?: (id: string, x: number, y: number) => void;
  onDragPlace?: (startX: number, startY: number, endX: number, endY: number) => void;
  toolMode?: 'place' | 'edit';
  cameraX: number;
  cameraY: number;
  getUpdatedBlockPositions?: (blocks: Block[]) => Block[];
  goalPosition?: { x: number; y: number } | null;
  playerProgress?: number;
  timeRemaining?: number | null;
  cannonBalls?: CannonBall[];
  texturePack?: TexturePack;
  customBlocks?: CustomBlockDefinition[];
  showOverlayHud?: boolean;
  playerPixelData?: PixelData;
  playerPixelDataById?: Record<string, PixelData>;
  scale?: number;
  canvasWidth?: number;
  canvasHeight?: number;
};

const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 540;
const GRID_SIZE = 32;
const DEFAULT_SCALE = 0.5;
const RASTER_SPRITE_SIZE = 32;

const BLOCK_SPRITE_PATHS: Partial<Record<BlockType, string>> = {
  platform: '/assets-drop/Tile.png',
  hazard: '/assets-drop/Kill.png',
  goal: '/assets-drop/Finish.png',
  spawn: '/assets-drop/Spawn.png',
  ramp: '/assets-drop/Ramp.png',
  speed_gate: '/assets-drop/Speedgate.png',
  ice: '/assets-drop/ice.png',
  wind: '/assets-drop/Wind.png',
};

const PLAYER_SPRITE_PATH = '/assets-drop/Player.png';

const rasterizeSprite = (image: HTMLImageElement, size = RASTER_SPRITE_SIZE): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    return canvas;
  }

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  return canvas;
};

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

const WIND_SPRITE_OUTPUT_ANGLE = 315;

const drawWindFallback = (ctx: CanvasRenderingContext2D, block: Block) => {
  const width = block.width;
  const height = block.height;

  ctx.fillStyle = '#d8e2ff';
  ctx.strokeStyle = '#9aa9cf';
  ctx.lineWidth = 1.5;

  // Base body.
  ctx.fillRect(-width * 0.5, height * 0.08, width * 0.78, height * 0.34);
  ctx.strokeRect(-width * 0.5, height * 0.08, width * 0.78, height * 0.34);

  // Main fan housing.
  ctx.beginPath();
  ctx.arc(-width * 0.05, -height * 0.1, width * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Intake.
  ctx.beginPath();
  ctx.arc(-width * 0.32, -height * 0.2, width * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Output nozzle pointed to the sprite's original north-east orientation.
  ctx.beginPath();
  ctx.moveTo(width * 0.02, -height * 0.24);
  ctx.lineTo(width * 0.44, -height * 0.56);
  ctx.lineTo(width * 0.28, -height * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Active wind streaks from nozzle.
  ctx.strokeStyle = '#eef4ff';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    const offset = i * (height * 0.07);
    ctx.beginPath();
    ctx.moveTo(width * 0.27 + offset * 0.3, -height * 0.47 + offset);
    ctx.lineTo(width * 0.52 + offset * 0.3, -height * 0.69 + offset);
    ctx.stroke();
  }
};

const drawWindBlock = (ctx: CanvasRenderingContext2D, block: Block, opacity: number, sprite?: HTMLImageElement) => {
  const angle = block.windAngle ?? directionToAngle(block.windDirection);
  const centerX = block.x + block.width / 2;
  const centerY = block.y + block.height / 2;
  const rotation = ((angle - WIND_SPRITE_OUTPUT_ANGLE) * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  if (sprite) {
    ctx.drawImage(sprite, -block.width / 2, -block.height / 2, block.width, block.height);
  } else {
    drawWindFallback(ctx, block);
  }

  ctx.restore();
};

const blockColor = (block: Block) => {
  switch (block.type) {
    case 'platform': return block.platformColor || '#5a667a';
    case 'hazard': return '#ff4d4f';
    case 'goal': return '#62d26f';
    case 'spawn': return '#26c6da';
    case 'bounce': return '#ffaa00';
    case 'moving': return '#9966ff';
    case 'ice': return '#87ceeb';
    case 'teleporter': return '#cc66ff';
    case 'crumbling': return '#a97b5b';
    case 'conveyor': return '#8b9db1';
    case 'rotating_beam': return '#ff8a5b';
    case 'checkpoint': return '#95d66f';
    case 'cannon': return '#d96c45';
    case 'pulse_hazard': return '#ff7a59';
    case 'phase_platform': return '#76a9fa';
    case 'timer_orb': return '#facc15';
    case 'zone': return '#38bdf8';
    case 'custom': return '#7c8aa5';
    default: return '#667085';
  }
};

export function GameCanvas({
  blocks,
  players,
  isEditing,
  selectedBlock,
  onPlaceBlock,
  onRemoveBlock,
  onSelectExistingBlock,
  onMoveBlock,
  onDragPlace,
  toolMode = 'place',
  cameraX,
  cameraY,
  getUpdatedBlockPositions,
  goalPosition,
  playerProgress,
  timeRemaining,
  cannonBalls,
  texturePack,
  customBlocks,
  showOverlayHud = true,
  playerPixelData,
  playerPixelDataById,
  scale = DEFAULT_SCALE,
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
  const [blockSprites, setBlockSprites] = useState<Partial<Record<BlockType, SpriteSource>>>({});
  const [playerSprite, setPlayerSprite] = useState<SpriteSource | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const drawnBlocks = useMemo(
    () => (getUpdatedBlockPositions ? getUpdatedBlockPositions(blocks) : blocks),
    [blocks, getUpdatedBlockPositions],
  );

  const visibleBlocks = useMemo(() => {
    const padding = GRID_SIZE * 2;
    const left = cameraX - padding;
    const right = cameraX + canvasWidth / scale + padding;
    const top = cameraY - padding;
    const bottom = cameraY + canvasHeight / scale + padding;

    return drawnBlocks.filter(
      (block) =>
        block.x + block.width >= left &&
        block.x <= right &&
        block.y + block.height >= top &&
        block.y <= bottom,
    );
  }, [drawnBlocks, cameraX, cameraY, canvasWidth, canvasHeight, scale]);

  const customBlockMap = useMemo(
    () => new Map((customBlocks || []).map((definition) => [definition.id, definition])),
    [customBlocks],
  );

  useEffect(() => {
    setGameSettings(getGameSettings());

    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<GameSettings>;
      setGameSettings(customEvent.detail || getGameSettings());
    };

    window.addEventListener('game-settings-updated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('game-settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const entries = Object.entries(BLOCK_SPRITE_PATHS) as Array<[BlockType, string]>;
    Promise.all(
      entries.map(
        ([blockType, path]) =>
          new Promise<[BlockType, HTMLImageElement | null]>((resolve) => {
            const image = new Image();
            image.onload = () => resolve([blockType, image]);
            image.onerror = () => resolve([blockType, null]);
            image.src = path;
          }),
      ),
    ).then((loaded) => {
      if (!active) return;
      const next: Partial<Record<BlockType, SpriteSource>> = {};
      loaded.forEach(([blockType, image]) => {
        if (image) next[blockType] = rasterizeSprite(image);
      });
      setBlockSprites(next);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setPlayerSprite(rasterizeSprite(image));
    };
    image.onerror = () => {
      if (active) setPlayerSprite(null);
    };
    image.src = PLAYER_SPRITE_PATH;
    return () => {
      active = false;
    };
  }, []);

  const drawPixelTexture = (ctx: CanvasRenderingContext2D, block: Block, pixelData?: PixelData) => {
    if (!pixelData || !pixelData.pixels.length || !pixelData.width || !pixelData.height) return false;
    const cellW = block.width / pixelData.width;
    const cellH = block.height / pixelData.height;
    for (let y = 0; y < pixelData.height; y += 1) {
      for (let x = 0; x < pixelData.width; x += 1) {
        const idx = y * pixelData.width + x;
        const color = pixelData.pixels[idx];
        if (!color || color === 'transparent') continue;
        ctx.fillStyle = color;
        ctx.fillRect(block.x + x * cellW, block.y + y * cellH, cellW, cellH);
      }
    }
    return true;
  };

  const drawBlockGlyph = (ctx: CanvasRenderingContext2D, block: Block) => {
    const centerX = block.x + block.width / 2;
    const centerY = block.y + block.height / 2;
    const primary = getPrimaryBlockBehavior(block);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';

    switch (primary) {
      case 'goal':
        ctx.beginPath();
        ctx.moveTo(centerX, block.y + 4);
        ctx.lineTo(centerX + 10, centerY - 3);
        ctx.lineTo(centerX, centerY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'spawn':
      case 'checkpoint':
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'hazard':
      case 'pulse_hazard':
        ctx.beginPath();
        ctx.moveTo(centerX, block.y + 4);
        ctx.lineTo(centerX + 9, block.y + block.height - 4);
        ctx.lineTo(centerX - 9, block.y + block.height - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'timer_orb':
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'wind':
        ctx.beginPath();
        ctx.moveTo(block.x + 7, centerY);
        ctx.lineTo(block.x + block.width - 8, centerY);
        ctx.lineTo(block.x + block.width - 14, centerY - 5);
        ctx.moveTo(block.x + block.width - 8, centerY);
        ctx.lineTo(block.x + block.width - 14, centerY + 5);
        ctx.stroke();
        break;
      default:
        ctx.strokeRect(block.x + 7, block.y + 7, block.width - 14, block.height - 14);
        break;
    }

    ctx.restore();
  };

  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = (clientX - rect.left) * (canvasWidth / rect.width);
    const sy = (clientY - rect.top) * (canvasHeight / rect.height);
    return {
      x: cameraX + sx / scale,
      y: cameraY + sy / scale,
    };
  };

  const findTopBlockAt = (wx: number, wy: number) => {
    for (let i = visibleBlocks.length - 1; i >= 0; i -= 1) {
      const b = visibleBlocks[i];
      if (wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height) {
        return b;
      }
    }
    return null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);

    if (isEditing) {
      const left = cameraX;
      const right = cameraX + canvasWidth / scale;
      const top = cameraY;
      const bottom = cameraY + canvasHeight / scale;

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = Math.floor(left / GRID_SIZE) * GRID_SIZE; x <= right; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      for (let y = Math.floor(top / GRID_SIZE) * GRID_SIZE; y <= bottom; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }
    }

    for (const block of visibleBlocks) {
      const customDefinition = block.type === 'custom' && block.customBlockId ? customBlockMap.get(block.customBlockId) : undefined;
      const customSprite = customDefinition?.sprite;
      const fromTexturePack = drawPixelTexture(ctx, block, customSprite || texturePack?.textures?.[block.type]);
      const sprite = blockSprites[block.type];
      const ghostOpacity = block.isGhost && gameSettings.ghostBlocksUseWindOpacity ? gameSettings.windOpacity : 1;
      const pulseActive = blockHasBehavior(block, 'pulse_hazard') ? isPulseHazardActive(block) : true;
      const phaseActive = blockHasBehavior(block, 'phase_platform') ? isPhasePlatformActive(block) : true;
      const timerCollected = blockHasBehavior(block, 'timer_orb') && block.collected;
      const blockOpacity = ghostOpacity * (timerCollected ? 0.2 : !phaseActive ? 0.28 : !pulseActive ? 0.45 : 1);

      if (block.type === 'wind') {
        drawWindBlock(ctx, block, gameSettings.windOpacity * blockOpacity, sprite);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = blockOpacity;

      if (!fromTexturePack && sprite) {
        if (block.type === 'ramp' && block.rampDirection === 'left') {
          ctx.save();
          ctx.translate(block.x + block.width, block.y);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, 0, 0, block.width, block.height);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, block.x, block.y, block.width, block.height);
        }
        // Apply platform color tint over the sprite
        if (block.type === 'platform' && block.platformColor) {
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = block.platformColor;
          ctx.fillRect(block.x, block.y, block.width, block.height);
          ctx.globalAlpha = 1;
        }
      } else if (!fromTexturePack && block.type === 'ramp') {
        ctx.fillStyle = blockColor(block);
        ctx.beginPath();
        if (block.rampDirection === 'left') {
          ctx.moveTo(block.x + block.width, block.y);
          ctx.lineTo(block.x + block.width, block.y + block.height);
          ctx.lineTo(block.x, block.y + block.height);
        } else {
          ctx.moveTo(block.x, block.y);
          ctx.lineTo(block.x + block.width, block.y + block.height);
          ctx.lineTo(block.x, block.y + block.height);
        }
        ctx.closePath();
        ctx.fill();
      } else if (!fromTexturePack) {
        ctx.fillStyle = blockColor(block);
        ctx.fillRect(block.x, block.y, block.width, block.height);
      }

      if (block.type === 'custom' && !customSprite) {
        drawBlockGlyph(ctx, block);
      }

      if (blockHasBehavior(block, 'phase_platform') && !phaseActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x + 2, block.y + 2, block.width - 4, block.height - 4);
        ctx.setLineDash([]);
      }

      if (blockHasBehavior(block, 'pulse_hazard') && pulseActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x + 1, block.y + 1, block.width - 2, block.height - 2);
      }

      if (blockHasBehavior(block, 'timer_orb')) {
        ctx.strokeStyle = timerCollected ? 'rgba(255,255,255,0.25)' : '#fff5bf';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(block.x + block.width / 2, block.y + block.height / 2, block.width * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (block.type === 'teleporter') {
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(block.x + block.width / 2, block.y + block.height / 2, block.width / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of players) {
      const isGhost = p.id.startsWith('ghost_');
      const pixelData = playerPixelDataById?.[p.id] || (p.id === 'player1' ? playerPixelData : undefined);

      ctx.save();
      if (isGhost) {
        ctx.globalAlpha = 0.45;
      }

      if (pixelData && pixelData.pixels.length) {
        const cellW = 32 / pixelData.width;
        const cellH = 32 / pixelData.height;
        for (let y = 0; y < pixelData.height; y += 1) {
          for (let x = 0; x < pixelData.width; x += 1) {
            const idx = y * pixelData.width + x;
            const color = pixelData.pixels[idx];
            if (!color || color === 'transparent') continue;
            ctx.fillStyle = color;
            ctx.fillRect(p.x + x * cellW, p.y + y * cellH, cellW, cellH);
          }
        }
      } else if (playerSprite) {
        ctx.drawImage(playerSprite, p.x, p.y, 32, 32);
      } else {
        ctx.fillStyle = p.color || '#26c6da';
        ctx.fillRect(p.x, p.y, 32, 32);
      }
      ctx.restore();

      if (p.name) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px VT323';
        ctx.fillText(p.name, p.x, p.y - 6);
      }
    }

    for (const ball of cannonBalls || []) {
      ctx.fillStyle = '#ffcf5c';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (dragStart && dragCurrent && isEditing && selectedBlock) {
      const minX = Math.min(dragStart.x, dragCurrent.x);
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const maxX = Math.max(dragStart.x, dragCurrent.x);
      const maxY = Math.max(dragStart.y, dragCurrent.y);
      ctx.fillStyle = 'rgba(56,189,248,0.16)';
      ctx.strokeStyle = 'rgba(56,189,248,0.9)';
      ctx.lineWidth = 2;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }

    ctx.restore();

    if (showOverlayHud && typeof playerProgress === 'number') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(18, 18, 260, 20);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(18, 18, (Math.max(0, Math.min(100, playerProgress)) / 100) * 260, 20);
    }

    if (showOverlayHud && typeof timeRemaining === 'number') {
      const secs = Math.max(0, Math.floor(timeRemaining));
      const mins = Math.floor(secs / 60);
      const rem = secs % 60;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P"';
      ctx.fillText(`TIME ${mins}:${rem.toString().padStart(2, '0')}`, canvasWidth - 220, 34);
    }
  }, [visibleBlocks, players, cameraX, cameraY, isEditing, dragStart, dragCurrent, selectedBlock, goalPosition, playerProgress, timeRemaining, cannonBalls, blockSprites, texturePack, customBlockMap, playerSprite, showOverlayHud, playerPixelData, playerPixelDataById, canvasHeight, canvasWidth, scale, gameSettings.windOpacity, gameSettings.ghostBlocksUseWindOpacity]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="max-w-full bg-background border-2 border-border rounded-md"
      style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (!isEditing) return;
        const world = toWorld(e.clientX, e.clientY);
        const hit = findTopBlockAt(world.x, world.y);

        if (e.button === 2) {
          if (hit) onRemoveBlock(hit.id);
          return;
        }

        if (toolMode === 'edit') {
          if (hit && !hit.isLocked) {
            onSelectExistingBlock?.(hit.id);
          }
          if (e.shiftKey && hit && !hit.isLocked && onMoveBlock) {
            setMovingBlockId(hit.id);
          }
          return;
        }

        const snappedX = Math.round(world.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(world.y / GRID_SIZE) * GRID_SIZE;

        if (hit && !hit.isLocked && !e.shiftKey) {
          onSelectExistingBlock?.(hit.id);
          return;
        }

        if (e.shiftKey && onMoveBlock) {
          const hit = findTopBlockAt(world.x, world.y);
          if (hit && !hit.isLocked) {
            setMovingBlockId(hit.id);
            return;
          }
        }

        setDragStart({ x: snappedX, y: snappedY });
        setDragCurrent({ x: snappedX, y: snappedY });
      }}
      onMouseMove={(e) => {
        if (!isEditing) return;
        const world = toWorld(e.clientX, e.clientY);
        const snappedX = Math.round(world.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(world.y / GRID_SIZE) * GRID_SIZE;

        if (movingBlockId && onMoveBlock) {
          onMoveBlock(movingBlockId, snappedX, snappedY);
          return;
        }

        if (dragStart) {
          setDragCurrent({ x: snappedX, y: snappedY });
        }
      }}
      onMouseUp={(e) => {
        if (!isEditing) return;
        if (toolMode === 'edit') {
          if (movingBlockId) {
            setMovingBlockId(null);
          }
          return;
        }

        if (movingBlockId) {
          setMovingBlockId(null);
          return;
        }

        if (!dragStart || !dragCurrent) return;

        const dragDistance = Math.hypot(dragCurrent.x - dragStart.x, dragCurrent.y - dragStart.y);
        if (dragDistance > GRID_SIZE * 0.5 && onDragPlace) {
          onDragPlace(dragStart.x, dragStart.y, dragCurrent.x, dragCurrent.y);
        } else {
          onPlaceBlock(dragStart.x, dragStart.y);
        }

        setDragStart(null);
        setDragCurrent(null);
      }}
      onMouseLeave={() => {
        setMovingBlockId(null);
        setDragStart(null);
        setDragCurrent(null);
      }}
    />
  );
}
