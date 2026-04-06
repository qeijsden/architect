import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Level, Player, Block, GameSession } from '@/types/game';
import { GameRoom } from '@/integrations/playfab/client';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameButton } from '@/components/ui/GameButton';
import { LevelMusicPlayer } from '@/components/game/LevelMusicPlayer';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useLocalMultiplayer } from '@/hooks/useLocalMultiplayer';
import { useOnlineMultiplayer } from '@/hooks/useOnlineMultiplayer';
import { useAuth } from '@/hooks/useAuth';
import { useLevels } from '@/hooks/useLevels';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ArrowLeft, RotateCcw, Heart, Clock, Users, Volume2, VolumeX } from 'lucide-react';
import { toast } from '@/lib/announcer';
import { blockHasBehavior } from '@/lib/blockBehaviors';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 32;
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 50;
const POSITION_UPDATE_INTERVAL = 50; // ms between position broadcasts

// Generate ground hazard blocks
const generateGroundBlocks = (): Block[] => {
  const blocks: Block[] = [];
  const LEVEL_WIDTH = CANVAS_WIDTH * 5;
  for (let x = -LEVEL_WIDTH; x < LEVEL_WIDTH * 2; x += GRID_SIZE) {
    for (let depth = 0; depth < GROUND_DEPTH; depth++) {
      blocks.push({
        id: `ground-${x}-${depth}`,
        type: 'hazard',
        x,
        y: GROUND_Y + (depth * GRID_SIZE),
        width: GRID_SIZE,
        height: GRID_SIZE,
        isLocked: true,
      });
    }
  }
  return blocks;
};

export default function PlayMultiplayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const level = location.state?.level as Level | undefined;
  const session = location.state?.session as GameSession | GameRoom | undefined;
  const mode = location.state?.mode as 'online' | 'local' | undefined;
  const isOnline = mode === 'online';

  const { user, profile } = useAuth();
  const { incrementPlays, incrementCompletions } = useLevels();
  const {
    remotePlayers: localRemotePlayers,
    isConnected: localIsConnected,
    updatePosition: updateLocalPosition,
    recordFinish: recordLocalFinish,
    leaveSession: leaveLocalSession,
    joinSession: joinLocalSession,
  } = useLocalMultiplayer(user?.id, profile?.display_name || 'Player');

  const {
    remotePlayers: onlineRemotePlayers,
    isConnected: onlineIsConnected,
    updatePosition: updateOnlinePosition,
    joinRoom,
    leaveRoom,
    room: onlineRoom,
  } = useOnlineMultiplayer(user?.id, profile?.display_name || 'Player');

  const activeSessionId = !isOnline && session && 'id' in session ? session.id : undefined;
  const activeRoomId = isOnline && session && 'RoomId' in session ? session.RoomId : undefined;

  const remotePlayers = isOnline ? onlineRemotePlayers : localRemotePlayers;
  const isConnected = isOnline ? onlineIsConnected : localIsConnected;
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { handleKeyDown, handleKeyUp, updatePlayer, resetCrumbleTimers, getUpdatedBlockPositions, getCannonBalls } = useGamePhysics();
  const { playSound, setEnabled: setSoundEffectsEnabled } = useSoundEffects();
  
  const gameLoopRef = useRef<number>();
  const timerRef = useRef<number>();
  const positionUpdateRef = useRef<number>();
  const hasIncrementedPlays = useRef(false);

  // Combine level blocks with ground hazards
  useEffect(() => {
    if (level) {
      const groundBlocks = generateGroundBlocks();
      setAllBlocks([...groundBlocks, ...level.blocks]);
    }
  }, [level]);

  // Spawn position
  const spawnPosition = useMemo(() => {
    if (!level) return { x: 64, y: GROUND_Y - 96 };
    const spawn = level.blocks.find((block) => blockHasBehavior(block, 'spawn'));
    return spawn ? { x: spawn.x, y: spawn.y - 32 } : { x: 64, y: GROUND_Y - 96 };
  }, [level]);

  const goalPosition = useMemo(() => {
    if (!level) return null;
    const goal = level.blocks.find((block) => blockHasBehavior(block, 'goal'));
    return goal ? { x: goal.x, y: goal.y } : null;
  }, [level]);

  const playerProgress = useMemo(() => {
    if (!player || !goalPosition) return 0;
    const startX = spawnPosition.x;
    const endX = goalPosition.x;
    const totalDistance = Math.abs(endX - startX);
    if (totalDistance === 0) return 100;
    const currentDistance = Math.abs(player.x - startX);
    return Math.min(100, Math.max(0, (currentDistance / totalDistance) * 100));
  }, [player, goalPosition, spawnPosition]);

  const getSpawnPoint = useCallback((lastCheckpoint?: { x: number; y: number }) => {
    if (lastCheckpoint) return lastCheckpoint;
    return spawnPosition;
  }, [spawnPosition]);

  const initPlayer = useCallback((preserveCheckpoint = false) => {
    const checkpoint = preserveCheckpoint && player?.lastCheckpoint ? player.lastCheckpoint : undefined;
    const spawnPoint = getSpawnPoint(checkpoint);
    
    setPlayer({
      id: user?.id || 'player1',
      x: spawnPoint.x,
      y: spawnPoint.y,
      vx: 0,
      vy: 0,
      color: profile?.avatar_color || '#26c6da',
      isGrounded: false,
      isDead: false,
      hasWon: false,
      lastCheckpoint: checkpoint,
      name: profile?.display_name || 'Player',
      isLocal: true,
      team: 'team1',
      score: 0,
    });
    setCameraX(Math.max(-CANVAS_WIDTH * 5, spawnPoint.x - CANVAS_WIDTH / 3));
    setCameraY(Math.max(-1000, spawnPoint.y - CANVAS_HEIGHT / 2));
  }, [getSpawnPoint, profile?.avatar_color, profile?.display_name, player?.lastCheckpoint, user?.id]);

  const handleRestart = () => {
    setDeaths(0);
    setTimeElapsed(0);
    setHasWon(false);
    resetCrumbleTimers();
    initPlayer(false);
  };

  const handleLeave = async () => {
    if (isOnline) {
      if (activeRoomId) {
        await leaveRoom(activeRoomId);
      }
    } else if (activeSessionId) {
      await leaveLocalSession(activeSessionId);
    }
    navigate('/browse');
  };

  // Initialize game
  useEffect(() => {
    if (!level || !session) {
      navigate('/browse');
      return;
    }

    if (isOnline) {
      if (!activeRoomId) {
        navigate('/browse');
        return;
      }

      // Only join if not already connected to this room
      if (!onlineRoom || onlineRoom.RoomId !== activeRoomId) {
        console.log('PlayMultiplayer: Joining room', activeRoomId);
        joinRoom(activeRoomId, profile?.avatar_color || '#26c6da').catch(err => {
          console.error('PlayMultiplayer: Failed to join room:', err);
        });
      } else {
        console.log('PlayMultiplayer: Already in room', activeRoomId);
      }
    } else {
      if (!activeSessionId) {
        navigate('/browse');
        return;
      }

      console.log('PlayMultiplayer: Setting up session', activeSessionId);
      joinLocalSession(activeSessionId, profile?.avatar_color || '#26c6da').catch(err => {
        console.error('PlayMultiplayer: Failed to join session:', err);
      });
    }
    
    if (!hasIncrementedPlays.current && level.id) {
      incrementPlays(level.id);
      hasIncrementedPlays.current = true;
    }
    
    initPlayer();

    return () => {
      if (isOnline) {
        if (activeRoomId) {
          leaveRoom(activeRoomId);
        }
      } else if (activeSessionId) {
        leaveLocalSession(activeSessionId);
      }
    };
  }, [level, session, navigate, initPlayer, incrementPlays, profile?.avatar_color, isOnline, activeRoomId, activeSessionId, joinRoom, joinLocalSession, leaveRoom, leaveLocalSession, onlineRoom]);

  // Timer
  useEffect(() => {
    if (hasWon) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeElapsed(prev => prev + 0.1);
    }, 100); // Update every 100ms for decimal precision

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasWon]);



  // Broadcast position updates to other players
  useEffect(() => {
    if (!player || !isConnected) return;

    positionUpdateRef.current = window.setInterval(() => {
      if (player) {
        if (isOnline && activeRoomId) {
          updateOnlinePosition(activeRoomId, {
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
            isDead: player.isDead,
            hasWon: player.hasWon,
          });
        } else if (activeSessionId) {
          updateLocalPosition(activeSessionId, {
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
            isDead: player.isDead,
            hasWon: player.hasWon,
          });
        }
      }
    }, POSITION_UPDATE_INTERVAL);

    return () => {
      if (positionUpdateRef.current) clearInterval(positionUpdateRef.current);
    };
  }, [player, isConnected, isOnline, activeRoomId, activeSessionId, updateOnlinePosition, updateLocalPosition]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setAllBlocks(prev => prev.map(block => (block.id === id ? { ...block, ...updates } : block)));
  }, []);

  // Handle win
  useEffect(() => {
    const handleWin = async () => {
      if (!hasWon || !session) return;
      
      if (level && level.id !== 'tutorial') {
        incrementCompletions(level.id);
      }

      // Record finish in multiplayer session
      if (!isOnline && activeSessionId) {
        await recordLocalFinish(activeSessionId, true);
      }
      toast.success(`You finished! Time: ${formatTime(timeElapsed)} Deaths: ${deaths}`);
    };

    handleWin();
  }, [hasWon, session, level, timeElapsed, deaths, incrementCompletions, isOnline, activeSessionId, recordLocalFinish]);

  // Game loop
  useEffect(() => {
    if (!player || !level || hasWon || allBlocks.length === 0) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      setPlayer(prev => {
        if (!prev) return null;
        const updated = updatePlayer(prev, allBlocks, CANVAS_HEIGHT, updateBlock, cameraY);

        const targetCameraX = Math.max(-CANVAS_WIDTH * 5, updated.x - CANVAS_WIDTH / 3);
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * 0.1);
        
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * 0.1);

        if (updated.hasWon && !prev.hasWon) {
          setHasWon(true);
          playSound('win');
        }

        if (updated.lastCheckpoint && (!prev.lastCheckpoint || 
            updated.lastCheckpoint.x !== prev.lastCheckpoint.x ||
            updated.lastCheckpoint.y !== prev.lastCheckpoint.y)) {
          playSound('checkpoint');
        }

        if (updated.isDead && !prev.isDead) {
          setDeaths(d => d + 1);
          playSound('death');
          setTimeout(() => {
            const spawnPoint = getSpawnPoint(prev.lastCheckpoint);
            setPlayer({
              id: user?.id || 'player1',
              x: spawnPoint.x,
              y: spawnPoint.y,
              vx: 0,
              vy: 0,
              color: profile?.avatar_color || '#26c6da',
              isGrounded: false,
              isDead: false,
              hasWon: false,
              lastCheckpoint: prev.lastCheckpoint,
              name: profile?.display_name || 'Player',
              isLocal: true,
              team: prev.team,
              score: prev.score,
            });
          }, 300);
        }

        return updated;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [player, level, hasWon, handleKeyDown, handleKeyUp, updatePlayer, getSpawnPoint, profile?.avatar_color, profile?.display_name, cameraY, allBlocks, playSound, user?.id, updateBlock]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Combine local player with remote players
  const allPlayers = useMemo(() => {
    const players: Player[] = [];
    if (player) players.push(player);
    players.push(...remotePlayers);
    return players;
  }, [player, remotePlayers]);

  if (!level || !session) return null;

  return (
    <div className="min-h-screen bg-[#0a0e14] p-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-[960px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GameButton variant="ghost" size="sm" onClick={handleLeave}>
            <ArrowLeft size={16} className="mr-2" />
            Leave
          </GameButton>
          <div>
            <h1 className="font-pixel text-sm text-primary">{level.name}</h1>
            <p className="font-pixel-body text-muted-foreground">Multiplayer Race</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary">
            <Users size={18} />
            <span className="font-pixel text-sm">{allPlayers.length} players</span>
          </div>
          {/* Time Attack Mode HUD */}
          <div className="flex items-center gap-2 text-accent">
            <Clock size={18} />
            <span className="font-pixel text-sm">{formatTime(timeElapsed)}</span>
          </div>

          <div className="flex items-center gap-2 text-destructive">
            <Heart size={18} />
            <span className="font-pixel text-sm">{deaths}</span>
          </div>
          <GameButton 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              setSoundEffectsEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </GameButton>
          <GameButton variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw size={14} className="mr-2" />
            Restart
          </GameButton>
        </div>
      </div>

      <LevelMusicPlayer
        trackUrl={level.trackUrl}
        trackTitle={level.trackTitle}
        trackArtist={level.trackArtist}
        enabled={soundEnabled}
        autoplayExternalFallback
        className="max-w-[960px]"
      />

      {/* Connection status */}
      {!isConnected && (
        <div className="bg-destructive/20 border border-destructive px-4 py-2 mb-4">
          <p className="font-pixel text-sm text-destructive">Connecting to game...</p>
        </div>
      )}

      {/* Game canvas */}
      <div className="relative">
        <GameCanvas
          blocks={allBlocks}
          players={allPlayers}
          isEditing={false}
          selectedBlock={null}
          onPlaceBlock={() => {}}
          onRemoveBlock={() => {}}
          cameraX={cameraX}
          cameraY={cameraY}
          getUpdatedBlockPositions={getUpdatedBlockPositions}
          goalPosition={goalPosition}
          playerProgress={playerProgress}
          cannonBalls={getCannonBalls()}
          texturePack={level?.texturePack}
          customBlocks={level?.customBlocks}
        />

        {/* Win overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <h2 className="font-pixel text-3xl text-success text-glow mb-4">
              RACE COMPLETE!
            </h2>
            <div className="flex gap-8 mb-8">
              <div className="text-center">
                <p className="font-pixel-body text-muted-foreground text-lg">Time</p>
                <p className="font-pixel text-2xl text-accent">{formatTime(timeElapsed)}</p>
              </div>
              <div className="text-center">
                <p className="font-pixel-body text-muted-foreground text-lg">Deaths</p>
                <p className="font-pixel text-2xl text-destructive">{deaths}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <GameButton variant="primary" size="lg" onClick={handleRestart}>
                Play Again
              </GameButton>
              <GameButton variant="outline" size="lg" onClick={handleLeave}>
                Leave Game
              </GameButton>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="mt-4 text-center font-pixel-body text-muted-foreground text-lg">
        <span className="text-primary">WASD</span> or <span className="text-primary">Arrow Keys</span> to move • <span className="text-primary">Space</span> to jump
      </div>

      {/* Remote players list */}
      <div className="mt-4 flex gap-2 flex-wrap justify-center">
        {remotePlayers.map(p => (
          <div 
            key={p.id} 
            className="flex items-center gap-2 bg-card/50 px-3 py-1 border border-border"
          >
            <div 
              className="w-4 h-4" 
              style={{ backgroundColor: p.color }}
            />
            <span className="font-pixel-body text-sm text-foreground">{p.name}</span>
            {p.hasWon && <span className="text-success">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
