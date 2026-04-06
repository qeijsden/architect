import { useEffect, useRef, useState } from 'react';
import { Level, Block, BlockType } from '@/types/game';
import { GameButton } from '@/components/ui/GameButton';
import { Heart, Flag, Pencil, Trophy, AlertTriangle, Music4, ExternalLink } from 'lucide-react';
import { parseLevelMusicLink } from '@/lib/levelMusic';

type LevelCardProps = {
  level: Level;
  onPlay: (level: Level) => void;
  onLeaderboard?: (level: Level) => void;
  onFavorite?: (level: Level) => void;
  isFavorited?: boolean;
  onEdit?: (level: Level) => void;
  onReport?: (level: Level) => void;
  isPlayed?: boolean;
};

const PREVIEW_BLOCK_COLORS: Partial<Record<BlockType, string>> = {
  platform: '#5a667a',
  hazard: '#ff4d4f',
  goal: '#62d26f',
  spawn: '#26c6da',
  bounce: '#ffaa00',
  moving: '#9966ff',
  ice: '#87ceeb',
  teleporter: '#cc66ff',
  crumbling: '#a97b5b',
  conveyor: '#8b9db1',
  rotating_beam: '#ff8a5b',
  checkpoint: '#95d66f',
  ramp: '#8ecf90',
  speed_gate: '#f7c948',
  water: '#3b82f6',
  wind: '#a3e0ff',
};

const PREVIEW_SPRITES: Partial<Record<BlockType, string>> = {
  platform: '/assets-drop/Tile.png',
  hazard: '/assets-drop/Kill.png',
  goal: '/assets-drop/Finish.png',
  spawn: '/assets-drop/Spawn.png',
  ramp: '/assets-drop/Ramp.png',
  speed_gate: '/assets-drop/Speedgate.png',
  ice: '/assets-drop/ice.png',
};

function getBlockPreviewColor(block: Block): string {
  if (block.type === 'platform' && block.platformColor) return block.platformColor;
  return PREVIEW_BLOCK_COLORS[block.type] || '#667085';
}

function LevelMiniPreview({ blocks }: { blocks: Block[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteMap, setSpriteMap] = useState<Partial<Record<BlockType, HTMLImageElement>>>({});

  useEffect(() => {
    let active = true;
    const entries = Object.entries(PREVIEW_SPRITES) as Array<[BlockType, string]>;
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
      const next: Partial<Record<BlockType, HTMLImageElement>> = {};
      loaded.forEach(([blockType, img]) => {
        if (img) next[blockType] = img;
      });
      setSpriteMap(next);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);

    const userBlocks = (blocks || []).filter((b) => !b.isLocked);
    if (!userBlocks.length) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#334155';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No blocks', W / 2, H / 2 + 3);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of userBlocks) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }

    const padding = 6;
    const levelW = maxX - minX || 1;
    const levelH = maxY - minY || 1;
    const scale = Math.min((W - padding * 2) / levelW, (H - padding * 2) / levelH);
    const offsetX = (W - levelW * scale) / 2 - minX * scale;
    const offsetY = (H - levelH * scale) / 2 - minY * scale;

    for (const b of userBlocks) {
      const bx = b.x * scale + offsetX;
      const by = b.y * scale + offsetY;
      const bw = Math.max(1, b.width * scale);
      const bh = Math.max(1, b.height * scale);
      const sprite = spriteMap[b.type];

      if (sprite) {
        if (b.type === 'ramp' && b.rampDirection === 'left') {
          ctx.save();
          ctx.translate(bx + bw, by);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, 0, 0, bw, bh);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, bx, by, bw, bh);
        }

        if (b.type === 'platform' && b.platformColor) {
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = b.platformColor;
          ctx.fillRect(bx, by, bw, bh);
          ctx.globalAlpha = 1;
        }
      } else if (b.type === 'ramp') {
        ctx.fillStyle = getBlockPreviewColor(b);
        ctx.beginPath();
        if (b.rampDirection === 'left') {
          ctx.moveTo(bx + bw, by);
          ctx.lineTo(bx + bw, by + bh);
          ctx.lineTo(bx, by + bh);
        } else {
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + bw, by + bh);
          ctx.lineTo(bx, by + bh);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = getBlockPreviewColor(b);
        ctx.fillRect(bx, by, bw, bh);
      }
    }
  }, [blocks, spriteMap]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={120}
      className="w-full block bg-[#111827]"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export function LevelCard({
  level,
  onPlay,
  onLeaderboard,
  onFavorite,
  isFavorited,
  onEdit,
  onReport,
  isPlayed = false,
}: LevelCardProps) {
  const parsedTrack = parseLevelMusicLink(level.trackUrl || '');
  const hasTrack = Boolean(parsedTrack?.isSupported);
  const trackTitle = level.trackTitle?.trim() || parsedTrack?.providerLabel || 'Level song';
  const trackArtist = level.trackArtist?.trim();
  const uniquePlays = level.played_by?.length ?? level.plays ?? 0;
  const uniqueCompletions = level.completed_by?.length ?? level.completion_count ?? 0;
  const completionPct = uniquePlays > 0 ? Math.round((uniqueCompletions / uniquePlays) * 100) : 0;
  const completionClass = completionPct < 25
    ? 'text-red-400'
    : completionPct < 50
      ? 'text-orange-400'
      : completionPct < 75
        ? 'text-lime-300'
        : 'text-green-400';

  return (
    <div className="bg-card/70 border border-border rounded-md overflow-hidden flex flex-col">
      {level.texturePack && (
        <div className="bg-amber-500/20 border-b border-amber-400/40 px-2 py-1 flex items-center gap-1">
          <AlertTriangle size={12} className="text-amber-300" />
          <span className="font-pixel-body text-[10px] text-amber-200">!warning: This level uses custom BLOX!</span>
        </div>
      )}
      {hasTrack && (
        <div className="bg-sky-500/15 border-b border-sky-400/30 px-2 py-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <Music4 size={12} className="text-sky-300 shrink-0" />
            <div className="min-w-0">
              <p className="font-pixel text-[9px] text-sky-100 truncate">{trackTitle}</p>
              <p className="font-pixel-body text-[10px] text-sky-200/80 truncate">{trackArtist || parsedTrack?.providerLabel}</p>
            </div>
          </div>
          <button
            className="shrink-0 text-sky-200 hover:text-white transition-colors p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              if (parsedTrack?.normalizedUrl) {
                window.open(parsedTrack.normalizedUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            title="Open song"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      )}
      <div className="border-b border-border/50">
        <LevelMiniPreview blocks={level.blocks || []} />
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-pixel text-[10px] text-primary line-clamp-2 flex-1">{level.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                onClick={(e) => { e.stopPropagation(); onEdit(level); }}
                title="Edit level"
              >
                <Pencil size={11} />
              </button>
            )}
            {onFavorite && (
              <button
                className={`transition-colors p-0.5 ${isFavorited ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
                onClick={(e) => { e.stopPropagation(); onFavorite(level); }}
                title={isFavorited ? 'Remove favorite' : 'Add favorite'}
              >
                <Heart size={11} fill={isFavorited ? 'currentColor' : 'none'} />
              </button>
            )}
            {onReport && (
              <button
                className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                onClick={(e) => { e.stopPropagation(); onReport(level); }}
                title="Report level"
              >
                <Flag size={11} />
              </button>
            )}
          </div>
        </div>

        <p className="font-pixel-body text-xs text-muted-foreground mb-2">by {level.author}</p>

        <div className="flex gap-3 font-pixel-body text-xs text-muted-foreground mb-3 flex-wrap">
          <span>{uniquePlays} plays</span>
          <span>{level.likes || 0} likes</span>
          <span className={completionClass}>{completionPct}% clear</span>
          {isPlayed && <span className="text-success">✓ played</span>}
        </div>

        <div className="mt-auto flex items-center gap-2">
          {hasTrack && parsedTrack?.normalizedUrl && (
            <button
              className="text-muted-foreground hover:text-sky-300 transition-colors inline-flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(parsedTrack.normalizedUrl, '_blank', 'noopener,noreferrer');
              }}
              title="Open song"
            >
              <Music4 size={14} />
              <span className="font-pixel-body text-[11px]">Song</span>
            </button>
          )}
          {onLeaderboard && (
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); onLeaderboard(level); }}
              title="Leaderboard"
            >
              <Trophy size={14} />
            </button>
          )}
          <GameButton variant="primary" size="sm" className="ml-auto" onClick={() => onPlay(level)}>
            Play
          </GameButton>
        </div>
      </div>
    </div>
  );
}