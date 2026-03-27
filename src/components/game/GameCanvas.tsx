import { useEffect, useMemo, useRef, useState } from 'react';
import { Block, CannonBall, Player, TexturePack } from '@/types/game';

type GameCanvasProps = {
  blocks: Block[];
  players: Player[];
  isEditing: boolean;
  selectedBlock: string | null;
  onPlaceBlock: (x: number, y: number) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock?: (id: string, x: number, y: number) => void;
  onDragPlace?: (startX: number, startY: number, endX: number, endY: number) => void;
  cameraX: number;
  cameraY: number;
  getUpdatedBlockPositions?: (blocks: Block[]) => Block[];
  goalPosition?: { x: number; y: number } | null;
  playerProgress?: number;
  timeRemaining?: number | null;
  cannonBalls?: CannonBall[];
  texturePack?: TexturePack;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GRID_SIZE = 32;
const SCALE = 0.5;

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
  onMoveBlock,
  onDragPlace,
  cameraX,
  cameraY,
  getUpdatedBlockPositions,
  goalPosition,
  playerProgress,
  timeRemaining,
  cannonBalls,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);

  const drawnBlocks = useMemo(
    () => (getUpdatedBlockPositions ? getUpdatedBlockPositions(blocks) : blocks),
    [blocks, getUpdatedBlockPositions],
  );

  const toWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: cameraX + sx / SCALE,
      y: cameraY + sy / SCALE,
    };
  };

  const findTopBlockAt = (wx: number, wy: number) => {
    for (let i = drawnBlocks.length - 1; i >= 0; i -= 1) {
      const b = drawnBlocks[i];
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

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-cameraX, -cameraY);

    if (isEditing) {
      const left = cameraX;
      const right = cameraX + CANVAS_WIDTH / SCALE;
      const top = cameraY;
      const bottom = cameraY + CANVAS_HEIGHT / SCALE;

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

    for (const block of drawnBlocks) {
      ctx.fillStyle = blockColor(block);
      if (block.type === 'ramp') {
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
      } else {
        ctx.fillRect(block.x, block.y, block.width, block.height);
      }

      if (block.type === 'teleporter') {
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(block.x + block.width / 2, block.y + block.height / 2, block.width / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (goalPosition) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(goalPosition.x + 8, goalPosition.y - 20, 8, 20);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(goalPosition.x + 16, goalPosition.y - 20);
      ctx.lineTo(goalPosition.x + 30, goalPosition.y - 14);
      ctx.lineTo(goalPosition.x + 16, goalPosition.y - 8);
      ctx.closePath();
      ctx.fill();
    }

    for (const p of players) {
      ctx.fillStyle = p.color || '#26c6da';
      ctx.fillRect(p.x, p.y, 32, 32);
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

    if (typeof playerProgress === 'number') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(18, 18, 260, 20);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(18, 18, (Math.max(0, Math.min(100, playerProgress)) / 100) * 260, 20);
    }

    if (typeof timeRemaining === 'number') {
      const secs = Math.max(0, Math.floor(timeRemaining));
      const mins = Math.floor(secs / 60);
      const rem = secs % 60;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Press Start 2P"';
      ctx.fillText(`TIME ${mins}:${rem.toString().padStart(2, '0')}`, CANVAS_WIDTH - 220, 34);
    }
  }, [drawnBlocks, players, cameraX, cameraY, isEditing, dragStart, dragCurrent, selectedBlock, goalPosition, playerProgress, timeRemaining, cannonBalls]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-[960px] h-[540px] max-w-full bg-background border-2 border-border rounded-md"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (!isEditing) return;
        const world = toWorld(e.clientX, e.clientY);

        if (e.button === 2) {
          const hit = findTopBlockAt(world.x, world.y);
          if (hit) onRemoveBlock(hit.id);
          return;
        }

        const snappedX = Math.round(world.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(world.y / GRID_SIZE) * GRID_SIZE;

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
