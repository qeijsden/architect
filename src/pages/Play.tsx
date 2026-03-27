import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Level, Player, Block } from '@/types/game';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameButton } from '@/components/ui/GameButton';
import { Leaderboard } from '@/components/game/Leaderboard';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useXboxGamepad } from '@/hooks/useXboxGamepad';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { useLevels } from '@/hooks/useLevels';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, RotateCcw, Heart, Clock, Trophy, AlertTriangle, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 32;
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 50;

// Generate ground hazard blocks for playing (matching editor)
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

export default function Play() {
  const navigate = useNavigate();
  const location = useLocation();
  const level = location.state?.level as Level | undefined;
  const isTutorial = location.state?.isTutorial as boolean | undefined;

  const { user, profile, isAuthenticated } = useAuth();
  const { incrementPlays, incrementCompletions } = useLevels();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { handleKeyDown, handleKeyUp, updatePlayer, resetCrumbleTimers, getUpdatedBlockPositions, getCannonBalls, updateGamepadInput } = useGamePhysics();
  const { getGamepadInput, vibrate, isConnected: gamepadConnected } = useXboxGamepad();
  const { submitScore } = useLeaderboard(level?.id || '');
  const { playSound, setEnabled: setSoundEffectsEnabled, playCustomTrack, stopCustomTrack } = useSoundEffects();
  
  const gameLoopRef = useRef<number>();
  const timerRef = useRef<number>();
  const hasIncrementedPlays = useRef(false);

  // Combine level blocks with ground hazards
  useEffect(() => {
    if (level) {
      const groundBlocks = generateGroundBlocks();
      setAllBlocks([...groundBlocks, ...level.blocks]);
    }
  }, [level]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setAllBlocks(prev => prev.map(block => (block.id === id ? { ...block, ...updates } : block)));
  }, []);

  // Find spawn and goal positions
  const spawnPosition = useMemo(() => {
    if (!level) return { x: 64, y: GROUND_Y - 96 };
    const spawn = level.blocks.find(b => b.type === 'spawn');
    return spawn ? { x: spawn.x, y: spawn.y - 32 } : { x: 64, y: GROUND_Y - 96 };
  }, [level]);

  const goalPosition = useMemo(() => {
    if (!level) return null;
    const goal = level.blocks.find(b => b.type === 'goal');
    return goal ? { x: goal.x, y: goal.y } : null;
  }, [level]);

  // Calculate progress (0-100)
  const playerProgress = useMemo(() => {
    if (!player || !goalPosition) return 0;
    const startX = spawnPosition.x;
    const endX = goalPosition.x;
    const totalDistance = Math.abs(endX - startX);
    if (totalDistance === 0) return 100;
    
    const currentDistance = Math.abs(player.x - startX);
    const progress = (currentDistance / totalDistance) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [player, goalPosition, spawnPosition]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!level?.max_time_seconds) return null;
    return Math.max(0, level.max_time_seconds - timeElapsed);
  }, [level?.max_time_seconds, timeElapsed]);

  // Get spawn point (prioritize checkpoints)
  const getSpawnPoint = useCallback((lastCheckpoint?: { x: number; y: number }) => {
    if (lastCheckpoint) return lastCheckpoint;
    return spawnPosition;
  }, [spawnPosition]);

  // Initialize player
  const initPlayer = useCallback((preserveCheckpoint = false) => {
    const checkpoint = preserveCheckpoint && player?.lastCheckpoint ? player.lastCheckpoint : undefined;
    const spawnPoint = getSpawnPoint(checkpoint);
    setPlayer({
      id: 'player1',
      x: spawnPoint.x,
      y: spawnPoint.y,
      vx: 0,
      vy: 0,
      color: profile?.avatar_color || '#26c6da',
      isGrounded: false,
      isDead: false,
      hasWon: false,
      lastCheckpoint: checkpoint,
      team: 'team1',
      score: 0,
    });
    setCameraX(Math.max(-CANVAS_WIDTH * 5, spawnPoint.x - CANVAS_WIDTH / 3));
    setCameraY(Math.max(-1000, spawnPoint.y - CANVAS_HEIGHT / 2));
  }, [getSpawnPoint, profile?.avatar_color, player?.lastCheckpoint]);

  // Restart level
  const handleRestart = () => {
    setDeaths(0);
    setTimeElapsed(0);
    setHasWon(false);
    setTimeExpired(false);
    resetCrumbleTimers();
    initPlayer(false);
  };

  // Initialize game
  useEffect(() => {
    if (!level) {
      navigate('/browse');
      return;
    }
    
    // Increment plays once
    if (!hasIncrementedPlays.current && level.id && level.id !== 'tutorial') {
      incrementPlays(level.id);
      hasIncrementedPlays.current = true;
    }
    
    initPlayer();
  }, [level, navigate, initPlayer, incrementPlays]);

  // Timer
  useEffect(() => {
    if (hasWon || timeExpired) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 0.1;
        // Check max time (convert to seconds for comparison)
        if (level?.max_time_seconds && newTime >= level.max_time_seconds) {
          setTimeExpired(true);
          toast.error('Time expired! Try again.');
        }
        return newTime;
      });
    }, 100); // Update every 100ms for decimal precision

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasWon, timeExpired, level?.max_time_seconds]);

  // Submit score and mark tutorial complete on win
  useEffect(() => {
    const handleWin = async () => {
      if (!hasWon) return;

      // Increment completion count for non-tutorial levels
      if (level && level.id !== 'tutorial') {
        incrementCompletions(level.id);
      }

      // Mark tutorial as complete
      if (isTutorial) {
        if (user) {
          await supabase
            .from('profiles')
            .update({ tutorial_completed: true })
            .eq('user_id', user.id);
        } else {
          localStorage.setItem('tutorial_completed', 'true');
        }
        toast.success('Tutorial complete! You can now create your own levels.');
      }

      // Submit score
      if (isAuthenticated && user && profile && level && level.id !== 'tutorial') {
        submitScore(user.id, profile.display_name, timeElapsed, deaths);
      }
    };

    handleWin();
  }, [hasWon, isAuthenticated, user, profile, level, submitScore, timeElapsed, deaths, isTutorial, incrementCompletions]);

  // Game loop
  useEffect(() => {
    if (!player || !level || hasWon || timeExpired || allBlocks.length === 0) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      // Update gamepad input for physics system
      updateGamepadInput(getGamepadInput());

      setPlayer(prev => {
        if (!prev) return null;
        const updated = updatePlayer(prev, allBlocks, CANVAS_HEIGHT, updateBlock, cameraY);

        // Update camera X
        const targetCameraX = Math.max(-CANVAS_WIDTH * 5, updated.x - CANVAS_WIDTH / 3);
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * 0.1);
        
        // Update camera Y
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * 0.1);

        // Check win
        if (updated.hasWon && !prev.hasWon) {
          setHasWon(true);
          playSound('win');
          vibrate(200, 0.8, 0.8); // Victory vibration
          toast.success(`Level Complete! Time: ${formatTime(timeElapsed)} Deaths: ${deaths}`);
        }

        // Check checkpoint
        if (updated.lastCheckpoint && (!prev.lastCheckpoint || 
            updated.lastCheckpoint.x !== prev.lastCheckpoint.x ||
            updated.lastCheckpoint.y !== prev.lastCheckpoint.y)) {
          playSound('checkpoint');
          vibrate(100, 0.3, 0.3); // Light checkpoint vibration
        }

        // Check death - respawn at checkpoint
        if (updated.isDead && !prev.isDead) {
          setDeaths(d => d + 1);
          playSound('death');
          vibrate(300, 1.0, 1.0); // Strong death vibration
          setTimeout(() => {
            const spawnPoint = getSpawnPoint(updated.lastCheckpoint);
            setPlayer({
              id: 'player1',
              x: spawnPoint.x,
              y: spawnPoint.y,
              vx: 0,
              vy: 0,
              color: profile?.avatar_color || '#26c6da',
              isGrounded: false,
              isDead: false,
              hasWon: false,
              lastCheckpoint: updated.lastCheckpoint,
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
  }, [player, level, hasWon, timeExpired, handleKeyDown, handleKeyUp, updatePlayer, getSpawnPoint, timeElapsed, deaths, profile?.avatar_color, cameraY, allBlocks, playSound, updateGamepadInput, getGamepadInput, vibrate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (!level) return null;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-[960px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/browse')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>
          <div>
            <h1 className="font-pixel text-sm text-primary">{level.name}</h1>
            <p className="font-pixel-body text-muted-foreground">by {level.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Time Attack Mode HUD */}
          <div className={`flex items-center gap-2 ${timeRemaining !== null && timeRemaining <= 30 ? 'text-destructive' : 'text-accent'}`}>
            <Clock size={18} />
            <span className="font-pixel text-sm">{formatTime(timeElapsed)}</span>
            {level.max_time_seconds && (
              <span className="font-pixel-body text-xs text-muted-foreground">
                / {formatTime(level.max_time_seconds)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-destructive">
            <Heart size={18} />
            <span className="font-pixel text-sm">{deaths}</span>
          </div>
          {level.id !== 'tutorial' && (
            <GameButton variant="ghost" size="sm" onClick={() => setShowLeaderboard(true)}>
              <Trophy size={16} />
            </GameButton>
          )}
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

      {/* Game canvas */}
      <div className="relative">
        <GameCanvas
          blocks={allBlocks}
          players={player ? [player] : []}
          isEditing={false}
          selectedBlock={null}
          onPlaceBlock={() => {}}
          onRemoveBlock={() => {}}
          cameraX={cameraX}
          cameraY={cameraY}
          getUpdatedBlockPositions={getUpdatedBlockPositions}
          goalPosition={goalPosition}
          playerProgress={playerProgress}
          timeRemaining={timeRemaining}
          cannonBalls={getCannonBalls()}
          texturePack={level?.texturePack}
        />

        {/* Win overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <h2 className="font-pixel text-3xl text-success text-glow mb-4">
              {isTutorial ? 'TUTORIAL COMPLETE!' : 'LEVEL COMPLETE!'}
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
            {isAuthenticated && !isTutorial && (
              <p className="font-pixel-body text-success text-sm mb-4">
                Score submitted to leaderboard!
              </p>
            )}
            <div className="flex gap-4">
              <GameButton variant="primary" size="lg" onClick={handleRestart}>
                Play Again
              </GameButton>
              {!isTutorial && (
                <GameButton variant="outline" size="lg" onClick={() => setShowLeaderboard(true)}>
                  <Trophy size={16} className="mr-2" />
                  Leaderboard
                </GameButton>
              )}
              <GameButton variant="outline" size="lg" onClick={() => navigate('/browse')}>
                {isTutorial ? 'Create Level' : 'More Levels'}
              </GameButton>
            </div>
          </div>
        )}

        {/* Time expired overlay */}
        {timeExpired && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <AlertTriangle size={64} className="text-destructive mb-4" />
            <h2 className="font-pixel text-3xl text-destructive mb-4">TIME EXPIRED!</h2>
            <p className="font-pixel-body text-muted-foreground mb-8">
              You ran out of time. Max time was {formatTime(level.max_time_seconds || 0)}
            </p>
            <div className="flex gap-4">
              <GameButton variant="primary" size="lg" onClick={handleRestart}>
                Try Again
              </GameButton>
              <GameButton variant="outline" size="lg" onClick={() => navigate('/browse')}>
                Back to Levels
              </GameButton>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="mt-4 text-center font-pixel-body text-muted-foreground text-lg">
        <span className="text-primary">WASD</span> or <span className="text-primary">Arrow Keys</span> to move • <span className="text-primary">Space</span> to jump
        {gamepadConnected && (
          <span className="ml-4 text-accent inline-flex items-center gap-2">
            <Gamepad2 size={16} /> Xbox Controller Connected
          </span>
        )}
        {player?.lastCheckpoint && (
          <span className="ml-4 text-success">✓ Checkpoint active</span>
        )}
      </div>

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card pixel-border p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-sm text-primary">{level.name}</h2>
              <GameButton variant="ghost" size="sm" onClick={() => setShowLeaderboard(false)}>
                ✕
              </GameButton>
            </div>
            <Leaderboard levelId={level.id} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
}