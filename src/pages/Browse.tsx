import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Compass, Flame, Star, Heart, Hammer, Flag, RefreshCw, Copy, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

type BrowseTab = 'all' | 'discovery' | 'hell' | 'heaven' | 'favorites' | 'crafted';

export default function Browse() {
  const navigate = useNavigate();
  const location = useLocation();
  const inviteFriend = location.state?.inviteFriend as { id: string; name: string } | undefined;
  const { user, profile, isAuthenticated } = useAuth();
  const { levels: dbLevels, loading, fetchLevels } = useLevels();
  const { favorites, fetchFavorites, toggleFavorite, isFavorited, getFavoriteLevels } = useFavorites(user?.id);
  const { getDiscoveryQueue, getArchitectsHell, getArchitectsHeaven, getCraftedLevels, isLevelPlayed } = useDiscovery(user?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [activeTab, setActiveTab] = useState<BrowseTab>('all');
  const [tabLevels, setTabLevels] = useState<Level[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [reportLevel, setReportLevel] = useState<Level | null>(null);

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
        levels = await getDiscoveryQueue(10);
        break;
      case 'hell':
        levels = await getArchitectsHell(3);
        break;
      case 'heaven':
        levels = await getArchitectsHeaven(3);
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
    if (activeTab !== 'all') {
      loadTabLevels();
    }
  }, [activeTab]);

  const displayLevels = activeTab === 'all' ? dbLevels : tabLevels;

  const filteredLevels = displayLevels.filter(level =>
    level.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    level.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    level.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (level: Level) => {
    navigate('/play', { state: { level } });
  };

  const handleImportLevel = async (level: Level) => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to copy levels');
      return;
    }
    if (!level.allowImport) {
      toast.error('This level does not allow copying');
      return;
    }

    navigate('/editor', { state: { importLevel: level } });
    toast.success('Level copied! Make changes and publish as your own.');
  };

  const tabs: { id: BrowseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Levels', icon: <Search size={14} /> },
    { id: 'discovery', label: 'Discovery', icon: <Compass size={14} /> },
    { id: 'hell', label: "Architect's Hell", icon: <Flame size={14} /> },
    { id: 'heaven', label: "Architect's Heaven", icon: <Star size={14} /> },
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
        
        {activeTab !== 'all' && (
          <GameButton variant="ghost" size="sm" onClick={loadTabLevels}>
            <RefreshCw size={14} />
          </GameButton>
        )}
      </div>

      {/* Search (only for 'all' tab) */}
      {activeTab === 'all' && (
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
      )}

      {/* Tab descriptions */}
      {activeTab === 'discovery' && (
        <p className="font-pixel-body text-muted-foreground mb-4">
          🎲 Random levels you haven't played yet
        </p>
      )}
      {activeTab === 'hell' && (
        <p className="font-pixel-body text-destructive mb-4">
          🔥 Brutally hard levels with &lt;25% completion rate
        </p>
      )}
      {activeTab === 'heaven' && (
        <p className="font-pixel-body text-success mb-4">
          ✨ Relaxing levels with &gt;75% completion rate
        </p>
      )}

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
            <div key={level.id} className="relative group">
              <LevelCard level={level} onPlay={handlePlay} isPlayed={played} />
              
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAuthenticated && user?.id === level.author_id && (
                  <GameButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/editor', { state: { editLevel: level } });
                    }}
                    title="Edit this level"
                  >
                    <Pencil size={12} />
                  </GameButton>
                )}

                {isAuthenticated && (
                  <GameButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(level.id);
                    }}
                    title={isFavorited(level.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart size={12} fill={isFavorited(level.id) ? 'currentColor' : 'none'} />
                  </GameButton>
                )}

                {level.allowImport && (
                  <GameButton 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportLevel(level);
                    }}
                    title="Copy this level"
                  >
                    <Copy size={12} />
                  </GameButton>
                )}
                
                <GameButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportLevel(level);
                  }}
                  title="Report level"
                >
                  <Flag size={12} />
                </GameButton>
              </div>
              
              {/* Bottom action bar - multiplayer disabled/removed */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {level.allowImport && (
                  <GameButton 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(level.id);
                      toast.success('Level ID copied!');
                    }}
                  >
                    Copy ID
                  </GameButton>
                )}
                <GameButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLevel(level);
                  }}
                  title="View leaderboard"
                >
                  🏆
                </GameButton>
              </div>
            </div>
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
                className="flex-1" 
                onClick={() => handlePlay(selectedLevel)}
              >
                Play Solo
              </GameButton>
              <GameButton 
                variant="outline" 
                className="flex-1" 
                onClick={() => handleMultiplayer(selectedLevel)}
              >
                <Users size={14} className="mr-2" />
                Race
              </GameButton>
            </div>
          </div>
        </div>
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
