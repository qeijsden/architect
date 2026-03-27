import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, ArrowLeft, Medal, Award, Users, Globe } from 'lucide-react';
import { Profile } from '@/types/game';
import { useFriends } from '@/hooks/useFriends';

interface LeaderboardEntry {
  profile: Profile;
  wins: number;
}

const WINS_STORAGE_PREFIX = 'wins_';

export default function GlobalLeaderboard() {
  const navigate = useNavigate();
  const { isAuthenticated, user, profile } = useAuth();
  const { friends } = useFriends(user?.id, profile?.display_name);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'world' | 'friends'>('world');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchLeaderboard();
  }, [isAuthenticated, navigate]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Collect all profiles and their wins from localStorage
      const leaderboard: LeaderboardEntry[] = [];

      // Get all localStorage keys to find all users
      const profileKeys = Object.keys(localStorage).filter(key => key.startsWith('profile_'));

      for (const key of profileKeys) {
        try {
          const profileStr = localStorage.getItem(key);
          if (!profileStr) continue;

          const profile: Profile = JSON.parse(profileStr);
          const winsKey = WINS_STORAGE_PREFIX + profile.id;
          const winsStr = localStorage.getItem(winsKey);
          const wins = winsStr ? parseInt(winsStr, 10) : 0;

          leaderboard.push({
            profile,
            wins,
          });
        } catch (error) {
          console.error(`Error parsing profile from ${key}:`, error);
        }
      }

      // Sort by wins descending
      leaderboard.sort((a, b) => b.wins - a.wins);

      // Limit to top 100
      setEntries(leaderboard.slice(0, 100));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="font-pixel text-xs text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        <div className="mt-8 text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="font-pixel text-2xl text-primary text-glow">GLOBAL LEADERBOARD</h1>
          </div>
          <p className="font-pixel-body text-muted-foreground text-sm">
            {viewMode === 'world' ? 'Top players by competitive wins' : 'Your friends leaderboard'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6 justify-center">
          <GameButton
            variant={viewMode === 'world' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('world')}
            className="flex items-center gap-2"
          >
            <Globe size={14} />
            World
          </GameButton>
          <GameButton
            variant={viewMode === 'friends' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('friends')}
            className="flex items-center gap-2"
          >
            <Users size={14} />
            Friends
          </GameButton>
        </div>

        {loading ? (
          <div className="bg-card/50 p-8 pixel-border text-center">
            <p className="font-pixel-body text-muted-foreground">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card/50 p-8 pixel-border text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-pixel-body text-muted-foreground">
              {viewMode === 'friends' && friends.length === 0 ? 'No friends yet. Add some friends!' : 'No competitors yet. Start winning!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries
              .filter(entry => {
                if (viewMode === 'friends') {
                  return friends.some(f => f.friend_profile?.id === entry.profile.id) || entry.profile.id === user?.id;
                }
                return true;
              })
              .map((entry, index) => (
                <div
                  key={entry.profile.id}
                  className="flex items-center gap-4 p-3 bg-card/50 pixel-border hover:bg-card/75 transition-colors"
                >
                  <div className="w-6 flex justify-center flex-shrink-0">
                    {getRankIcon(index + 1)}
                  </div>

                  <div
                    className="w-8 h-8 pixel-border flex-shrink-0"
                    style={{ backgroundColor: entry.profile.avatar_color }}
                  />

                  <span className="font-pixel-body text-foreground flex-1 truncate text-sm">
                    {entry.profile.display_name}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-pixel text-sm text-primary font-bold">
                      {entry.wins} <span className="text-xs text-muted-foreground">wins</span>
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
