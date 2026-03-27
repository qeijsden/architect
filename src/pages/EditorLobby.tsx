import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Profile } from '@/types/game';
import { ArrowLeft, Users, Play, Copy, Check, Crown, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const ARCHITECT_COLORS = [
  '#26c6da', '#e53935', '#43a047', '#ffb300'
];

// Generate random room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

interface BuildSession {
  id: string;
  host_id: string;
  room_code: string;
  status: string;
  created_at: string;
}

interface Architect {
  id: string;
  user_id: string;
  display_name: string;
  avatar_color: string;
  is_ready: boolean;
}

export default function EditorLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const levelName = location.state?.levelName as string | undefined;
  const blocks = location.state?.blocks as any[] | undefined;

  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const { friends } = useFriends(user?.id);

  const [session, setSession] = useState<BuildSession | null>(null);
  const [architects, setArchitects] = useState<Architect[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const createBuildSession = async () => {
    if (!user || !profile) return;
    setIsCreating(true);
    try {
      // Generate room code
      const roomCode = generateRoomCode();

      // Create build session (store in a way that doesn't require a DB table for now)
      const sessionId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newSession: BuildSession = {
        id: sessionId,
        host_id: user.id,
        room_code: roomCode,
        status: 'waiting',
        created_at: new Date().toISOString(),
      };

      setSession(newSession);
      setIsHost(true);

      const architectColor = ARCHITECT_COLORS[0];
      const currentArchitect: Architect = {
        id: `arch-${user.id}`,
        user_id: user.id,
        display_name: profile.display_name || 'Architect',
        avatar_color: profile.avatar_color || architectColor,
        is_ready: false,
      };

      setArchitects([currentArchitect]);
      toast.success('Build session created! Invite friends to collaborate.');
    } catch (error) {
      toast.error('Failed to create build session');
    } finally {
      setIsCreating(false);
    }
  };

  const inviteArchitects = async () => {
    if (selectedFriends.length === 0) {
      toast.error('Select at least one friend to invite');
      return;
    }

    if (architects.length + selectedFriends.length > 4) {
      toast.error('Cannot exceed 4 architects total');
      return;
    }

    // Add invited friends as pending architects
    const newArchitects = selectedFriends.map((friendId, idx) => {
      const friendProfile = friends.find(f => {
        const otherUserId = f.user_id === user?.id ? f.friend_id : f.user_id;
        return otherUserId === friendId;
      })?.friend_profile;

      return {
        id: `arch-${friendId}`,
        user_id: friendId,
        display_name: friendProfile?.display_name || 'Architect',
        avatar_color: ARCHITECT_COLORS[architects.length + idx + 1] || '#26c6da',
        is_ready: false,
      };
    });

    setArchitects(prev => [...prev, ...newArchitects]);
    setSelectedFriends([]);
    setShowInvite(false);
    toast.success(`Invited ${newArchitects.length} architect(s)!`);
  };

  const toggleReady = () => {
    if (!user) return;
    setArchitects(prev => prev.map(a => 
      a.user_id === user.id ? { ...a, is_ready: !a.is_ready } : a
    ));
  };

  const startBuilding = async () => {
    if (!session || !user) return;

    // Navigate to multiplayer editor with session info
    navigate('/editor-multiplayer', {
      state: {
        sessionId: session.id,
        roomCode: session.room_code,
        levelName,
        blocks,
        architects,
        isHost,
      },
    });
  };

  const copyRoomCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied!');
    }
  };

  const handleLeave = () => {
    setSession(null);
    setArchitects([]);
    setIsHost(false);
    navigate('/editor');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/editor')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>

          <div className="mt-16 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="font-pixel text-2xl text-primary text-glow">ARCHITECT LOBBY</h1>
            </div>
            <p className="font-pixel-body text-muted-foreground mb-8">
              Collaborate on levels with up to 3 other architects
            </p>

            <GameButton
              variant="primary"
              size="lg"
              onClick={createBuildSession}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Build Session'}
            </GameButton>
          </div>
        </div>
      </div>
    );
  }

  const currentArchitect = architects.find(a => a.user_id === user?.id);
  const allReady = architects.every(a => a.is_ready);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <GameButton variant="ghost" size="sm" onClick={handleLeave}>
          <ArrowLeft size={16} className="mr-2" />
          Leave Session
        </GameButton>

        <div className="mt-8 text-center">
          <h1 className="font-pixel text-2xl text-primary text-glow mb-4">ARCHITECT LOBBY</h1>

          <div className="flex items-center justify-center gap-3 mt-6 bg-card/50 p-4 pixel-border inline-block min-w-52 mx-auto">
            <span className="font-pixel text-xl tracking-widest text-accent">
              {session.room_code}
            </span>
            <GameButton variant="ghost" size="sm" onClick={copyRoomCode}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </GameButton>
          </div>
        </div>

        {/* Architects list */}
        <div className="mt-8 bg-card/50 p-6 pixel-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-pixel text-sm text-foreground">
              ARCHITECTS ({architects.length}/4)
            </h2>
          </div>

          <div className="space-y-3">
            {architects.map(architect => (
              <div
                key={architect.id}
                className="flex items-center justify-between bg-background/50 p-3 pixel-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 pixel-border"
                    style={{ backgroundColor: architect.avatar_color }}
                  />
                  <span className="font-pixel-body text-foreground">
                    {architect.display_name}
                  </span>
                  {architect.user_id === user?.id && (
                    <span className="font-pixel text-[8px] bg-primary/20 text-primary px-2 py-1">
                      YOU
                    </span>
                  )}
                  {architect.user_id === session.host_id && (
                    <Crown size={14} className="text-accent" />
                  )}
                </div>
                <span className={`font-pixel text-xs ${
                  architect.is_ready ? 'text-success' : 'text-muted-foreground'
                }`}>
                  {architect.is_ready ? 'READY' : 'NOT READY'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite button */}
        {architects.length < 4 && isHost && !showInvite && (
          <div className="mt-6">
            <GameButton
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus size={18} className="mr-2" />
              Invite Architects
            </GameButton>
          </div>
        )}

        {/* Invite UI */}
        {showInvite && (
          <div className="mt-6 bg-card/50 p-6 pixel-border">
            <h3 className="font-pixel text-sm mb-4">Select friends to invite:</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {friends.length === 0 ? (
                <p className="font-pixel-body text-muted-foreground text-sm">No friends yet</p>
              ) : (
                friends.map(friend => {
                  const friendProfile = friend.friend_profile;
                  const friendId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
                  const isSelected = selectedFriends.includes(friendId);
                  const alreadyInvited = architects.some(a => a.user_id === friendId);

                  return (
                    <button
                      key={friendId}
                      disabled={alreadyInvited}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFriends(prev => prev.filter(id => id !== friendId));
                        } else {
                          setSelectedFriends(prev => [...prev, friendId]);
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 pixel-border text-left transition-colors ${
                        isSelected ? 'bg-primary/20 border-primary' : 
                        alreadyInvited ? 'bg-muted/20 opacity-50' : 'bg-background/50 hover:bg-primary/10'
                      }`}
                    >
                      <div
                        className="w-6 h-6 pixel-border"
                        style={{ backgroundColor: friendProfile?.avatar_color || '#26c6da' }}
                      />
                      <span className="font-pixel-body text-sm flex-1">
                        {friendProfile?.display_name || 'Unknown'}
                      </span>
                      {alreadyInvited && (
                        <span className="font-pixel text-[8px] text-success">INVITED</span>
                      )}
                      {isSelected && (
                        <Check size={14} className="text-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <GameButton
                variant="outline"
                className="flex-1"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </GameButton>
              <GameButton
                variant="primary"
                className="flex-1"
                onClick={inviteArchitects}
                disabled={selectedFriends.length === 0}
              >
                Invite ({selectedFriends.length})
              </GameButton>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <GameButton
            variant={currentArchitect?.is_ready ? 'outline' : 'primary'}
            size="lg"
            className="flex-1"
            onClick={toggleReady}
          >
            {currentArchitect?.is_ready ? 'Cancel Ready' : 'Ready Up!'}
          </GameButton>

          {isHost && (
            <GameButton
              variant="success"
              size="lg"
              onClick={startBuilding}
              disabled={!allReady || architects.length === 0}
            >
              <Play size={18} className="mr-2" />
              Start Building
            </GameButton>
          )}
        </div>

        {isHost && !allReady && (
          <p className="text-center font-pixel-body text-muted-foreground text-sm mt-4">
            Waiting for all architects to be ready...
          </p>
        )}
      </div>
    </div>
  );
}
