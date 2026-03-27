import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { useLocalMultiplayer } from '@/hooks/useLocalMultiplayer';
import { useOnlineMultiplayer } from '@/hooks/useOnlineMultiplayer';
import { Level, GameSession, SessionPlayer } from '@/types/game';
import { RoomPlayer } from '@/integrations/playfab/client';
import { ArrowLeft, Users, Play, Copy, Check, RefreshCw, Crown, Wifi, WifiOff, Globe } from 'lucide-react';
import { toast } from 'sonner';

// Type guards
function isRoomPlayer(player: SessionPlayer | RoomPlayer): player is RoomPlayer {
  return 'PlayerId' in player;
}

function isSessionPlayer(player: SessionPlayer | RoomPlayer): player is SessionPlayer {
  return 'user_id' in player;
}

const PLAYER_COLORS = [
  '#26c6da', '#e53935', '#43a047', '#ffb300', 
  '#7e57c2', '#ec407a', '#ff7043', '#66bb6a'
];

export default function LobbyV2() {
  const navigate = useNavigate();
  const location = useLocation();
  const level = location.state?.level as Level | undefined;
  const joinCode = location.state?.joinCode as string | undefined;

  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  
  // Local multiplayer
  const {
    session: localSession,
    players: localPlayers,
    createSession: createLocalSession,
    joinByCode: joinLocalByCode,
    setReady: setLocalReady,
    startGame: startLocalGame,
    leaveSession: leaveLocalSession,
  } = useLocalMultiplayer(user?.id, profile?.display_name || 'Player');

  // Online multiplayer
  const {
    room: onlineRoom,
    players: onlinePlayers,
    getPublicRooms,
    createRoom: createOnlineRoom,
    joinRoom: joinOnlineRoom,
    joinByCode: joinOnlineByCode,
    setReady: setOnlineReady,
    startGame: startOnlineGame,
    leaveRoom: leaveOnlineRoom,
  } = useOnlineMultiplayer(user?.id, profile?.display_name || 'Player');

  const [mode, setMode] = useState<'local' | 'online' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [isHost, setIsHost] = useState(false);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);

  const session = mode === 'online' ? onlineRoom : localSession;
  const players = mode === 'online' ? onlinePlayers : localPlayers;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { state: { returnTo: '/lobby-v2', level } });
    }
  }, [authLoading, isAuthenticated, navigate, level]);

  useEffect(() => {
    if (joinCode && !session && mode) {
      handleJoinByCode(joinCode);
    }
  }, [joinCode, session, mode]);

  useEffect(() => {
    if (session) {
      setIsHost(mode === 'online' 
        ? onlineRoom?.HostId === user?.id 
        : localSession?.host_id === user?.id
      );
    }
  }, [session, user?.id, mode, onlineRoom, localSession]);

  useEffect(() => {
    if (!session || !level) return;

    const status = mode === 'online'
      ? (onlineRoom && 'Status' in onlineRoom ? onlineRoom.Status : undefined)
      : (localSession && 'status' in localSession ? localSession.status : undefined);

    if (status === 'playing') {
      navigate('/play-multiplayer', { state: { level, session: mode === 'online' ? onlineRoom : localSession, mode } });
    }
  }, [session, level, mode, onlineRoom, localSession, navigate]);

  // Refresh public rooms every 5 seconds
  useEffect(() => {
    if (mode === 'online') {
      let pauseUntil = 0;

      const fetchRooms = async () => {
        try {
          // Skip if paused due to rate limit
          if (Date.now() < pauseUntil) {
            console.log('Room fetch paused due to rate limit');
            return;
          }

          const rooms = await getPublicRooms();
          setPublicRooms(rooms);
        } catch (error: any) {
          // If rate limited, pause fetching for 15 seconds
          if (error?.message?.includes('rate') || error?.message?.includes('429') || error?.message?.includes('throttl')) {
            console.warn('Rate limit detected, pausing room fetch for 15 seconds');
            pauseUntil = Date.now() + 15000;
          } else {
            console.error('Failed to fetch rooms:', error);
          }
        }
      };
      
      fetchRooms(); // Initial fetch
      const interval = setInterval(fetchRooms, 5000); // Poll every 5 seconds to avoid rate limits
      return () => clearInterval(interval);
    }
  }, [mode, getPublicRooms]);

  const handleCreatePublic = async () => {
    if (!level || !mode) return;
    setIsCreating(true);
    try {
      if (mode === 'online') {
        await createOnlineRoom(level.id, true, selectedColor);
        toast.success('Public online lobby created!');
      } else {
        await createLocalSession(level.id, true, selectedColor);
        toast.success('Public local lobby created!');
      }
    } catch (error) {
      toast.error('Failed to create lobby');
    }
    setIsCreating(false);
  };

  const handleCreatePrivate = async () => {
    if (!level || !mode) return;
    setIsCreating(true);
    try {
      if (mode === 'online') {
        const room = await createOnlineRoom(level.id, false, selectedColor);
        if (room?.GameCode) {
          toast.success(`Private online lobby created! Code: ${room.GameCode}`);
        }
      } else {
        const sess = await createLocalSession(level.id, false, selectedColor);
        if (sess?.room_code) {
          toast.success(`Private local lobby created! Code: ${sess.room_code}`);
        }
      }
    } catch (error) {
      toast.error('Failed to create lobby');
    }
    setIsCreating(false);
  };

  const handleJoinByCode = async (code: string) => {
    if (!mode) return;
    try {
      if (mode === 'online') {
        await joinOnlineByCode(code, selectedColor);
      } else {
        await joinLocalByCode(code, selectedColor);
      }
      toast.success('Joined lobby!');
    } catch (error) {
      toast.error('Room not found or game already started');
    }
  };

  const handleJoinPublic = async (roomId: string) => {
    if (mode !== 'online') return;
    try {
      await joinOnlineRoom(roomId, selectedColor);
      toast.success('Joined online lobby!');
    } catch (error) {
      toast.error('Failed to join lobby');
    }
  };

  const copyRoomCode = () => {
    const code = mode === 'online' ? onlineRoom?.GameCode : localSession?.room_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReady = () => {
    if (!session) return;
    if (mode === 'online') {
      setOnlineReady(onlineRoom!.RoomId);
    } else {
      setLocalReady(localSession!.id);
    }
  };

  const handleStart = () => {
    const allReady = players.every(p => {
      if (isRoomPlayer(p)) {
        return p.IsReady;
      } else if (isSessionPlayer(p)) {
        return p.is_ready;
      }
      return false;
    });
    if (!allReady) {
      toast.error('All players must be ready!');
      return;
    }
    try {
      if (mode === 'online') {
        startOnlineGame(onlineRoom!.RoomId);
      } else {
        startLocalGame(localSession!.id);
      }
      setTimeout(() => {
        navigate('/play-multiplayer', { state: { level, session: mode === 'online' ? onlineRoom : localSession, mode } });
      }, 100);
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const handleLeave = () => {
    if (!session) return;
    if (mode === 'online') {
      leaveOnlineRoom(onlineRoom!.RoomId);
    } else {
      leaveLocalSession(localSession!.id);
    }
    navigate('/browse');
  };

  // Mode selection screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>

          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="font-pixel text-3xl text-primary text-glow">MULTIPLAYER</h1>
            </div>
            <p className="font-pixel-body text-muted-foreground mt-2">Choose game mode:</p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
            {/* Local Multiplayer */}
            <div className="bg-card/50 p-6 pixel-border hover:bg-card/70 transition cursor-pointer" onClick={() => setMode('local')}>
              <div className="flex items-center justify-center mb-4">
                <WifiOff className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-pixel text-xl text-primary text-center mb-2">LOCAL PLAY</h2>
              <p className="font-pixel-body text-muted-foreground text-sm text-center">
                Play with friends on the same device or network. Perfect for couch co-op!
              </p>
              <div className="mt-4 space-y-1 text-xs font-pixel-body text-muted-foreground/70">
                <p>✓ No server needed</p>
                <p>✓ Share room code</p>
                <p>✓ Fast & responsive</p>
              </div>
            </div>

            {/* Online Multiplayer */}
            <div className="bg-card/50 p-6 pixel-border hover:bg-card/70 transition cursor-pointer" onClick={() => setMode('online')}>
              <div className="flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-pixel text-xl text-primary text-center mb-2">ONLINE PLAY</h2>
              <p className="font-pixel-body text-muted-foreground text-sm text-center">
                Play with anyone online. Powered by PlayFab cloud backend.
              </p>
              <div className="mt-4 space-y-1 text-xs font-pixel-body text-muted-foreground/70">
                <p>✓ Play globally</p>
                <p>✓ Browser-based</p>
                <p>✓ Cloud synchronized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <GameButton variant="ghost" size="sm" onClick={() => setMode(null)}>
            <ArrowLeft size={16} className="mr-2" />
            {mode === 'online' ? 'Online' : 'Local'} Play
          </GameButton>

          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              {mode === 'online' ? <Globe className="w-8 h-8 text-primary" /> : <WifiOff className="w-8 h-8 text-primary" />}
              <h1 className="font-pixel text-2xl text-primary text-glow">
                {mode === 'online' ? 'ONLINE' : 'LOCAL'} LOBBY
              </h1>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
            <GameButton variant="primary" onClick={handleCreatePublic} disabled={isCreating}>
              <Users size={16} className="mr-2" />
              Create Public
            </GameButton>
            <GameButton variant="primary" onClick={handleCreatePrivate} disabled={isCreating}>
              <Users size={16} className="mr-2" />
              Create Private
            </GameButton>
          </div>

          <div className="mt-6 max-w-xl mx-auto bg-card/50 p-4 pixel-border">
            <p className="font-pixel-body text-muted-foreground text-xs mb-3">CHOOSE AVATAR COLOR</p>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 pixel-border transition-all ${
                    selectedColor === color ? 'border-4 border-primary scale-110' : 'border-2 border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Show public rooms for online mode */}
          {mode === 'online' && publicRooms.length > 0 && (
            <div className="mt-8 max-w-xl mx-auto">
              <h2 className="font-pixel text-lg text-primary mb-4">Available Lobbies</h2>
              <div className="space-y-3">
                {publicRooms.map(room => (
                  <div key={room.RoomId} className="bg-card/50 p-4 pixel-border flex items-center justify-between">
                    <div>
                      <p className="font-pixel-body text-foreground">{room.HostName}'s Lobby</p>
                      <p className="font-pixel-body text-muted-foreground text-sm">{room.CurrentPlayers}/{room.MaxPlayers} players</p>
                    </div>
                    <GameButton variant="primary" size="sm" onClick={() => handleJoinPublic(room.RoomId)}>
                      Join
                    </GameButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Join by code */}
          <div className="mt-8 max-w-xl mx-auto bg-card/50 p-6 pixel-border">
            <h2 className="font-pixel text-lg text-primary mb-4">Join by Code</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode(roomCode)}
                placeholder="Room code..."
                maxLength={6}
                className="flex-1 bg-background border-2 border-border px-4 py-3 font-pixel-body text-foreground placeholder:text-muted-foreground focus:border-primary outline-none uppercase"
              />
              <GameButton variant="primary" onClick={() => handleJoinByCode(roomCode)}>
                Join
              </GameButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In session - show players and ready status
  const currentPlayer = players.find(p => {
    if (isRoomPlayer(p)) {
      return p.PlayerId === user?.id;
    } else if (isSessionPlayer(p)) {
      return p.user_id === user?.id;
    }
    return false;
  });
  const isCurrentPlayerReady = currentPlayer 
    ? (isRoomPlayer(currentPlayer) ? currentPlayer.IsReady : isSessionPlayer(currentPlayer) ? currentPlayer.is_ready : false)
    : false;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <GameButton variant="ghost" size="sm" onClick={handleLeave}>
          <ArrowLeft size={16} className="mr-2" />
          Leave
        </GameButton>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {mode === 'online' ? <Globe size={24} /> : <WifiOff size={24} />}
            <h1 className="font-pixel text-2xl text-primary text-glow">
              {isHost && <Crown className="inline mr-2" size={20} />}
              IN LOBBY
            </h1>
          </div>
          {session && (
            <p className="font-pixel-body text-muted-foreground text-sm mt-2">
              Level: {mode === 'online' && 'LevelId' in session ? session.LevelId : ('level_id' in session ? session.level_id : 'Unknown')}
            </p>
          )}
        </div>

        {/* Room code display */}
        {session && (mode === 'online' ? ('GameCode' in session && session.GameCode) : ('room_code' in session && session.room_code)) && (
          <div className="mt-6 bg-card/50 p-4 pixel-border text-center">
            <p className="font-pixel-body text-muted-foreground text-xs mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-2">
              <p className="font-pixel text-lg text-primary text-glow tracking-widest">
                {mode === 'online' && 'GameCode' in session ? session.GameCode : ('room_code' in session ? session.room_code : '')}
              </p>
              <GameButton variant="ghost" size="sm" onClick={copyRoomCode}>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </GameButton>
            </div>
          </div>
        )}

        {/* Players list */}
        <div className="mt-8">
          <h2 className="font-pixel text-lg text-primary mb-4">Players ({players.length})</h2>
          <div className="space-y-3">
            {players.map(player => {
              const playerName = isRoomPlayer(player) ? player.DisplayName : isSessionPlayer(player) ? player.player_name : 'Player';
              const playerColor = isRoomPlayer(player) ? player.Color : isSessionPlayer(player) ? player.color : '#26c6da';
              const playerReady = isRoomPlayer(player) ? player.IsReady : isSessionPlayer(player) ? player.is_ready : false;
              const playerIsHost = isRoomPlayer(player) ? player.IsHost : isSessionPlayer(player) && 'host_id' in session ? player.user_id === session.host_id : false;
              const playerId = isRoomPlayer(player) ? player.PlayerId : isSessionPlayer(player) ? player.user_id : '';

              return (
                <div key={playerId} className="flex items-center justify-between bg-card/50 p-4 pixel-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 pixel-border"
                      style={{ backgroundColor: playerColor }}
                    />
                    <div>
                      <p className="font-pixel-body text-foreground flex items-center gap-2">
                        {playerIsHost && <Crown size={12} />}
                        {playerName}
                      </p>
                      <p className={`font-pixel-body text-sm ${playerReady ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {playerReady ? '✓ Ready' : 'Not ready'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ready button */}
        {currentPlayer && (
          <div className="mt-8">
            <GameButton
              variant={isCurrentPlayerReady ? 'success' : 'primary'}
              onClick={handleReady}
              className="w-full"
            >
              {isCurrentPlayerReady ? '✓ Ready' : 'Not Ready'}
            </GameButton>
          </div>
        )}

        {/* Start game button (only for host) */}
        {isHost && (
          <div className="mt-4">
            <GameButton
              variant="primary"
              onClick={handleStart}
              className="w-full"
              disabled={!players.every(p => {
                if (isRoomPlayer(p)) {
                  return p.IsReady;
                } else if (isSessionPlayer(p)) {
                  return p.is_ready;
                }
                return false;
              })}
            >
              <Play size={16} className="mr-2" />
              Start Game
            </GameButton>
          </div>
        )}
      </div>
    </div>
  );
}
