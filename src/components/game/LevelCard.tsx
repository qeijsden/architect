import { Level } from '@/types/game';
import { GameButton } from '@/components/ui/GameButton';

type LevelCardProps = {
  level: Level;
  onPlay: (level: Level) => void;
  isPlayed?: boolean;
};

export function LevelCard({ level, onPlay, isPlayed = false }: LevelCardProps) {
  return (
    <div className="bg-card/70 border border-border rounded-md p-3 h-full flex flex-col">
      <h3 className="font-pixel text-[10px] text-primary line-clamp-2 mb-2">{level.name}</h3>
      <p className="font-pixel-body text-sm text-muted-foreground mb-3">by {level.author}</p>
      <div className="font-pixel-body text-xs text-muted-foreground space-y-1 mb-4">
        <p>Plays: {level.plays || 0}</p>
        <p>Likes: {level.likes || 0}</p>
        {typeof level.max_time_seconds === 'number' && <p>Max Time: {level.max_time_seconds}s</p>}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="font-pixel-body text-xs text-muted-foreground">{isPlayed ? 'Played' : 'New'}</span>
        <GameButton variant="primary" size="sm" onClick={() => onPlay(level)}>
          Play
        </GameButton>
      </div>
    </div>
  );
}
