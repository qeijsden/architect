import { useEffect } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LevelMode } from '@/types/game';

type LeaderboardProps = {
  levelId: string;
  mode?: LevelMode;
  currentUserId?: string;
};

export function Leaderboard({ levelId, mode = 'race', currentUserId }: LeaderboardProps) {
  const { entries, loading, fetchLeaderboard } = useLeaderboard(levelId, mode);

  useEffect(() => {
    fetchLeaderboard(20);
  }, [fetchLeaderboard]);

  if (loading) {
    return <p className="font-pixel-body text-sm text-muted-foreground">Loading leaderboard...</p>;
  }

  if (!entries.length) {
    return <p className="font-pixel-body text-sm text-muted-foreground">No {mode === 'survival' ? 'survival runs' : 'scores'} yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const isCurrent = currentUserId && entry.user_id === currentUserId;
        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between px-3 py-2 border rounded ${isCurrent ? 'border-primary bg-primary/10' : 'border-border bg-background/40'}`}
          >
            <span className="font-pixel-body text-sm">#{index + 1} {entry.player_name}</span>
            <span className="font-pixel-body text-sm">
              {mode === 'survival'
                ? `${entry.time_seconds.toFixed(2)}s survived / ${entry.deaths} deaths`
                : `${entry.time_seconds.toFixed(2)}s / ${entry.deaths} deaths`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
