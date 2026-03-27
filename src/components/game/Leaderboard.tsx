import { useEffect } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';

type LeaderboardProps = {
  levelId: string;
  currentUserId?: string;
};

export function Leaderboard({ levelId, currentUserId }: LeaderboardProps) {
  const { entries, loading, fetchLeaderboard } = useLeaderboard(levelId);

  useEffect(() => {
    fetchLeaderboard(20);
  }, [fetchLeaderboard]);

  if (loading) {
    return <p className="font-pixel-body text-sm text-muted-foreground">Loading leaderboard...</p>;
  }

  if (!entries.length) {
    return <p className="font-pixel-body text-sm text-muted-foreground">No scores yet.</p>;
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
            <span className="font-pixel-body text-sm">{entry.time_seconds.toFixed(2)}s / {entry.deaths} deaths</span>
          </div>
        );
      })}
    </div>
  );
}
