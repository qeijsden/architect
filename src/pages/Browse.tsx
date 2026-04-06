import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Level } from '@/types/game';
import { LevelCard } from '@/components/game/LevelCard';
import { GameButton } from '@/components/ui/GameButton';
import { Leaderboard } from '@/components/game/Leaderboard';
import { ReportDialog } from '@/components/game/ReportDialog';
import { useAuth } from '@/hooks/useAuth';
import { useLevels } from '@/hooks/useLevels';
import { useFavorites } from '@/hooks/useFavorites';
import { useDiscovery } from '@/hooks/useDiscovery';
import { 
  ArrowLeft, Search, Plus, X,
  Compass, Heart, Hammer, RefreshCw, Shuffle, Play, SkipForward
} from 'lucide-react';
import { toast } from '@/lib/announcer';

type BrowseTab = 'discovery' | 'favorites' | 'crafted';

// ── Quick Play modal ─────────────────────────────────────────────────────────

type QuickPlayProps = {
  levels: Level[];
  onPlay: (level: Level) => void;
  onClose: () => void;
  onLeaderboard: (level: Level) => void;
};

function QuickPlayModal({ levels, onPlay, onClose, onLeaderboard }: QuickPlayProps) {
  const validLevels = levels.filter(l => l.blocks && l.blocks.length > 0);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getRandomLevel = useCallback(() => {
    if (!validLevels.length) return null;
    return validLevels[Math.floor(Math.random() * validLevels.length)];
  }, [validLevels]);

  const startSpin = useCallback(() => {
    if (!validLevels.length) return;
    setSpinning(true);
    setSpinCount(c => c + 1);

    let step = 60;       // ms between frames (fast)
    let ticks = 0;
    const totalTicks = 22 + Math.floor(Math.random() * 10); // ~1.5–2s

    if (intervalRef.current) clearInterval(intervalRef.current);

    const tick = () => {
      ticks++;
      setCurrentLevel(getRandomLevel());

      // Gradually slow down in the last third
      if (ticks > totalTicks * 0.65) {
        step = Math.min(step + 28, 350);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, step);
      }

      if (ticks >= totalTicks) {
        clearInterval(intervalRef.current!);
        setSpinning(false);
        setCurrentLevel(getRandomLevel());
      }
    };

    intervalRef.current = setInterval(tick, step);
  }, [validLevels, getRandomLevel]);

  useEffect(() => {
    // Auto-start on open
    startSpin();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!validLevels.length) {
    return (
      <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4">
        <div className="bg-card pixel-border p-8 max-w-sm w-full text-center">
          <p className="font-pixel text-muted-foreground text-sm mb-4">No levels available yet!</p>
          <GameButton variant="outline" onClick={onClose}>Back</GameButton>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card pixel-border p-6 max-w-xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-pixel text-sm text-primary">QUICK PLAY</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Slot display */}
        <div
          className={`relative rounded-md border-2 overflow-hidden mb-5 transition-all duration-100 ${
            spinning ? 'border-accent shadow-[0_0_16px_2px_rgba(56,189,248,0.35)]' : 'border-primary shadow-[0_0_12px_2px_rgba(34,197,94,0.3)]'
          }`}
          style={{ minHeight: 320 }}
        >
          {/* Scanline overlay while spinning */}
          {spinning && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 4px)',
              }}
            />
          )}

          <div className={`p-4 transition-all duration-75 ${spinning ? 'blur-[1px]' : ''}`}>
            {currentLevel ? (
              <LevelCard
                level={currentLevel}
                onPlay={(l) => { onPlay(l); onClose(); }}
                onLeaderboard={onLeaderboard}
              />
            ) : (
              <p className="font-pixel text-muted-foreground text-sm animate-pulse">Randomizing…</p>
            )}
          </div>

          {/* Bottom ticker bar */}
          <div className={`h-1 w-full transition-all duration-300 ${spinning ? 'bg-accent animate-pulse' : 'bg-primary'}`} />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <GameButton
            variant="outline"
            className="flex-1"
            onClick={startSpin}
            disabled={spinning}
          >
            <SkipForward size={15} className="mr-2" />
            {spinCount > 0 ? 'Reshuffle' : 'Shuffle'}
          </GameButton>
          <GameButton
            variant="primary"
            className="flex-1"
            disabled={!currentLevel || spinning}
            onClick={() => { if (currentLevel) { onPlay(currentLevel); onClose(); } }}
          >
            <Play size={15} className="mr-2" />
            Play!
          </GameButton>
        </div>

        <p className="font-pixel-body text-xs text-muted-foreground text-center mt-3">
          {validLevels.length} level{validLevels.length !== 1 ? 's' : ''} in the pool
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Browse() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { levels: dbLevels, loading, fetchLevels, toggleLike } = useLevels();
  const { fetchFavorites, toggleFavorite, isFavorited, getFavoriteLevels } = useFavorites(user?.id);
  const { getDiscoveryQueue, getCraftedLevels, isLevelPlayed } = useDiscovery(user?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [activeTab, setActiveTab] = useState<BrowseTab>('discovery');
  const [tabLevels, setTabLevels] = useState<Level[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [reportLevel, setReportLevel] = useState<Level | null>(null);
  const [quickPlayOpen, setQuickPlayOpen] = useState(false);

  useEffect(() => {
    fetchLevels({ validated: true });
    if (user?.id) {
      fetchFavorites();
    }
  }, [fetchLevels, fetchFavorites, user?.id]);

  // Load levels for active tab
  const loadTabLevels = async () => {
    setTabLoading(true);
    let levels: Level[] = [];

    switch (activeTab) {
      case 'discovery':
        levels = await getDiscoveryQueue(8);
        break;
      case 'favorites':
        levels = await getFavoriteLevels();
        break;
      case 'crafted':
        levels = await getCraftedLevels();
        break;
      default:
        levels = [];
    }

    setTabLevels(levels);
    setTabLoading(false);
  };

  useEffect(() => {
    loadTabLevels();
  }, [activeTab]);

  const displayLevels = tabLevels;

  const filteredLevels = displayLevels.filter(level =>
    level.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    level.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    level.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (level: Level) => {
    navigate('/play', { state: { level } });
  };

  const handleFavoriteToggle = async (level: Level) => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Sign in to like/favorite levels');
      return;
    }
    await toggleFavorite(level.id);
    await toggleLike(level.id, user.id);
    await fetchLevels({ validated: true });
    await loadTabLevels();
  };

  const tabs: { id: BrowseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'discovery', label: 'Discovery', icon: <Compass size={14} /> },
    { id: 'favorites', label: 'Favorites', icon: <Heart size={14} /> },
    { id: 'crafted', label: 'My Levels', icon: <Hammer size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>
          <h1 className="font-pixel text-xl text-primary">LEVEL BROWSER</h1>
        </div>

        <div className="flex items-center gap-4">
          <GameButton variant="secondary" size="md" onClick={() => setQuickPlayOpen(true)}>
            <Shuffle size={16} className="mr-2" />
            Quick Play
          </GameButton>
          <GameButton variant="secondary" size="md" onClick={() => {
            if (!isAuthenticated) {
              navigate('/auth');
            } else {
              navigate('/editor');
            }
          }}>
            <Plus size={16} className="mr-2" />
            Create Level
          </GameButton>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <GameButton
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </GameButton>
        ))}
        
        <GameButton variant="ghost" size="sm" onClick={loadTabLevels}>
          <RefreshCw size={14} />
        </GameButton>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search levels..."
          className="w-full bg-input border-2 border-border pl-10 pr-4 py-3 font-pixel-body text-lg text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
        />
      </div>

      {(loading || tabLoading) && (
        <div className="text-center py-8">
          <p className="font-pixel text-primary animate-pulse">Loading levels...</p>
        </div>
      )}

      {/* Levels grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLevels.map(level => {
          const played = isLevelPlayed(level.id);
          
          return (
            <LevelCard
              key={level.id}
              level={level}
              onPlay={handlePlay}
              isPlayed={played}
              onLeaderboard={(l) => setSelectedLevel(l)}
              onFavorite={isAuthenticated ? (l) => handleFavoriteToggle(l) : undefined}
              isFavorited={isFavorited(level.id)}
              onEdit={isAuthenticated && user?.id === level.author_id ? (l) => navigate('/editor', { state: { editLevel: l } }) : undefined}
              onReport={(l) => setReportLevel(l)}
            />
          );
        })}
      </div>

      {filteredLevels.length === 0 && !loading && !tabLoading && (
        <div className="text-center py-16">
          <p className="font-pixel text-muted-foreground text-sm">
            {activeTab === 'favorites' ? 'No favorites yet. Add some!' :
             activeTab === 'crafted' ? 'You haven\'t created any levels yet.' :
             activeTab === 'discovery' ? 'No new levels to discover. Check back later!' :
             'No levels found'}
          </p>
          {activeTab === 'crafted' && (
            <GameButton variant="primary" size="md" className="mt-4" onClick={() => navigate('/editor')}>
              Create your first level!
            </GameButton>
          )}
        </div>
      )}

      {/* Leaderboard modal */}
      {selectedLevel && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card pixel-border p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-sm text-primary">{selectedLevel.name}</h2>
              <GameButton variant="ghost" size="sm" onClick={() => setSelectedLevel(null)}>
                <X size={16} />
              </GameButton>
            </div>
            <Leaderboard levelId={selectedLevel.id} currentUserId={user?.id} />
            <div className="mt-4 flex gap-3">
              <GameButton 
                variant="primary" 
                className="w-full" 
                onClick={() => handlePlay(selectedLevel)}
              >
                Play Solo
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Quick Play modal */}
      {quickPlayOpen && (
        <QuickPlayModal
          levels={dbLevels}
          onPlay={handlePlay}
          onLeaderboard={(l) => setSelectedLevel(l)}
          onClose={() => setQuickPlayOpen(false)}
        />
      )}

      {/* Report dialog */}
      {reportLevel && (
        <ReportDialog 
          levelId={reportLevel.id}
          levelName={reportLevel.name}
          userId={user?.id}
          onClose={() => setReportLevel(null)}
        />
      )}
    </div>
  );
}
