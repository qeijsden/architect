import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Block, BlockType, Player, BlockSettings, DEFAULT_BLOCK_SETTINGS, TexturePack, CustomBlockDefinition, LevelMode } from '@/types/game';
import { GameCanvas } from '@/components/game/GameCanvas';
import { BlockPalette } from '@/components/game/BlockPalette';
import { BlockSettingsPanel } from '@/components/game/BlockSettingsPanel';
import { GridSizeDialog } from '@/components/game/GridSizeDialog';
import { GameButton } from '@/components/ui/GameButton';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useAuth } from '@/hooks/useAuth';
import { useLevels } from '@/hooks/useLevels';
import { parseLevelMusicLink } from '@/lib/levelMusic';
import { ArrowLeft, Play, Square, Save, Trash2, LogIn, Link, Clock, Grid3x3, Palette, Brush, Edit3, Music4, ExternalLink } from 'lucide-react';
import { toast } from '@/lib/announcer';
import { isSpriteReadyBlock } from '@/lib/editor-sprites';
import { blockHasBehavior } from '@/lib/blockBehaviors';

const GRID_SIZE = 32;
const CANVAS_WIDTH = 1920; // Increased from 1440
const CANVAS_HEIGHT = 1080; // Increased from 720
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 50; // Increased from 25 (50 blocks deep of lava)
const LEVEL_WIDTH = CANVAS_WIDTH * 8; // Increased from * 5
const MAX_LEVEL_TIME = 300; // 5 minutes max
const EDITOR_SCALE = 1;

const buildBlockFieldOverrides = (selectedBlock: BlockType, blockSettings: BlockSettings, customBlockId?: string | null): Partial<Block> => {
  const usesBehavior = (behavior: BlockType) => selectedBlock === behavior || (selectedBlock === 'custom' && blockSettings.customBehaviorTypes.includes(behavior));

  return {
    customBlockId: selectedBlock === 'custom' ? customBlockId || undefined : undefined,
    customBehaviorTypes: selectedBlock === 'custom' ? blockSettings.customBehaviorTypes : undefined,
    direction: usesBehavior('conveyor') ? blockSettings.conveyorDirection : undefined,
    moveSpeed: usesBehavior('conveyor') ? blockSettings.conveyorSpeed : usesBehavior('moving') ? blockSettings.moveSpeed : undefined,
    moveRange: usesBehavior('moving') ? blockSettings.moveRange : undefined,
    crumbleState: usesBehavior('crumbling') ? 'solid' : undefined,
    crumbleTime: usesBehavior('crumbling') ? blockSettings.crumbleTime : undefined,
    resetTime: usesBehavior('crumbling') ? blockSettings.resetTime : undefined,
    isGhost: usesBehavior('spawn') ? blockSettings.spawnIsGhost : undefined,
    gravityMultiplier: usesBehavior('low_gravity') ? blockSettings.gravityMultiplier : undefined,
    tentacleRadius: usesBehavior('tentacle') ? blockSettings.tentacleRadius : undefined,
    tentacleForce: usesBehavior('tentacle') ? blockSettings.tentacleForce : undefined,
    speedMultiplier: usesBehavior('speed_gate') ? blockSettings.speedMultiplier : undefined,
    speedDuration: usesBehavior('speed_gate') ? blockSettings.speedDuration : undefined,
    rampDirection: usesBehavior('ramp') ? blockSettings.rampDirection : undefined,
    rampColor: usesBehavior('ramp') ? blockSettings.rampColor : undefined,
    platformColor: usesBehavior('platform') ? blockSettings.platformColor : undefined,
    pushBlockShape: usesBehavior('push_block') ? blockSettings.pushBlockShape : undefined,
    pushBlockWeight: usesBehavior('push_block') ? blockSettings.pushBlockWeight : undefined,
    cannonAngle: usesBehavior('cannon') ? blockSettings.cannonAngle : undefined,
    cannonArc: usesBehavior('cannon') ? blockSettings.cannonArc : undefined,
    cannonInterval: usesBehavior('cannon') ? blockSettings.cannonInterval : undefined,
    windForce: usesBehavior('wind') ? blockSettings.windForce : undefined,
    windDirection: usesBehavior('wind') ? blockSettings.windDirection : undefined,
    windAngle: usesBehavior('wind') ? blockSettings.windAngle : undefined,
    waterDensity: usesBehavior('water') ? blockSettings.waterDensity : undefined,
    isSlopeIce: usesBehavior('ice') && blockSettings.iceSlope !== undefined ? true : undefined,
    iceSlope: usesBehavior('ice') ? blockSettings.iceSlope : undefined,
    capSledding: usesBehavior('ice') ? blockSettings.iceCappedSledding : undefined,
    maxSlideSpeed: usesBehavior('ice') ? blockSettings.iceMaxSlideSpeed : undefined,
    pulseInterval: usesBehavior('pulse_hazard') ? blockSettings.pulseInterval : undefined,
    pulseActiveDuration: usesBehavior('pulse_hazard') ? blockSettings.pulseActiveDuration : undefined,
    phaseInterval: usesBehavior('phase_platform') ? blockSettings.phaseInterval : undefined,
    phaseActiveDuration: usesBehavior('phase_platform') ? blockSettings.phaseActiveDuration : undefined,
    timerBonusSeconds: usesBehavior('timer_orb') ? blockSettings.timerBonusSeconds : undefined,
  };
};

// Generate permanent hazard ground blocks covering the entire level width and 25 blocks deep
const generateGroundBlocks = (): Block[] => {
  const blocks: Block[] = [];
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

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { importLevel?: any; editLevel?: any; appliedTexturePack?: TexturePack; mode?: LevelMode } | null;
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const { createLevel, updateLevel } = useLevels();
  
  const [blocks, setBlocks] = useState<Block[]>(generateGroundBlocks());
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>('platform');
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [levelMode, setLevelMode] = useState<LevelMode>(routeState?.mode || 'race');
  const [cameraX, setCameraX] = useState(-100); // Start camera at left
  const [cameraY, setCameraY] = useState(0);
  const [showSongEditor, setShowSongEditor] = useState(false);
  const [levelName, setLevelName] = useState('My Level');
  const [hasBeenValidated, setHasBeenValidated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [linkingPivotId, setLinkingPivotId] = useState<string | null>(null);
  const [linkingTeleporterId, setLinkingTeleporterId] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [showMaxTimeDialog, setShowMaxTimeDialog] = useState(false);
  const [maxTime, setMaxTime] = useState<number>(60);
  const [trackUrl, setTrackUrl] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [blockSettings, setBlockSettings] = useState<BlockSettings>(DEFAULT_BLOCK_SETTINGS);
  const [customBlocks, setCustomBlocks] = useState<CustomBlockDefinition[]>([]);
  const [selectedCustomBlockId, setSelectedCustomBlockId] = useState<string | null>(null);
  const [blockStyle, setBlockStyle] = useState<'classic' | 'modern'>('modern');
  const [showGridSizeDialog, setShowGridSizeDialog] = useState(false);
  const [gridSize, setGridSize] = useState(32); // Grid size for level
  const [levelWidth, setLevelWidth] = useState(CANVAS_WIDTH * 5);
  const [levelHeight, setLevelHeight] = useState(CANVAS_HEIGHT * 3);
  const [texturePack, setTexturePack] = useState<TexturePack | null>(null);
  const [selectedPlacedBlockId, setSelectedPlacedBlockId] = useState<string | null>(null);
  const [editorTool, setEditorTool] = useState<'place' | 'edit'>('place');
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1600,
    height: typeof window !== 'undefined' ? window.innerHeight : 950,
  }));

  const importLevel = routeState?.importLevel;
  const editLevel = routeState?.editLevel;
  const appliedTexturePack = routeState?.appliedTexturePack;
  const parsedTrack = useMemo(() => parseLevelMusicLink(trackUrl), [trackUrl]);
  const hasSongDetails = useMemo(
    () => Boolean(trackUrl.trim() || trackTitle.trim() || trackArtist.trim()),
    [trackArtist, trackTitle, trackUrl],
  );
  const modeDescription = levelMode === 'survival'
    ? 'Stay alive for the target time. The publish target cannot exceed your best test survival.'
    : 'Reach the goal as fast as possible. Publish with a max allowed time.';
  const selectedCustomBlock = useMemo(
    () => (selectedCustomBlockId ? customBlocks.find((block) => block.id === selectedCustomBlockId) || null : null),
    [customBlocks, selectedCustomBlockId],
  );
  const editorCanvasWidth = useMemo(() => {
    const horizontalChrome = isPlaying ? 48 : viewportSize.width >= 1280 ? 600 : 96;
    return Math.max(960, viewportSize.width - horizontalChrome);
  }, [isPlaying, viewportSize.width]);
  const editorCanvasHeight = useMemo(() => {
    const verticalChrome = isPlaying ? 190 : showSongEditor ? 290 : 215;
    return Math.max(540, viewportSize.height - verticalChrome);
  }, [isPlaying, showSongEditor, viewportSize.height]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!importLevel && !editLevel) return;
    
    const levelToLoad = editLevel || importLevel;
    const importedBlocks = Array.isArray(levelToLoad.blocks) ? levelToLoad.blocks : [];
    setBlocks([...generateGroundBlocks(), ...importedBlocks]);
    
    if (editLevel) {
      // Editing existing level
      setLevelName(editLevel.name || 'Untitled Level');
      setHasBeenValidated(editLevel.validated || false);
      setLevelMode(editLevel.mode || 'race');
      setTrackUrl(editLevel.trackUrl || '');
      setTrackTitle(editLevel.trackTitle || '');
      setTrackArtist(editLevel.trackArtist || '');
      setCustomBlocks(Array.isArray(editLevel.customBlocks) ? editLevel.customBlocks : []);
      setMaxTime(editLevel.mode === 'survival' ? (editLevel.survival_time_seconds || 60) : (editLevel.max_time_seconds || 60));
      if (editLevel.texturePack) {
        setTexturePack(editLevel.texturePack);
      }
    } else {
      // Importing as copy
      setLevelName(importLevel.name ? `${importLevel.name} (Copy)` : 'Copied Level');
      setHasBeenValidated(false);
      setLevelMode(importLevel.mode || routeState?.mode || 'race');
      setTrackUrl(importLevel.trackUrl || '');
      setTrackTitle(importLevel.trackTitle || '');
      setTrackArtist(importLevel.trackArtist || '');
      setCustomBlocks(Array.isArray(importLevel.customBlocks) ? importLevel.customBlocks : []);
      setMaxTime(importLevel.mode === 'survival' ? (importLevel.survival_time_seconds || 60) : (importLevel.max_time_seconds || 60));
    }
  }, [importLevel, editLevel, routeState?.mode]);

  // Handle applied texture pack from BLOX Editor
  useEffect(() => {
    if (appliedTexturePack) {
      setTexturePack(appliedTexturePack);
      toast.success('Texture pack applied!');
    }
  }, [appliedTexturePack]);
  
  const { handleKeyDown: physicsKeyDown, handleKeyUp: physicsKeyUp, updatePlayer, resetCrumbleTimers, resetRotationAngles, getUpdatedBlockPositions } = useGamePhysics();
  const gameLoopRef = useRef<number>();
  const testStartTimeRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());

  const selectedPlacedBlock = useMemo(
    () => (selectedPlacedBlockId ? blocks.find((b) => b.id === selectedPlacedBlockId) || null : null),
    [blocks, selectedPlacedBlockId],
  );

  const handleSaveCustomBlock = useCallback((definition: CustomBlockDefinition) => {
    setCustomBlocks((prev) => {
      const existing = prev.find((entry) => entry.id === definition.id);
      if (existing) {
        return prev.map((entry) => (entry.id === definition.id ? { ...entry, ...definition } : entry));
      }
      return [...prev, definition];
    });
    setBlocks((prev) => prev.map((block) => {
      if (block.customBlockId !== definition.id) return block;
      return {
        ...block,
        ...buildBlockFieldOverrides('custom', { ...definition.settings, customBehaviorTypes: definition.behaviorTypes }, definition.id),
      };
    }));
    setSelectedCustomBlockId(definition.id);
    setSelectedBlock('custom');
    setBlockSettings({ ...definition.settings, customBehaviorTypes: definition.behaviorTypes });
  }, []);

  const handleDeleteCustomBlock = useCallback((customBlockId: string) => {
    setCustomBlocks((prev) => prev.filter((entry) => entry.id !== customBlockId));
    setBlocks((prev) => prev.filter((block) => block.customBlockId !== customBlockId));
    if (selectedCustomBlockId === customBlockId) {
      setSelectedCustomBlockId(null);
      setSelectedBlock('platform');
    }
    setHasBeenValidated(false);
  }, [selectedCustomBlockId]);

  useEffect(() => {
    if (!selectedCustomBlock) {
      return;
    }

    setBlockSettings({
      ...selectedCustomBlock.settings,
      customBehaviorTypes: selectedCustomBlock.behaviorTypes,
    });
  }, [selectedCustomBlock]);

  useEffect(() => {
    if (selectedBlock !== 'custom' || !selectedCustomBlockId) {
      return;
    }

    setCustomBlocks((prev) => prev.map((entry) => (
      entry.id === selectedCustomBlockId
        ? {
            ...entry,
            behaviorTypes: blockSettings.customBehaviorTypes,
            settings: { ...blockSettings },
            updatedAt: new Date().toISOString(),
          }
        : entry
    )));
  }, [blockSettings, selectedBlock, selectedCustomBlockId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle keyboard input during test play and ESC to exit testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) {
        return;
      }

      if (e.key === 'Escape') {
        stopPlay();
        return;
      }

      physicsKeyDown(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isPlaying) {
        return;
      }

      physicsKeyUp(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, physicsKeyDown, physicsKeyUp]);

  // Editor camera movement shortcuts when not playing.
  useEffect(() => {
    if (isPlaying) {
      return;
    }

    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      keysPressedRef.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current.delete(event.key.toLowerCase());
    };

    const moveCamera = () => {
      const speed = 16;
      let dx = 0;
      let dy = 0;

      if (keysPressedRef.current.has('w') || keysPressedRef.current.has('arrowup')) dy -= speed;
      if (keysPressedRef.current.has('s') || keysPressedRef.current.has('arrowdown')) dy += speed;
      if (keysPressedRef.current.has('a') || keysPressedRef.current.has('arrowleft')) dx -= speed;
      if (keysPressedRef.current.has('d') || keysPressedRef.current.has('arrowright')) dx += speed;

      if (dx !== 0 || dy !== 0) {
        setCameraX((prev) => Math.max(-LEVEL_WIDTH, Math.min(LEVEL_WIDTH, prev + dx)));
        setCameraY((prev) => Math.max(-1000, Math.min(1000, prev + dy)));
      }

      gameLoopRef.current = requestAnimationFrame(moveCamera);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gameLoopRef.current = requestAnimationFrame(moveCamera);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressedRef.current.clear();
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying]);

  // Find spawn and goal points
  const getSpawnPoint = useCallback((lastCheckpoint?: { x: number; y: number }) => {
    // Prioritize checkpoint if available
    if (lastCheckpoint) return lastCheckpoint;
    const spawn = blocks.find((block) => blockHasBehavior(block, 'spawn'));
    // Always start at left of the level
    return spawn ? { x: spawn.x, y: spawn.y - 32 } : { x: 64, y: GROUND_Y - 96 };
  }, [blocks]);

  const goalPosition = useMemo(() => {
    const goal = blocks.find((block) => blockHasBehavior(block, 'goal'));
    return goal ? { x: goal.x, y: goal.y } : null;
  }, [blocks]);

  const recordSurvivalValidation = useCallback((timeSeconds: number) => {
    if (timeSeconds <= 0) return;
    setCompletionTime((prev) => Math.max(prev || 0, timeSeconds));
    setHasBeenValidated(true);
    setMaxTime((prev) => {
      const fallback = Math.max(15, Math.floor(timeSeconds));
      return Math.min(fallback, prev > 0 ? Math.min(prev, fallback) : fallback);
    });
    toast.success(`Survival validated at ${timeSeconds}s. Publish target can be any time up to that run.`);
  }, []);

  // Start playing
  const startPlay = useCallback(() => {
    const spawnPoint = getSpawnPoint();
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
    });
    setIsPlaying(true);
    setCameraX(Math.max(-LEVEL_WIDTH, spawnPoint.x - CANVAS_WIDTH / 2));
    setCameraY(Math.max(-500, Math.min(500, spawnPoint.y - CANVAS_HEIGHT / 2)));
    testStartTimeRef.current = Date.now();
  }, [getSpawnPoint, profile?.avatar_color]);

  // Stop playing
  const stopPlay = useCallback(() => {
    if (isPlaying && levelMode === 'survival' && testStartTimeRef.current) {
      const timeSeconds = Math.max(1, Math.floor((Date.now() - testStartTimeRef.current) / 1000));
      recordSurvivalValidation(timeSeconds);
    }
    setIsPlaying(false);
    setPlayer(null);
    setCameraX(-100);
    setCameraY(0);
    resetCrumbleTimers();
    resetRotationAngles();
    
    // Reset crumbling blocks
    setBlocks(prev => prev.map(b => 
      b.type === 'crumbling' ? { ...b, crumbleState: 'solid' } : b
    ));
  }, [isPlaying, levelMode, recordSurvivalValidation, resetCrumbleTimers, resetRotationAngles]);

  // Update block (for crumbling)
  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  // Game loop for testing
  useEffect(() => {
    if (!isPlaying || !player) return;

    const gameLoop = () => {
      setPlayer(prev => {
        if (!prev) return null;
        const updated = updatePlayer(prev, blocks, CANVAS_HEIGHT, updateBlock, cameraY);
        
        // Update camera X to follow player
        const targetCameraX = Math.max(-LEVEL_WIDTH, updated.x - CANVAS_WIDTH / 3);
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * 0.1);
        
        // Update camera Y to follow player
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * 0.1);

        // Check win/death
        if (updated.hasWon && !prev.hasWon) {
          const timeSeconds = Math.floor((Date.now() - testStartTimeRef.current) / 1000);
          setCompletionTime(timeSeconds);
          setHasBeenValidated(true);
          setMaxTime(Math.min(MAX_LEVEL_TIME, Math.max(timeSeconds + 30, Math.ceil(timeSeconds * 1.5))));
          toast.success(`Level Complete in ${timeSeconds}s! You can now publish this level.`);
        }
        if (updated.isDead && !prev.isDead) {
          if (levelMode === 'survival') {
            const survivedSeconds = Math.max(1, Math.floor((Date.now() - testStartTimeRef.current) / 1000));
            recordSurvivalValidation(survivedSeconds);
            setTimeout(() => {
              setIsPlaying(false);
              setPlayer(null);
            }, 0);
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
          }, 500);
        }

        return updated;
      });
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying, player, blocks, updatePlayer, getSpawnPoint, updateBlock, profile?.avatar_color, cameraY, levelMode, recordSurvivalValidation]);

  // Overlap detection utility
  const blocksOverlap = useCallback((a: Block, b: Block): boolean => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }, []);

  // Place block
  const handlePlaceBlock = useCallback((x: number, y: number) => {
    if (!selectedBlock) return;

    if (selectedBlock === 'custom' && !selectedCustomBlock) {
      toast.error('Create or select a custom BLOX first.');
      return;
    }

    if (!isSpriteReadyBlock(selectedBlock)) {
      toast.error('That block is disabled until a custom sprite is added.');
      return;
    }

    // Snap to grid absolutely to prevent off-grid placement
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;

    // Don't place on ground level
    if (y >= GROUND_Y) {
      toast.error('Cannot place blocks on the hazard ground!');
      return;
    }

    // Check if linking to a rotating beam
    if (linkingPivotId && selectedBlock !== 'rotating_beam') {
      const newBlock: Block = {
        id: `block-${Date.now()}-${Math.random()}`,
        type: selectedBlock,
        x,
        y,
        width: GRID_SIZE,
        height: GRID_SIZE,
        pivotId: linkingPivotId,
        originalX: x,
        originalY: y,
        ...buildBlockFieldOverrides(selectedBlock, blockSettings, selectedCustomBlockId),
      };
      setBlocks(prev => [...prev, newBlock]);
      toast.success('Block linked to rotating beam!');
      setLinkingPivotId(null);
      setHasBeenValidated(false);
      return;
    }

    // Handle teleporter one-way linking
    if (selectedBlock === 'teleporter') {
      if (!linkingTeleporterId) {
        const newBlock: Block = {
          id: `tele-${Date.now()}-${Math.random()}`,
          type: 'teleporter',
          x,
          y,
          width: GRID_SIZE,
          height: GRID_SIZE,
        };
        setBlocks(prev => [...prev, newBlock]);
        setLinkingTeleporterId(newBlock.id);
        toast.info('Place the destination teleporter (one-way connection)');
        setHasBeenValidated(false);
        return;
      } else {
        // Create destination and link source to it
        const destBlock: Block = {
          id: `tele-${Date.now()}-${Math.random()}`,
          type: 'teleporter',
          x,
          y,
          width: GRID_SIZE,
          height: GRID_SIZE,
        };
        setBlocks(prev => prev.map(b => 
          b.id === linkingTeleporterId 
            ? { ...b, teleportTarget: destBlock.id }
            : b
        ).concat(destBlock));
        toast.success('One-way teleporter connected!');
        setLinkingTeleporterId(null);
        setHasBeenValidated(false);
        return;
      }
    }

    // Handle rotating beam - start linking mode
    if (selectedBlock === 'rotating_beam') {
      const speed = blockSettings.rotationSpeed * (blockSettings.rotationDirection === 'ccw' ? -1 : 1);
      const newBlock: Block = {
        id: `pivot-${Date.now()}-${Math.random()}`,
        type: 'rotating_beam',
        x,
        y,
        width: GRID_SIZE,
        height: GRID_SIZE,
        rotationSpeed: speed,
      };
      setBlocks(prev => [...prev, newBlock]);
      setLinkingPivotId(newBlock.id);
      toast.info('Now place blocks to attach to this rotating beam, or click elsewhere to cancel');
      setHasBeenValidated(false);
      return;
    }

    const pushShape = blockSettings.pushBlockShape;
    let blockWidth = GRID_SIZE;
    let blockHeight = GRID_SIZE;
    if (selectedBlock === 'push_block') {
      if (pushShape === 'rectangle_h') blockWidth = GRID_SIZE * 2;
      if (pushShape === 'rectangle_v') blockHeight = GRID_SIZE * 2;
    }

    // Build block with all applicable settings
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: selectedBlock,
      x,
      y,
      width: blockWidth,
      height: blockHeight,
      ...buildBlockFieldOverrides(selectedBlock, blockSettings, selectedCustomBlockId),
      originalX: selectedBlock === 'moving' ? x : undefined,
    };

    // Check for overlaps with existing blocks
    const hasOverlap = blocks.some(b => blocksOverlap(newBlock, b));
    if (hasOverlap) {
      toast.error('Cannot place block - it overlaps with an existing block!');
      return;
    }

    setBlocks(prev => [...prev, newBlock]);
    setHasBeenValidated(false);
  }, [selectedBlock, selectedCustomBlock, selectedCustomBlockId, linkingPivotId, linkingTeleporterId, blockSettings, blocks, blocksOverlap]);

  // Handle drag-to-draw for draggable blocks
  const handleDragPlace = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!selectedBlock) return;
    if (!['platform', 'ice', 'conveyor', 'hazard', 'crumbling', 'water', 'wind', 'phase_platform', 'pulse_hazard'].includes(selectedBlock)) return;
    if (!isSpriteReadyBlock(selectedBlock)) return;

    // Require minimum drag distance to prevent accidental block creation
    const dragDistance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    if (dragDistance < GRID_SIZE * 0.5) return; // Require at least half a grid cell drag

    // Snap all positions to grid
    const snappedStartX = Math.round(startX / GRID_SIZE) * GRID_SIZE;
    const snappedStartY = Math.round(startY / GRID_SIZE) * GRID_SIZE;
    const snappedEndX = Math.round(endX / GRID_SIZE) * GRID_SIZE;
    const snappedEndY = Math.round(endY / GRID_SIZE) * GRID_SIZE;

    const minX = Math.min(snappedStartX, snappedEndX);
    const maxX = Math.max(snappedStartX, snappedEndX);
    const minY = Math.min(snappedStartY, snappedEndY);
    const maxY = Math.max(snappedStartY, snappedEndY);

    const newBlocks: Block[] = [];
    
    for (let x = minX; x <= maxX; x += GRID_SIZE) {
      for (let y = minY; y <= maxY; y += GRID_SIZE) {
        if (y >= GROUND_Y) continue;
        
        // Check for any overlap with existing blocks
        const tempBlock = { x, y, width: GRID_SIZE, height: GRID_SIZE, id: 'temp', type: selectedBlock as BlockType };
        const overlap = blocks.some(b => !b.isLocked && blocksOverlap(tempBlock, b));
        if (overlap) continue;

        newBlocks.push({
          id: `block-${Date.now()}-${x}-${y}-${Math.random()}`,
          type: selectedBlock,
          x,
          y,
          width: GRID_SIZE,
          height: GRID_SIZE,
          ...buildBlockFieldOverrides(selectedBlock, blockSettings, selectedCustomBlockId),
        });
      }
    }

    if (newBlocks.length > 0) {
      setBlocks(prev => [...prev, ...newBlocks]);
      setHasBeenValidated(false);
    }
  }, [selectedBlock, selectedCustomBlockId, blocks, blockSettings]);

  // Remove block
  const handleRemoveBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block?.isLocked) return;
    
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedPlacedBlockId === id) {
      setSelectedPlacedBlockId(null);
    }
    setHasBeenValidated(false);
    
    if (id === linkingPivotId) {
      setLinkingPivotId(null);
    }
    if (id === linkingTeleporterId) {
      setLinkingTeleporterId(null);
    }
  }, [blocks, linkingPivotId, linkingTeleporterId, selectedPlacedBlockId]);

  const handleSelectExistingBlock = useCallback((id: string) => {
    setSelectedPlacedBlockId(id);
    setEditorTool('edit');
  }, []);

  const handleUpdateSelectedPlacedBlock = useCallback((updates: Partial<Block>) => {
    if (!selectedPlacedBlockId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedPlacedBlockId ? { ...b, ...updates } : b)));
    setHasBeenValidated(false);
  }, [selectedPlacedBlockId]);

  // Move block (Shift+drag)
  const handleMoveBlock = useCallback((id: string, newX: number, newY: number) => {
    // Don't place on ground level
    if (newY >= GROUND_Y) {
      toast.error('Cannot move blocks to the hazard ground!');
      return;
    }

    setBlocks(prev => prev.map(b => 
      b.id === id 
        ? { ...b, x: newX, y: newY }
        : b
    ));
    setHasBeenValidated(false);
  }, []);

  // Clear all blocks (except ground)
  const handleClear = () => {
    setBlocks(generateGroundBlocks());
    setHasBeenValidated(false);
    setLinkingPivotId(null);
    setLinkingTeleporterId(null);
    setCompletionTime(null);
    setTrackUrl('');
    setTrackTitle('');
    setTrackArtist('');
    toast.info('Level cleared');
  };

  // Open max time dialog before publishing
  const handlePrePublish = () => {
    if (!hasBeenValidated) {
      toast.error('You must complete the level before publishing!');
      return;
    }
    setShowMaxTimeDialog(true);
  };

  // Save/publish level
  const handlePublish = async () => {
    if (!hasBeenValidated) {
      toast.error(levelMode === 'survival' ? 'You must survive in a test run before publishing!' : 'You must complete the level before publishing!');
      return;
    }

    if (!user || !profile) {
      toast.error('You must be logged in to publish!');
      return;
    }

    const hasSpawn = blocks.some((block) => blockHasBehavior(block, 'spawn'));
    const hasGoal = blocks.some((block) => blockHasBehavior(block, 'goal'));

    if (!hasSpawn || (levelMode === 'race' && !hasGoal)) {
      toast.error(levelMode === 'survival' ? 'Survival levels need at least a spawn point!' : 'Level must have both a spawn point and a goal!');
      return;
    }

    if (maxTime > MAX_LEVEL_TIME) {
      toast.error(`Max time cannot exceed ${MAX_LEVEL_TIME} seconds!`);
      return;
    }

    if (levelMode === 'race' && completionTime && maxTime <= completionTime) {
      toast.error('Max time must be longer than your completion time!');
      return;
    }

    if (levelMode === 'survival' && completionTime && maxTime > completionTime) {
      toast.error('Survival target cannot be longer than your best validated survival run!');
      return;
    }

    if (trackUrl.trim() && !parsedTrack?.isSupported) {
      toast.error(parsedTrack?.error || 'Enter a Spotify, Apple Music, YouTube, or direct audio link.');
      return;
    }

    setIsPublishing(true);
    setShowMaxTimeDialog(false);
    
    try {
      const blocksToSave = blocks.filter(b => !b.isLocked);
      
      if (editLevel) {
        // Update existing level instead of creating a new one
        await updateLevel(editLevel.id, {
          name: levelName,
          blocks: blocksToSave,
          validated: true,
          allowImport: false,
          mode: levelMode,
          max_time_seconds: levelMode === 'race' ? maxTime : undefined,
          survival_time_seconds: levelMode === 'survival' ? maxTime : undefined,
          trackUrl: parsedTrack?.normalizedUrl || '',
          trackTitle: trackTitle.trim(),
          trackArtist: trackArtist.trim(),
          texturePack: texturePack || undefined,
          gridSize,
          customBlocks,
        });
        toast.success('Level updated!');
      } else {
        const created = await createLevel(
          levelName,
          user.id,
          profile.display_name,
          blocksToSave,
          true,
          maxTime,
          false,
          parsedTrack?.normalizedUrl || '',
          trackTitle.trim(),
          trackArtist.trim(),
          gridSize,
          texturePack || undefined,
          levelMode,
          levelMode === 'survival' ? maxTime : undefined,
          customBlocks,
        );
        
        try {
          await navigator.clipboard.writeText(created.id);
          toast.success('Level published! ID copied to clipboard.');
        } catch {
          toast.success(`Level published! ID: ${created.id}`);
        }
      }
      navigate('/browse');
    } catch (error) {
      console.error('Failed to publish:', error);
      const message = error instanceof Error ? error.message : 'Failed to publish level. Please try again.';
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Cancel linking mode
  const cancelLinking = () => {
    if (linkingPivotId) {
      setLinkingPivotId(null);
      toast.info('Pivot linking cancelled');
    }
    if (linkingTeleporterId) {
      setLinkingTeleporterId(null);
      toast.info('Teleporter linking cancelled');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-pixel text-primary text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="font-pixel text-2xl text-primary mb-4">Account Required</h1>
        <p className="font-pixel-body text-muted-foreground text-lg mb-6">
          Create your account with Google to create and publish levels.
        </p>
        <GameButton variant="primary" size="lg" onClick={() => navigate('/auth')}>
          <LogIn size={18} className="mr-2" />
          Create Account
        </GameButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-4 rounded-md border border-border bg-card/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>
          <input
            type="text"
            value={levelName}
            onChange={e => setLevelName(e.target.value)}
            className="min-w-[220px] bg-input border-2 border-border px-3 py-2 font-pixel text-[10px] text-foreground focus:border-primary outline-none"
            placeholder="Level name..."
          />
          {!isPlaying && (
            <div className="flex h-[46px] min-w-[180px] items-center border border-border bg-background/40 px-3">
              <div className="min-w-0">
                <div className="font-pixel text-[8px] text-primary">Level Mode</div>
                <div className="mt-1 truncate font-pixel text-[10px] text-foreground capitalize">{levelMode}</div>
              </div>
            </div>
          )}
          {!isPlaying && (
            <div className="flex h-[46px] min-w-[220px] items-center gap-2 border border-border bg-background/40 px-3">
              <Music4 size={14} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="font-pixel text-[8px] text-primary">Level Song</div>
                <div className="mt-1 truncate font-pixel-body text-[10px] text-foreground">
                  {hasSongDetails ? (trackTitle.trim() || trackArtist.trim() || parsedTrack?.providerLabel || 'Song selected') : 'No song selected'}
                </div>
              </div>
              {parsedTrack?.isSupported && parsedTrack.normalizedUrl && (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 border border-border px-2 py-1 font-pixel text-[9px] text-primary hover:bg-muted/40"
                  onClick={() => window.open(parsedTrack.normalizedUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={11} />
                  Open
                </button>
              )}
              <GameButton
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setShowSongEditor((prev) => !prev)}
              >
                {hasSongDetails ? 'Edit' : 'Set'}
              </GameButton>
            </div>
          )}
          {linkingPivotId && (
            <div className="flex items-center gap-2">
              <span className="bg-game-beam/20 text-game-beam font-pixel text-[8px] px-2 py-1">
                <Link size={12} className="inline mr-1" />
                Linking to pivot...
              </span>
              <GameButton variant="ghost" size="sm" onClick={cancelLinking}>
                Cancel
              </GameButton>
            </div>
          )}
          {linkingTeleporterId && (
            <div className="flex items-center gap-2">
              <span className="bg-game-teleporter/20 text-game-teleporter font-pixel text-[8px] px-2 py-1">
                <Link size={12} className="inline mr-1" />
                Place destination...
              </span>
              <GameButton variant="ghost" size="sm" onClick={cancelLinking}>
                Cancel
              </GameButton>
            </div>
          )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
          {hasBeenValidated && (
            <span className="bg-success/20 text-success font-pixel text-[8px] px-3 py-1 mr-2">
              ✓ VALIDATED ({completionTime}s)
            </span>
          )}
          {isPlaying ? (
            <GameButton variant="destructive" size="sm" onClick={stopPlay}>
              <Square size={14} className="mr-2" />
              Stop (ESC)
            </GameButton>
          ) : (
            <GameButton variant="success" size="sm" onClick={startPlay}>
              <Play size={14} className="mr-2" />
              Test
            </GameButton>
          )}
          <div className="px-3 py-1 border border-border bg-card/70 rounded">
            <span className="font-pixel text-[9px] text-center">100%</span>
          </div>
          <GameButton variant="outline" size="sm" onClick={handleClear}>
            <Trash2 size={14} className="mr-2" />
            Clear
          </GameButton>
          <GameButton 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/blox-editor', { state: { levelId: 'temp_editor' } })}
          >
            <Palette size={14} className="mr-2" />
            BLOX Editor
          </GameButton>
          <GameButton 
            variant="accent" 
            size="sm" 
            onClick={handlePrePublish}
            disabled={!hasBeenValidated || isPublishing}
          >
            <Save size={14} className="mr-2" />
            {isPublishing ? (editLevel ? 'Updating...' : 'Publishing...') : (editLevel ? 'Update' : 'Publish')}
          </GameButton>
        </div>

        {!isPlaying && showSongEditor && (
          <div className="mt-3 border border-border bg-background/40 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-pixel text-[10px] text-primary">Level Song</div>
                <div className="mt-1 font-pixel-body text-xs text-muted-foreground">Spotify, Apple Music, YouTube, and direct audio links are supported.</div>
              </div>
              {levelMode === 'survival' && completionTime ? (
                <div className="font-pixel text-[9px] text-accent">Best survival: {completionTime}s</div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <input
                      type="text"
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      className="w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-xs text-foreground focus:border-primary outline-none"
                      placeholder="Song title"
                    />
                    <input
                      type="text"
                      value={trackArtist}
                      onChange={(e) => setTrackArtist(e.target.value)}
                      className="w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-xs text-foreground focus:border-primary outline-none"
                      placeholder="Artist / creator"
                    />
            </div>

            <input
              type="url"
              value={trackUrl}
              onChange={(e) => setTrackUrl(e.target.value)}
              className="mt-3 w-full bg-input border-2 border-border px-3 py-2 font-pixel-body text-xs text-foreground focus:border-primary outline-none"
              placeholder="https://open.spotify.com/track/..."
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-pixel-body text-xs text-muted-foreground">
                {trackUrl.trim() && parsedTrack
                  ? parsedTrack.isSupported
                    ? `${parsedTrack.providerLabel}: ${parsedTrack.helperText}`
                    : parsedTrack.helperText
                  : modeDescription}
              </div>

              {hasSongDetails && (
                <GameButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTrackUrl('');
                    setTrackTitle('');
                    setTrackArtist('');
                  }}
                >
                  Clear Song
                </GameButton>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Editor area with 3-column layout */}
      <div className="flex gap-4">
        {/* Block palette on left */}
        {!isPlaying && (
          <BlockPalette 
            selectedBlock={selectedBlock} 
            selectedCustomBlockId={selectedCustomBlockId}
            onSelectBlock={(block) => {
              setSelectedPlacedBlockId(null);
              setSelectedBlock(block);
              setEditorTool('place');
            }}
            onSelectCustomBlock={(customBlockId) => {
              const definition = customBlocks.find((entry) => entry.id === customBlockId);
              setSelectedPlacedBlockId(null);
              setSelectedBlock('custom');
              setSelectedCustomBlockId(customBlockId);
              setEditorTool('place');
              if (definition) {
                setBlockSettings({ ...definition.settings, customBehaviorTypes: definition.behaviorTypes });
              }
            }}
            onSaveCustomBlock={handleSaveCustomBlock}
            onDeleteCustomBlock={handleDeleteCustomBlock}
            blockSettings={blockSettings}
            onSettingsChange={setBlockSettings}
            texturePack={texturePack || undefined}
            customBlocks={customBlocks}
          />
        )}

        {/* Canvas area in center */}
        <div className="flex-1">
          {!isPlaying && (
            <div className="mb-2 text-center font-pixel-body text-xs text-muted-foreground">
              BLOX Settings are on the right panel (or below on smaller screens).
            </div>
          )}
          <div className="relative">
            <GameCanvas
              blocks={blocks}
              players={player ? [player] : []}
              isEditing={!isPlaying}
              selectedBlock={selectedBlock}
              toolMode={editorTool}
              onPlaceBlock={handlePlaceBlock}
              onRemoveBlock={handleRemoveBlock}
              onSelectExistingBlock={handleSelectExistingBlock}
              onMoveBlock={handleMoveBlock}
              cameraX={cameraX}
              cameraY={cameraY}
              getUpdatedBlockPositions={getUpdatedBlockPositions}
              onDragPlace={handleDragPlace}
              goalPosition={goalPosition}
              texturePack={texturePack || undefined}
              customBlocks={customBlocks}
              scale={EDITOR_SCALE}
              canvasWidth={editorCanvasWidth}
              canvasHeight={editorCanvasHeight}
            />
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center font-pixel-body text-muted-foreground">
            {!isPlaying && (
              <div className="mb-3 inline-flex gap-2">
                <GameButton
                  size="sm"
                  variant={editorTool === 'place' ? 'primary' : 'outline'}
                  onClick={() => {
                    setSelectedPlacedBlockId(null);
                    setEditorTool('place');
                  }}
                >
                  <Brush size={12} className="mr-1" />
                  Place Tool
                </GameButton>
                <GameButton
                  size="sm"
                  variant={editorTool === 'edit' ? 'primary' : 'outline'}
                  onClick={() => setEditorTool('edit')}
                >
                  <Edit3 size={12} className="mr-1" />
                  Edit Tool
                </GameButton>
              </div>
            )}
          </div>

          {/* Block settings panel for smaller screens */}
          {!isPlaying && (
            <div className="mt-4 xl:hidden">
              <BlockSettingsPanel
                selectedBlock={selectedBlock}
                blockSettings={blockSettings}
                onSettingsChange={setBlockSettings}
                selectedPlacedBlock={selectedPlacedBlock}
                onUpdateSelectedBlock={handleUpdateSelectedPlacedBlock}
                activeMode={editorTool}
              />
            </div>
          )}
        </div>

        {/* Block settings panel on right */}
        {!isPlaying && (
          <div className="hidden xl:block">
            <BlockSettingsPanel
              selectedBlock={selectedBlock}
              blockSettings={blockSettings}
              onSettingsChange={setBlockSettings}
              selectedPlacedBlock={selectedPlacedBlock}
              onUpdateSelectedBlock={handleUpdateSelectedPlacedBlock}
              activeMode={editorTool}
            />
          </div>
        )}
      </div>

      {/* Max Time Dialog */}
      {showMaxTimeDialog && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card pixel-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-pixel text-sm text-primary mb-4">Level Settings</h2>
            
            {/* Maximum Time Section */}
            <div className="mb-6">
              <h3 className="font-pixel text-xs text-accent mb-3">{levelMode === 'survival' ? 'Survival Target' : 'Maximum Time'}</h3>
              <p className="font-pixel-body text-muted-foreground text-xs mb-3">
                {levelMode === 'survival'
                  ? <>Your best survival run: <span className="text-success">{formatTime(completionTime || 0)}</span></>
                  : <>Your completion time: <span className="text-success">{formatTime(completionTime || 0)}</span></>}
              </p>
              
              <div className="flex items-center gap-4">
                <Clock size={20} className="text-accent" />
                <input
                  type="number"
                  value={maxTime}
                  onChange={e => setMaxTime(Math.min(MAX_LEVEL_TIME, Math.max(levelMode === 'survival' ? 1 : (completionTime || 0) + 1, parseInt(e.target.value) || 0)))}
                  min={levelMode === 'survival' ? 1 : (completionTime || 0) + 1}
                  max={levelMode === 'survival' ? (completionTime || MAX_LEVEL_TIME) : MAX_LEVEL_TIME}
                  className="bg-input border-2 border-border px-3 py-2 font-pixel text-[10px] text-foreground focus:border-primary outline-none w-24"
                />
                <span className="font-pixel-body text-muted-foreground text-xs">seconds ({formatTime(maxTime)})</span>
              </div>
            </div>

            <div className="flex gap-3">
              <GameButton variant="outline" className="flex-1" onClick={() => setShowMaxTimeDialog(false)}>
                Cancel
              </GameButton>
              <GameButton variant="primary" className="flex-1" onClick={handlePublish}>
                Publish
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {/* Grid Size Dialog */}
      <GridSizeDialog
        open={showGridSizeDialog}
        onOpenChange={setShowGridSizeDialog}
        onConfirm={(width, height) => {
          setLevelWidth(width);
          setLevelHeight(height);
          toast.success(`Grid updated to ${Math.round(width / GRID_SIZE)}×${Math.round(height / GRID_SIZE)} blocks`);
        }}
        defaultWidth={levelWidth}
        defaultHeight={levelHeight}
      />
    </div>
  );
}