import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { useLocalMultiplayer } from '@/hooks/useLocalMultiplayer';
import { Level, GameSession } from '@/types/game';
import { ArrowLeft, Users, Play, Copy, Check, RefreshCw, Crown } from 'lucide-react';
import { toast } from '@/lib/announcer';

const PLAYER_COLORS = [
  '#26c6da', '#e53935', '#43a047', '#ffb300', 
  '#7e57c2', '#ec407a', '#ff7043', '#66bb6a'
];

export default function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const level = location.state?.level as Level | undefined;
  const joinCode = location.state?.joinCode as string | undefined;
  const inviteFriend = location.state?.inviteFriend as { id: string; name: string } | undefined;

  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const {
    session,
    players,
    createSession,
    joinByCode,
    setReady,
    startGame,
    leaveSession,
  } = useLocalMultiplayer(user?.id, profile?.display_name || 'Player');

  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/lobby', level } });
    }
  }, [authLoading, isAuthenticated, navigate, level]);

  useEffect(() => {
    if (joinCode && !session) {
      handleJoinByCode(joinCode);
    }
  }, [joinCode, session]);

  useEffect(() => {
    if (session) {
      setIsHost(session.host_id === user?.id);
    }
  }, [session?.id, user?.id]);

  const handleCreatePublic = async () => {
    if (!level) return;
    setIsCreating(true);
    try {
      await createSession(level.id, true, selectedColor);
      toast.success('Public lobby created!');
    } catch (error) {
      toast.error('Failed to create lobby');
    }
    setIsCreating(false);
  };

  const handleCreatePrivate = async () => {
    if (!level) return;
    setIsCreating(true);
    try {
      const newSession = await createSession(level.id, false, selectedColor);
      if (newSession?.room_code) {
        toast.success(`Private lobby created! Code: ${newSession.room_code}`);
      }
    } catch (error) {
      toast.error('Failed to create lobby');
    }
    setIsCreating(false);
  };

  const handleJoinByCode = async (code: string) => {
    try {
      await joinByCode(code, selectedColor);
      toast.success('Joined lobby!');
    } catch (error) {
      toast.error('Room not found or game already started');
    }
  };

  const copyRoomCode = () => {
    if (session?.room_code) {
      navigator.clipboard.writeText(session.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReady = () => {
    if (session) {
      setReady(session.id);
    }
  };

  const handleStart = () => {
    const allReady = players.every(p => p.is_ready);
    if (!allReady) {
      toast.error('All players must be ready!');
      return;
    }
    try {
      if (session) {
        startGame(session.id);
        // Host navigates immediately
        setTimeout(() => {
          navigate('/play-multiplayer', { state: { level, session } });
        }, 100);
      }
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const handleLeave = () => {
    if (session) {
      leaveSession(session.id);
    }
    navigate('/browse');
  };

  // Listen for game start
  useEffect(() => {
    if (session?.status === 'playing') {
      // Give a small delay to ensure session is fully synced
      const timer = setTimeout(() => {
        navigate('/play-multiplayer', { state: { level, session } });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [session?.status, navigate, level, session]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-pixel text-primary text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  // Not in a session yet
  if (!session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/browse')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>

          <div className="mt-8 text-center">
            <h1 className="font-pixel text-2xl text-primary text-glow mb-2">MULTIPLAYER LOBBY</h1>
            {level && (
              <p className="font-pixel-body text-muted-foreground text-lg">
                Level: {level.name}
              </p>
            )}
          </div>

          {/* Color selection */}
          <div className="mt-8 bg-card/50 p-6 pixel-border">
            <h2 className="font-pixel text-sm text-foreground mb-4">SELECT YOUR COLOR</h2>
            <div className="flex gap-3 flex-wrap">
              {PLAYER_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 pixel-border transition-transform ${
                    selectedColor === color ? 'scale-110 ring-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {level ? (
            <div className="mt-8 space-y-4">
              <h2 className="font-pixel text-sm text-foreground">CREATE A LOBBY</h2>
              <div className="grid grid-cols-2 gap-4">
                <GameButton
                  variant="primary"
                  size="lg"
                  onClick={handleCreatePublic}
                  disabled={isCreating}
                >
                  <Users size={18} className="mr-2" />
                  Public Game
                </GameButton>
                <GameButton
                  variant="outline"
                  size="lg"
                  onClick={handleCreatePrivate}
                  disabled={isCreating}
                >
                  🔒 Private Game
                </GameButton>
              </div>
            </div>
          ) : (
            <div className="mt-8 bg-card/50 p-6 pixel-border">
              <h2 className="font-pixel text-sm text-foreground mb-4">JOIN WITH CODE</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  maxLength={6}
                  className="flex-1 bg-background border-2 border-border px-4 py-3 font-pixel text-center text-xl tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
                />
                <GameButton
                  variant="primary"
                  onClick={() => handleJoinByCode(roomCode)}
                  disabled={roomCode.length !== 6}
                >
                  Join
                </GameButton>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // In a session
  const currentPlayer = players.find(p => p.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <GameButton variant="ghost" size="sm" onClick={handleLeave}>
          <ArrowLeft size={16} className="mr-2" />
          Leave Lobby
        </GameButton>

        <div className="mt-8 text-center">
          <h1 className="font-pixel text-2xl text-primary text-glow mb-2">
            {session.is_public ? 'PUBLIC LOBBY' : 'PRIVATE LOBBY'}
          </h1>
          
          {inviteFriend && (
            <p className="font-pixel-body text-secondary text-sm mb-4">
              Playing with: <span className="text-primary font-bold">{inviteFriend.name}</span>
            </p>
          )}
          
          {session.room_code && (
            <div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="font-pixel text-xl tracking-widest text-accent">
                  {session.room_code}
                </span>
                <GameButton variant="ghost" size="sm" onClick={copyRoomCode}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </GameButton>
              </div>
              {inviteFriend && (
                <p className="font-pixel-body text-muted-foreground text-xs mt-2">
                  Share this code with {inviteFriend.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Players list */}
        <div className="mt-8 bg-card/50 p-6 pixel-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-pixel text-sm text-foreground">
              PLAYERS ({players.length}/{session.max_players})
            </h2>
            <RefreshCw size={16} className="text-muted-foreground animate-spin" />
          </div>

          <div className="space-y-3">
            {players.map(player => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-background/50 p-3 pixel-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 pixel-border"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-pixel-body text-foreground">
                    {player.player_name}
                  </span>
                  {player.user_id === session.host_id && (
                    <Crown size={14} className="text-accent" />
                  )}
                </div>
                <span className={`font-pixel text-xs ${
                  player.is_ready ? 'text-success' : 'text-muted-foreground'
                }`}>
                  {player.is_ready ? 'READY' : 'NOT READY'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <GameButton
            variant={currentPlayer?.is_ready ? 'outline' : 'primary'}
            size="lg"
            className="flex-1"
            onClick={handleReady}
          >
            {currentPlayer?.is_ready ? 'Cancel Ready' : 'Ready Up!'}
          </GameButton>

          {isHost && (
            <GameButton
              variant="success"
              size="lg"
              onClick={handleStart}
              disabled={players.length < 2}
            >
              <Play size={18} className="mr-2" />
              Start Game
            </GameButton>
          )}
        </div>

        {isHost && players.length < 2 && (
          <p className="text-center font-pixel-body text-muted-foreground text-sm mt-4">
            Waiting for more players to join...
          </p>
        )}
      </div>
    </div>
  );
}
