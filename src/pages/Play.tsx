import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Level, Player, Block } from '@/types/game';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameButton } from '@/components/ui/GameButton';
import { Leaderboard } from '@/components/game/Leaderboard';
import { LevelMusicPlayer } from '@/components/game/LevelMusicPlayer';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useXboxGamepad } from '@/hooks/useXboxGamepad';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useLevels } from '@/hooks/useLevels';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import { getLevelGhostRunsFromPlayFab, publishGhostRunToPlayFab, GhostRunPayload } from '@/integrations/playfab/api';
import { ArrowLeft, RotateCcw, Heart, Clock, Trophy, AlertTriangle, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { toast } from '@/lib/announcer';
import { blockHasBehavior } from '@/lib/blockBehaviors';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 32;
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 50;
const PLAY_CANVAS_WIDTH = 1200;
const PLAY_CANVAS_HEIGHT = 675;
const PLAY_CAMERA_ZOOM = 1;
const PLAYER_SCREEN_OFFSET_X = PLAY_CANVAS_WIDTH / 3;

type GhostPoint = {
  t: number;
  x: number;
  y: number;
};

type GhostRun = GhostRunPayload;

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
  const { friends } = useFriends(user?.id, profile?.display_name || 'Player');
  const { incrementPlays, incrementCompletions, recordUniquePlay, recordUniqueCompletion } = useLevels();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [runFailedReason, setRunFailedReason] = useState<'time' | 'death' | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeGhostRuns, setActiveGhostRuns] = useState<GhostRun[]>([]);
  const [survivalReviveCharges, setSurvivalReviveCharges] = useState(0);
  const [survivalOrbsCollected, setSurvivalOrbsCollected] = useState(0);

  const { handleKeyDown, handleKeyUp, updatePlayer, resetCrumbleTimers, getUpdatedBlockPositions, getCannonBalls, updateGamepadInput } = useGamePhysics();
  const { getGamepadInput, vibrate, isConnected: gamepadConnected } = useXboxGamepad();
  const levelMode = level?.mode || 'race';
  const isSurvivalLevel = levelMode === 'survival';
  const targetTimeSeconds = isSurvivalLevel
    ? level?.survival_time_seconds || level?.max_time_seconds || 60
    : level?.max_time_seconds || null;
  const { submitScore } = useLeaderboard(level?.id || '', levelMode);
  const { playSound, setEnabled: setSoundEffectsEnabled } = useSoundEffects();
  
  const gameLoopRef = useRef<number>();
  const timerRef = useRef<number>();
  const hasIncrementedPlays = useRef(false);
  const hasRecordedCompletion = useRef(false);
  const hasSubmittedScore = useRef(false);
  const runStartRef = useRef<number>(0);
  const ghostPathRef = useRef<GhostPoint[]>([]);
  const ghostLastSampleRef = useRef<number>(0);
  const appliedTimerOrbIdsRef = useRef<Set<string>>(new Set());
  const survivalReviveChargesRef = useRef(0);

  const getPlayerStatsId = useCallback(() => {
    if (user?.id) return user.id;
    const key = 'player_stats_anon_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const anonId = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, anonId);
    return anonId;
  }, [user?.id]);

  useEffect(() => {
    survivalReviveChargesRef.current = survivalReviveCharges;
  }, [survivalReviveCharges]);

  // Combine level blocks with ground hazards
  useEffect(() => {
    if (level) {
      const groundBlocks = generateGroundBlocks();
      setAllBlocks([
        ...groundBlocks,
        ...level.blocks.map((block) => ({
          ...block,
          collected: block.type === 'timer_orb' || block.customBehaviorTypes?.includes('timer_orb') ? false : block.collected,
        })),
      ]);
    }
  }, [level]);

  useEffect(() => {
    for (const block of allBlocks) {
      const hasTimerOrbBehavior = block.type === 'timer_orb' || block.customBehaviorTypes?.includes('timer_orb');
      if (!hasTimerOrbBehavior || !block.collected || appliedTimerOrbIdsRef.current.has(block.id)) continue;

      appliedTimerOrbIdsRef.current.add(block.id);
      const bonusSeconds = block.timerBonusSeconds || 5;
      if (isSurvivalLevel) {
        const grantedCharges = Math.max(1, Math.round(bonusSeconds / 5));
        setSurvivalReviveCharges((prev) => prev + grantedCharges);
        setSurvivalOrbsCollected((prev) => prev + 1);
        toast.success(`Timer orb charged ${grantedCharges} revive ${grantedCharges === 1 ? 'use' : 'uses'}.`);
      } else {
        setTimeElapsed((prev) => Math.max(0, prev - bonusSeconds));
        toast.success(`Timer orb collected: +${bonusSeconds}s`);
      }
    }
  }, [allBlocks, isSurvivalLevel]);

  useEffect(() => {
    if (!level) return;

    let cancelled = false;
    (async () => {
      const allGhostRuns = await getLevelGhostRunsFromPlayFab(level.id);
      if (cancelled) return;

      if (!allGhostRuns.length) {
        setActiveGhostRuns([]);
        return;
      }

      const friendIds = new Set((friends || []).map((f) => f.friend_profile?.id).filter(Boolean) as string[]);
      const creatorId = level.author_id;

      const eligible = allGhostRuns.filter((run) => {
        const isFriendGhost = friendIds.has(run.userId);
        const isCreatorGhost = Boolean(creatorId && run.userId === creatorId);
        return isFriendGhost || isCreatorGhost;
      });

      const bestPerUser = new Map<string, GhostRun>();
      for (const run of eligible) {
        const current = bestPerUser.get(run.userId);
        if (!current || run.durationMs < current.durationMs) {
          bestPerUser.set(run.userId, run);
        }
      }

      setActiveGhostRuns(Array.from(bestPerUser.values()));
    })();

    return () => {
      cancelled = true;
    };
  }, [friends, level]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setAllBlocks(prev => prev.map(block => (block.id === id ? { ...block, ...updates } : block)));
  }, []);

  // Find spawn and goal positions
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

  // Calculate progress (0-100)
  const playerProgress = useMemo(() => {
    if (isSurvivalLevel) {
      if (!targetTimeSeconds) return 0;
      return Math.min(100, Math.max(0, (timeElapsed / targetTimeSeconds) * 100));
    }
    if (!player || !goalPosition) return 0;
    const startX = spawnPosition.x;
    const endX = goalPosition.x;
    const totalDistance = Math.abs(endX - startX);
    if (totalDistance === 0) return 100;
    
    const currentDistance = Math.abs(player.x - startX);
    const progress = (currentDistance / totalDistance) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [player, goalPosition, spawnPosition, isSurvivalLevel, targetTimeSeconds, timeElapsed]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!targetTimeSeconds) return null;
    return Math.max(0, targetTimeSeconds - timeElapsed);
  }, [targetTimeSeconds, timeElapsed]);

  // Get spawn point (prioritize checkpoints)
  const getSpawnPoint = useCallback((lastCheckpoint?: { x: number; y: number }) => {
    if (lastCheckpoint) return lastCheckpoint;
    return spawnPosition;
  }, [spawnPosition]);

  const getCameraTargetX = useCallback(
    (x: number) => Math.max(-CANVAS_WIDTH * 5, x - PLAYER_SCREEN_OFFSET_X),
    [],
  );

  // Initialize player
  const initPlayer = useCallback((preserveCheckpoint = false) => {
    const checkpoint = preserveCheckpoint && player?.lastCheckpoint ? player.lastCheckpoint : undefined;
    const spawnPoint = getSpawnPoint(checkpoint);
    hasSubmittedScore.current = false;
    appliedTimerOrbIdsRef.current.clear();
    setSurvivalReviveCharges(0);
    setSurvivalOrbsCollected(0);
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
    setCameraX(getCameraTargetX(spawnPoint.x));
    setCameraY(Math.max(-1000, spawnPoint.y - CANVAS_HEIGHT / 2));
    runStartRef.current = performance.now();
    ghostLastSampleRef.current = 0;
    ghostPathRef.current = [{ t: 0, x: spawnPoint.x, y: spawnPoint.y }];
  }, [getSpawnPoint, getCameraTargetX, profile?.avatar_color, player?.lastCheckpoint]);

  // Restart level
  const handleRestart = () => {
    setDeaths(0);
    setTimeElapsed(0);
    setHasWon(false);
    setRunFailedReason(null);
    resetCrumbleTimers();
    appliedTimerOrbIdsRef.current.clear();
    setSurvivalReviveCharges(0);
    setSurvivalOrbsCollected(0);
    setAllBlocks((prev) => prev.map((block) => {
      const hasTimerOrbBehavior = block.type === 'timer_orb' || block.customBehaviorTypes?.includes('timer_orb');
      return hasTimerOrbBehavior ? { ...block, collected: false } : block;
    }));
    initPlayer(false);
  };

  // Initialize game
  useEffect(() => {
    if (!level) {
      navigate('/browse');
      return;
    }
    
    // Increment plays once per unique player
    if (!hasIncrementedPlays.current && level.id && level.id !== 'tutorial') {
      const playerId = getPlayerStatsId();
      recordUniquePlay(level.id, playerId).then((wasRecorded) => {
        // Backward compatibility for old level records that may not have unique arrays yet
        if (!wasRecorded) return;
        if (!(level.played_by && level.played_by.length > 0)) {
          incrementPlays(level.id);
        }
      });
      hasIncrementedPlays.current = true;
    }
    
    initPlayer();
  }, [level, navigate, initPlayer, incrementPlays, getPlayerStatsId, recordUniquePlay]);

  // Timer
  useEffect(() => {
    if (hasWon || runFailedReason) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 0.1;
        if (isSurvivalLevel) {
          if (targetTimeSeconds && newTime >= targetTimeSeconds) {
            setHasWon(true);
          }
        } else if (targetTimeSeconds && newTime >= targetTimeSeconds) {
          setRunFailedReason('time');
          toast.error('Time expired! Try again.');
        }
        return newTime;
      });
    }, 100); // Update every 100ms for decimal precision

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasWon, runFailedReason, isSurvivalLevel, targetTimeSeconds]);

  // Submit score and mark tutorial complete on win
  useEffect(() => {
    const handleWin = async () => {
      if (!hasWon) return;

      if (level && user?.id && ghostPathRef.current.length > 3) {
        const durationMs = Math.max(1, Math.floor(timeElapsed * 1000));
        const trimmedPath = ghostPathRef.current.filter((_, idx) => idx % 2 === 0).slice(0, 2500);

        const run: GhostRun = {
          levelId: level.id,
          userId: user.id,
          playerName: profile?.display_name || user.name || 'Player',
          color: profile?.avatar_color || '#26c6da',
          avatarPixels: Array.isArray(profile?.avatar_pixels) ? [...profile.avatar_pixels] : undefined,
          durationMs,
          completedAt: new Date().toISOString(),
          path: trimmedPath,
        };

        await publishGhostRunToPlayFab(run);
      }

      // Increment completion count once per unique player (non-tutorial)
      if (level && level.id !== 'tutorial' && !hasRecordedCompletion.current) {
        const playerId = getPlayerStatsId();
        const recorded = await recordUniqueCompletion(level.id, playerId);
        // Backward compatibility for old level records without unique arrays
        if (recorded && !(level.completed_by && level.completed_by.length > 0)) {
          incrementCompletions(level.id);
        }
        hasRecordedCompletion.current = true;
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
      if (isAuthenticated && user && profile && level && level.id !== 'tutorial' && !hasSubmittedScore.current) {
        hasSubmittedScore.current = true;
        submitScore(user.id, profile.display_name, timeElapsed, deaths, levelMode);
      }
    };

    handleWin();
  }, [hasWon, isAuthenticated, user, profile, level, submitScore, timeElapsed, deaths, isTutorial, incrementCompletions, getPlayerStatsId, recordUniqueCompletion, levelMode]);

  useEffect(() => {
    const submitSurvivalRun = async () => {
      if (!isSurvivalLevel || runFailedReason !== 'death' || hasWon) return;
      if (!isAuthenticated || !user || !profile || !level || level.id === 'tutorial' || hasSubmittedScore.current) return;

      hasSubmittedScore.current = true;
      await submitScore(user.id, profile.display_name, timeElapsed, deaths, levelMode);
    };

    submitSurvivalRun();
  }, [isSurvivalLevel, runFailedReason, hasWon, isAuthenticated, user, profile, level, submitScore, timeElapsed, deaths, levelMode]);

  // Game loop
  useEffect(() => {
    if (!player || !level || hasWon || runFailedReason || allBlocks.length === 0) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      // Update gamepad input for physics system
      updateGamepadInput(getGamepadInput());

      setPlayer(prev => {
        if (!prev) return null;
        const updated = updatePlayer(prev, allBlocks, CANVAS_HEIGHT, updateBlock, cameraY);

        // Update camera X
        const targetCameraX = getCameraTargetX(updated.x);
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * 0.14);
        
        // Update camera Y
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * 0.14);

        const elapsedMs = Math.max(0, Math.floor(performance.now() - runStartRef.current));
        if (elapsedMs - ghostLastSampleRef.current >= 120) {
          ghostPathRef.current.push({ t: elapsedMs, x: updated.x, y: updated.y });
          ghostLastSampleRef.current = elapsedMs;
        }

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
          if (isSurvivalLevel) {
            if (survivalReviveChargesRef.current > 0) {
              setSurvivalReviveCharges((prevCharges) => Math.max(0, prevCharges - 1));
              toast.success(`Revive reserve spent. ${Math.max(0, survivalReviveChargesRef.current - 1)} remaining.`);
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
              }, 220);
              return { ...updated, isDead: true };
            }
            setRunFailedReason('death');
            toast.error(`Survival ended at ${formatTime(timeElapsed)}.`);
            return { ...updated, isDead: true };
          }
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
  }, [player, level, hasWon, runFailedReason, handleKeyDown, handleKeyUp, updatePlayer, getSpawnPoint, getCameraTargetX, timeElapsed, deaths, profile?.avatar_color, cameraY, allBlocks, playSound, updateGamepadInput, getGamepadInput, vibrate, isSurvivalLevel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.round(Math.max(0, Math.min(100, playerProgress)));
  const survivalRemainingSeconds = timeRemaining ?? 0;
  const survivalStatusTone = !isSurvivalLevel
    ? 'text-accent'
    : survivalRemainingSeconds <= 10
      ? 'text-success'
      : survivalRemainingSeconds <= 25
        ? 'text-primary'
        : 'text-muted-foreground';
  const survivalTargetLabel = targetTimeSeconds !== null ? formatTime(targetTimeSeconds) : '--:--.--';
  const playerPixelData = useMemo(() => {
    if (!profile?.avatar_pixels || !Array.isArray(profile.avatar_pixels) || profile.avatar_pixels.length !== 32 * 32) {
      return undefined;
    }
    return {
      width: 32,
      height: 32,
      pixels: profile.avatar_pixels,
    };
  }, [profile?.avatar_pixels]);

  const ghostPlayers = useMemo(() => {
    if (!activeGhostRuns.length || hasWon || runFailedReason) return [];
    const elapsedMs = Math.floor(timeElapsed * 1000);

    const interpolate = (path: GhostPoint[], t: number): { x: number; y: number } | null => {
      if (!path.length) return null;
      if (t <= path[0].t) return { x: path[0].x, y: path[0].y };
      if (t >= path[path.length - 1].t) {
        const last = path[path.length - 1];
        return { x: last.x, y: last.y };
      }

      for (let i = 0; i < path.length - 1; i += 1) {
        const a = path[i];
        const b = path[i + 1];
        if (t >= a.t && t <= b.t) {
          const span = Math.max(1, b.t - a.t);
          const alpha = (t - a.t) / span;
          return {
            x: a.x + (b.x - a.x) * alpha,
            y: a.y + (b.y - a.y) * alpha,
          };
        }
      }

      return null;
    };

    return activeGhostRuns
      .map((run) => {
        const pos = interpolate(run.path, elapsedMs);
        if (!pos) return null;
        return {
          id: `ghost_${run.userId}`,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          color: run.color,
          isGrounded: false,
          isDead: false,
          hasWon: false,
          name: `${run.playerName} (ghost)`,
        } as Player;
      })
      .filter((ghost): ghost is Player => Boolean(ghost));
  }, [activeGhostRuns, hasWon, timeElapsed, runFailedReason]);

  const ghostPixelDataById = useMemo(() => {
    const map: Record<string, { width: number; height: number; pixels: string[] }> = {};
    for (const run of activeGhostRuns) {
      if (Array.isArray(run.avatarPixels) && run.avatarPixels.length === 32 * 32) {
        map[`ghost_${run.userId}`] = {
          width: 32,
          height: 32,
          pixels: run.avatarPixels,
        };
      }
    }
    return map;
  }, [activeGhostRuns]);

  const renderPlayers = useMemo(() => {
    const main = player ? [player] : [];
    return [...ghostPlayers, ...main];
  }, [ghostPlayers, player]);

  if (!level) return null;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      {/* Top bar */}
      <div className="w-full max-w-[1200px] mb-4 bg-[#0f2039] border-2 border-[#253f67] rounded-none px-3 py-2">
        <div className="flex items-center gap-3">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/browse')}>
            <ArrowLeft size={14} className="mr-1" />
            Back
          </GameButton>

          <div className="min-w-[220px]">
            <p className="font-pixel text-primary text-sm leading-none">{level.name}</p>
            <p className="font-pixel-body text-muted-foreground text-xs leading-none mt-1">by {level.author} • {isSurvivalLevel ? 'Survival' : 'Race'}</p>
          </div>

          <div className="flex-1 max-w-[420px]">
            <div className="h-6 bg-[#0b1528] border border-[#334a70] relative overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-pixel text-white text-xs">
                {progressPercent}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${timeRemaining !== null && timeRemaining <= 30 ? 'text-destructive' : 'text-accent'}`}>
              <Clock size={16} />
              <span className="font-pixel text-sm">{formatTime(timeElapsed)}</span>
            </div>
            {targetTimeSeconds !== null && (
              <div className="flex items-center gap-2 text-primary">
                <span className="font-pixel text-xs">Target {formatTime(targetTimeSeconds)}</span>
              </div>
            )}
            {isSurvivalLevel && (
              <>
                <div className={`flex items-center gap-2 ${survivalStatusTone}`}>
                  <span className="font-pixel text-xs">Left {formatTime(survivalRemainingSeconds)}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="font-pixel text-xs">Reserve {survivalReviveCharges}</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-1 text-destructive">
              <Heart size={14} />
              <span className="font-pixel text-xs">{deaths}</span>
            </div>
            {level.id !== 'tutorial' && (
              <GameButton variant="ghost" size="sm" onClick={() => setShowLeaderboard(true)}>
                <Trophy size={14} />
              </GameButton>
            )}
            <div className="flex items-center gap-1 px-2 py-1 border border-[#334a70] bg-[#0b1528] rounded">
              <span className="font-pixel text-xs min-w-10 text-center">{isSurvivalLevel ? `${survivalOrbsCollected} ORBS` : `${progressPercent}%`}</span>
            </div>
            <GameButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                setSoundEffectsEnabled(!soundEnabled);
              }}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </GameButton>
            <GameButton variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw size={12} className="mr-1" />
              Restart
            </GameButton>
          </div>
        </div>
      </div>

      <LevelMusicPlayer
        trackUrl={level.trackUrl}
        trackTitle={level.trackTitle}
        trackArtist={level.trackArtist}
        enabled={soundEnabled}
        autoplayExternalFallback
      />

      {isSurvivalLevel && (
        <div className="w-full max-w-[1200px] mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="border border-[#334a70] bg-[#0b1528] px-4 py-3">
            <p className="font-pixel-body text-[11px] text-muted-foreground">Survival Target</p>
            <p className="font-pixel text-sm text-primary mt-1">{survivalTargetLabel}</p>
          </div>
          <div className="border border-[#334a70] bg-[#0b1528] px-4 py-3">
            <p className="font-pixel-body text-[11px] text-muted-foreground">Time Remaining</p>
            <p className={`font-pixel text-sm mt-1 ${survivalStatusTone}`}>{formatTime(survivalRemainingSeconds)}</p>
          </div>
          <div className="border border-[#334a70] bg-[#0b1528] px-4 py-3">
            <p className="font-pixel-body text-[11px] text-muted-foreground">Revive Reserve</p>
            <p className="font-pixel text-sm text-amber-300 mt-1">{survivalReviveCharges} charge{survivalReviveCharges === 1 ? '' : 's'} • {survivalOrbsCollected} orb{survivalOrbsCollected === 1 ? '' : 's'}</p>
          </div>
        </div>
      )}

      {/* Game canvas */}
      <div className="relative">
        <GameCanvas
          blocks={allBlocks}
          players={renderPlayers}
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
          customBlocks={level?.customBlocks}
          showOverlayHud={false}
          playerPixelData={playerPixelData}
          playerPixelDataById={ghostPixelDataById}
          canvasWidth={PLAY_CANVAS_WIDTH}
          canvasHeight={PLAY_CANVAS_HEIGHT}
          scale={PLAY_CAMERA_ZOOM}
        />

        {/* Win overlay */}
        {hasWon && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <h2 className="font-pixel text-3xl text-success text-glow mb-4">
              {isTutorial ? 'TUTORIAL COMPLETE!' : isSurvivalLevel ? 'SURVIVAL COMPLETE!' : 'LEVEL COMPLETE!'}
            </h2>
            <div className="flex gap-8 mb-8">
              <div className="text-center">
                <p className="font-pixel-body text-muted-foreground text-lg">{isSurvivalLevel ? 'Survived' : 'Time'}</p>
                <p className="font-pixel text-2xl text-accent">{formatTime(timeElapsed)}</p>
              </div>
              <div className="text-center">
                <p className="font-pixel-body text-muted-foreground text-lg">Deaths</p>
                <p className="font-pixel text-2xl text-destructive">{deaths}</p>
              </div>
              {isSurvivalLevel && (
                <div className="text-center">
                  <p className="font-pixel-body text-muted-foreground text-lg">Reserve Left</p>
                  <p className="font-pixel text-2xl text-amber-300">{survivalReviveCharges}</p>
                </div>
              )}
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

        {/* Failure overlay */}
        {runFailedReason && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <AlertTriangle size={64} className="text-destructive mb-4" />
            <h2 className="font-pixel text-3xl text-destructive mb-4">{runFailedReason === 'death' ? 'SURVIVAL ENDED!' : 'TIME EXPIRED!'}</h2>
            <p className="font-pixel-body text-muted-foreground mb-8">
              {runFailedReason === 'death'
                ? <>You lasted <span className="text-accent">{formatTime(timeElapsed)}</span>{targetTimeSeconds ? <> of <span className="text-primary">{formatTime(targetTimeSeconds)}</span></> : null}. {isSurvivalLevel ? <>Collected <span className="text-amber-300">{survivalOrbsCollected}</span> timer orb{survivalOrbsCollected === 1 ? '' : 's'}.</> : null}</>
                : <>You ran out of time. Max time was {formatTime(targetTimeSeconds || 0)}</>}
            </p>
            <div className="flex gap-4">
              <GameButton variant="primary" size="lg" onClick={handleRestart}>
                {runFailedReason === 'death' ? 'Survive Again' : 'Try Again'}
              </GameButton>
              {!isTutorial && (
                <GameButton variant="outline" size="lg" onClick={() => setShowLeaderboard(true)}>
                  <Trophy size={16} className="mr-2" />
                  Leaderboard
                </GameButton>
              )}
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
        {isSurvivalLevel && (
          <span className="ml-4 text-amber-300">Timer orbs bank revive charges</span>
        )}
        {activeGhostRuns.length > 0 && (
          <span className="ml-4 text-accent">Ghosts loaded: {activeGhostRuns.length}</span>
        )}
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
            <Leaderboard levelId={level.id} mode={levelMode} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
}