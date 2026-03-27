import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Block, BlockType, Player, BlockSettings, DEFAULT_BLOCK_SETTINGS, TexturePack } from '@/types/game';
import { GameCanvas } from '@/components/game/GameCanvas';
import { BlockPalette } from '@/components/game/BlockPalette';
import { BlockSettingsPanel } from '@/components/game/BlockSettingsPanel';
import { GridSizeDialog } from '@/components/game/GridSizeDialog';
import { GameButton } from '@/components/ui/GameButton';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useAuth } from '@/hooks/useAuth';
import { useLevels } from '@/hooks/useLevels';
import { ArrowLeft, Play, Square, Save, Trash2, LogIn, Link, Clock, Grid3x3, Palette } from 'lucide-react';
import { toast } from 'sonner';

const GRID_SIZE = 32;
const CANVAS_WIDTH = 1920; // Increased from 1440
const CANVAS_HEIGHT = 1080; // Increased from 720
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 50; // Increased from 25 (50 blocks deep of lava)
const LEVEL_WIDTH = CANVAS_WIDTH * 8; // Increased from * 5
const MAX_LEVEL_TIME = 300; // 5 minutes max

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
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const { createLevel } = useLevels();
  
  const [blocks, setBlocks] = useState<Block[]>(generateGroundBlocks());
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>('platform');
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [cameraX, setCameraX] = useState(-100); // Start camera at left
  const [cameraY, setCameraY] = useState(0);
  const [cameraSpeed, setCameraSpeed] = useState(0.1); // Adjustable camera panning speed
  const [levelName, setLevelName] = useState('My Level');
  const [hasBeenValidated, setHasBeenValidated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [linkingPivotId, setLinkingPivotId] = useState<string | null>(null);
  const [linkingTeleporterId, setLinkingTeleporterId] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [showMaxTimeDialog, setShowMaxTimeDialog] = useState(false);
  const [maxTime, setMaxTime] = useState<number>(60);
  const [allowImport, setAllowImport] = useState(false);
  const [trackUrl, setTrackUrl] = useState('');
  const [blockSettings, setBlockSettings] = useState<BlockSettings>(DEFAULT_BLOCK_SETTINGS);
  const [blockStyle, setBlockStyle] = useState<'classic' | 'modern'>('modern');
  const [showGridSizeDialog, setShowGridSizeDialog] = useState(false);
  const [gridSize, setGridSize] = useState(32); // Grid size for level
  const [levelWidth, setLevelWidth] = useState(CANVAS_WIDTH * 5);
  const [levelHeight, setLevelHeight] = useState(CANVAS_HEIGHT * 3);
  const [texturePack, setTexturePack] = useState<TexturePack | null>(null);

  const importLevel = (location.state as { importLevel?: any; editLevel?: any; appliedTexturePack?: TexturePack } | null)?.importLevel;
  const editLevel = (location.state as { importLevel?: any; editLevel?: any; appliedTexturePack?: TexturePack } | null)?.editLevel;
  const appliedTexturePack = (location.state as { appliedTexturePack?: TexturePack } | null)?.appliedTexturePack;

  useEffect(() => {
    if (!importLevel && !editLevel) return;
    
    const levelToLoad = editLevel || importLevel;
    const importedBlocks = Array.isArray(levelToLoad.blocks) ? levelToLoad.blocks : [];
    setBlocks([...generateGroundBlocks(), ...importedBlocks]);
    
    if (editLevel) {
      // Editing existing level
      setLevelName(editLevel.name || 'Untitled Level');
      setAllowImport(editLevel.allowImport || false);
      setHasBeenValidated(editLevel.validated || false);
      if (editLevel.texturePack) {
        setTexturePack(editLevel.texturePack);
      }
    } else {
      // Importing as copy
      setLevelName(importLevel.name ? `${importLevel.name} (Copy)` : 'Copied Level');
      setAllowImport(false);
      setHasBeenValidated(false);
    }
  }, [importLevel, editLevel]);

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
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle keyboard for editor camera movement (WASD/Arrows) and ESC to exit testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) {
        // Only ESC exits testing
        if (e.key === 'Escape') {
          stopPlay();
          return;
        }
        // Pass other keys to physics
        physicsKeyDown(e);
      } else {
        // Editor mode - WASD/Arrows move camera
        keysPressed.current.add(e.key.toLowerCase());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isPlaying) {
        physicsKeyUp(e);
      } else {
        keysPressed.current.delete(e.key.toLowerCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Track mouse position for edge panning
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPlaying, physicsKeyDown, physicsKeyUp]);

  // Editor camera movement loop
  useEffect(() => {
    if (isPlaying) return;

    const moveCamera = () => {
      const speed = 10;
      const edgePanSpeed = 8;
      const edgeThreshold = 50; // pixels from edge
      let dx = 0, dy = 0;

      // Keyboard controls
      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy = -speed;
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy = speed;
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx = -speed;
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx = speed;

      // Mouse edge panning
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        const canvas = canvases[0] as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const mouseX = mousePosRef.current.x;
        const mouseY = mousePosRef.current.y;

        // Check if mouse is within canvas bounds
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          // Horizontal edge panning
          if (mouseX - rect.left < edgeThreshold) {
            dx = -edgePanSpeed;
          } else if (rect.right - mouseX < edgeThreshold) {
            dx = edgePanSpeed;
          }

          // Vertical edge panning
          if (mouseY - rect.top < edgeThreshold) {
            dy = -edgePanSpeed;
          } else if (rect.bottom - mouseY < edgeThreshold) {
            dy = edgePanSpeed;
          }
        }
      }

      if (dx !== 0 || dy !== 0) {
        setCameraX(prev => Math.max(-LEVEL_WIDTH, Math.min(LEVEL_WIDTH, prev + dx)));
        setCameraY(prev => Math.max(-1000, Math.min(500, prev + dy)));
      }

      requestAnimationFrame(moveCamera);
    };

    const animId = requestAnimationFrame(moveCamera);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Find spawn and goal points
  const getSpawnPoint = useCallback((lastCheckpoint?: { x: number; y: number }) => {
    // Prioritize checkpoint if available
    if (lastCheckpoint) return lastCheckpoint;
    const spawn = blocks.find(b => b.type === 'spawn');
    // Always start at left of the level
    return spawn ? { x: spawn.x, y: spawn.y - 32 } : { x: 64, y: GROUND_Y - 96 };
  }, [blocks]);

  const goalPosition = useMemo(() => {
    const goal = blocks.find(b => b.type === 'goal');
    return goal ? { x: goal.x, y: goal.y } : null;
  }, [blocks]);

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
  }, [resetCrumbleTimers, resetRotationAngles]);

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
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * cameraSpeed);
        
        // Update camera Y to follow player
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * cameraSpeed);

        // Check win/death
        if (updated.hasWon && !prev.hasWon) {
          const timeSeconds = Math.floor((Date.now() - testStartTimeRef.current) / 1000);
          setCompletionTime(timeSeconds);
          setHasBeenValidated(true);
          setMaxTime(Math.min(MAX_LEVEL_TIME, Math.max(timeSeconds + 30, Math.ceil(timeSeconds * 1.5))));
          toast.success(`Level Complete in ${timeSeconds}s! You can now publish this level.`);
        }
        if (updated.isDead && !prev.isDead) {
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
  }, [isPlaying, player, blocks, updatePlayer, getSpawnPoint, updateBlock, profile?.avatar_color, cameraY]);

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
        direction: selectedBlock === 'conveyor' ? blockSettings.conveyorDirection :
                   selectedBlock === 'ramp' ? blockSettings.rampDirection : undefined,
        moveSpeed: selectedBlock === 'conveyor' ? blockSettings.conveyorSpeed : 
                   selectedBlock === 'moving' ? blockSettings.moveSpeed : undefined,
        moveRange: selectedBlock === 'moving' ? blockSettings.moveRange : undefined,
        crumbleState: selectedBlock === 'crumbling' ? 'solid' : undefined,
        crumbleTime: selectedBlock === 'crumbling' ? blockSettings.crumbleTime : undefined,
        resetTime: selectedBlock === 'crumbling' ? blockSettings.resetTime : undefined,
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
      // Conveyor
      direction: selectedBlock === 'conveyor' ? blockSettings.conveyorDirection :
                 selectedBlock === 'ramp' ? blockSettings.rampDirection : undefined,
      // Speed settings
      moveSpeed: selectedBlock === 'conveyor' ? blockSettings.conveyorSpeed : 
                 selectedBlock === 'moving' ? blockSettings.moveSpeed : undefined,
      moveRange: selectedBlock === 'moving' ? blockSettings.moveRange : undefined,
      originalX: selectedBlock === 'moving' ? x : undefined,
      // Crumbling
      crumbleState: selectedBlock === 'crumbling' ? 'solid' : undefined,
      crumbleTime: selectedBlock === 'crumbling' ? blockSettings.crumbleTime : undefined,
      resetTime: selectedBlock === 'crumbling' ? blockSettings.resetTime : undefined,
      // Spawn ghost mode
      isGhost: selectedBlock === 'spawn' ? blockSettings.spawnIsGhost : undefined,
      // Low gravity
      gravityMultiplier: selectedBlock === 'low_gravity' ? blockSettings.gravityMultiplier : undefined,
      // Tentacle
      tentacleRadius: selectedBlock === 'tentacle' ? blockSettings.tentacleRadius : undefined,
      tentacleForce: selectedBlock === 'tentacle' ? blockSettings.tentacleForce : undefined,
      // Speed gate
      speedMultiplier: selectedBlock === 'speed_gate' ? blockSettings.speedMultiplier : undefined,
      speedDuration: selectedBlock === 'speed_gate' ? blockSettings.speedDuration : undefined,
      // Ramp
      rampDirection: selectedBlock === 'ramp' ? blockSettings.rampDirection : undefined,
      rampColor: selectedBlock === 'ramp' ? blockSettings.rampColor : undefined,
      platformColor: selectedBlock === 'platform' ? blockSettings.platformColor : undefined,
      // Push block
      pushBlockShape: selectedBlock === 'push_block' ? blockSettings.pushBlockShape : undefined,
      pushBlockWeight: selectedBlock === 'push_block' ? blockSettings.pushBlockWeight : undefined,
      // Cannon
      cannonAngle: selectedBlock === 'cannon' ? blockSettings.cannonAngle : undefined,
      cannonArc: selectedBlock === 'cannon' ? blockSettings.cannonArc : undefined,
      cannonInterval: selectedBlock === 'cannon' ? blockSettings.cannonInterval : undefined,
      // Wind
      windForce: selectedBlock === 'wind' ? blockSettings.windForce : undefined,
      windDirection: selectedBlock === 'wind' ? blockSettings.windDirection : undefined,
      // Water
      waterDensity: selectedBlock === 'water' ? blockSettings.waterDensity : undefined,
      // Ice ramp
      isSlopeIce: selectedBlock === 'ice' && blockSettings.iceSlope !== undefined ? true : undefined,
      iceSlope: selectedBlock === 'ice' ? blockSettings.iceSlope : undefined,
    };

    // Check for overlaps with existing blocks
    const hasOverlap = blocks.some(b => blocksOverlap(newBlock, b));
    if (hasOverlap) {
      toast.error('Cannot place block - it overlaps with an existing block!');
      return;
    }

    setBlocks(prev => [...prev, newBlock]);
    setHasBeenValidated(false);
  }, [selectedBlock, linkingPivotId, linkingTeleporterId, blockSettings, blocks, blocksOverlap]);

  // Handle drag-to-draw for draggable blocks
  const handleDragPlace = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!selectedBlock) return;
    if (!['platform', 'ice', 'conveyor', 'hazard', 'crumbling', 'water', 'wind'].includes(selectedBlock)) return;

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
          platformColor: selectedBlock === 'platform' ? blockSettings.platformColor : undefined,
          direction: selectedBlock === 'conveyor' ? blockSettings.conveyorDirection :
                     selectedBlock === 'wind' ? blockSettings.windDirection : undefined,
          moveSpeed: selectedBlock === 'conveyor' ? blockSettings.conveyorSpeed : undefined,
          crumbleState: selectedBlock === 'crumbling' ? 'solid' : undefined,
          crumbleTime: selectedBlock === 'crumbling' ? blockSettings.crumbleTime : undefined,
          resetTime: selectedBlock === 'crumbling' ? blockSettings.resetTime : undefined,
          waterDensity: selectedBlock === 'water' ? blockSettings.waterDensity : undefined,
          windForce: selectedBlock === 'wind' ? blockSettings.windForce : undefined,
          windDirection: selectedBlock === 'wind' ? blockSettings.windDirection : undefined,
        });
      }
    }

    if (newBlocks.length > 0) {
      setBlocks(prev => [...prev, ...newBlocks]);
      setHasBeenValidated(false);
    }
  }, [selectedBlock, blocks, blockSettings]);

  // Remove block
  const handleRemoveBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block?.isLocked) return;
    
    setBlocks(prev => prev.filter(b => b.id !== id));
    setHasBeenValidated(false);
    
    if (id === linkingPivotId) {
      setLinkingPivotId(null);
    }
    if (id === linkingTeleporterId) {
      setLinkingTeleporterId(null);
    }
  }, [blocks, linkingPivotId, linkingTeleporterId]);

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
      toast.error('You must complete the level before publishing!');
      return;
    }

    if (!user || !profile) {
      toast.error('You must be logged in to publish!');
      return;
    }

    const hasSpawn = blocks.some(b => b.type === 'spawn');
    const hasGoal = blocks.some(b => b.type === 'goal');

    if (!hasSpawn || !hasGoal) {
      toast.error('Level must have both a spawn point and a goal!');
      return;
    }

    if (completionTime && maxTime <= completionTime) {
      toast.error('Max time must be longer than your completion time!');
      return;
    }

    if (maxTime > MAX_LEVEL_TIME) {
      toast.error(`Max time cannot exceed ${MAX_LEVEL_TIME} seconds!`);
      return;
    }

    setIsPublishing(true);
    setShowMaxTimeDialog(false);
    
    try {
      const blocksToSave = blocks.filter(b => !b.isLocked);
      
      const created = await createLevel(
        levelName,
        user.id,
        profile.display_name,
        blocksToSave,
        true,
        maxTime,
        allowImport,
        trackUrl,
        gridSize
      );
      
      try {
        await navigator.clipboard.writeText(created.id);
        toast.success('Level published! ID copied to clipboard.');
      } catch {
        toast.success(`Level published! ID: ${created.id}`);
      }
      navigate('/browse');
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Failed to publish level. Please try again.');
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
        <h1 className="font-pixel text-2xl text-primary mb-4">Sign In Required</h1>
        <p className="font-pixel-body text-muted-foreground text-lg mb-6">
          You need to sign in to create and publish levels.
        </p>
        <GameButton variant="primary" size="lg" onClick={() => navigate('/auth')}>
          <LogIn size={18} className="mr-2" />
          Sign In
        </GameButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>
          <input
            type="text"
            value={levelName}
            onChange={e => setLevelName(e.target.value)}
            className="bg-input border-2 border-border px-3 py-2 font-pixel text-[10px] text-foreground focus:border-primary outline-none"
            placeholder="Level name..."
          />



          <button
            onClick={() => setAllowImport(!allowImport)}
            className={`flex items-center gap-1 px-2 py-1 border transition-colors ${
              allowImport ? 'bg-primary/20 border-primary' : 'bg-muted/50 border-border'
            }`}
            title="Allow others to copy this level"
          >
            <span className="font-pixel text-[8px]">{allowImport ? '✓' : '○'} ALLOW COPYING</span>
          </button>
          
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
        
        <div className="flex items-center gap-2">
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

          {/* Camera Speed Control */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded">
            <span className="font-pixel text-[8px] whitespace-nowrap">Pan Speed</span>
            <input 
              type="range" 
              min="0.01" 
              max="0.3" 
              step="0.01" 
              value={cameraSpeed}
              onChange={(e) => setCameraSpeed(parseFloat(e.target.value))}
              className="w-24 h-1"
              title={`Camera pan speed: ${(cameraSpeed * 100).toFixed(0)}%`}
            />
            <span className="font-pixel text-[7px] text-muted-foreground w-8">{(cameraSpeed * 100).toFixed(0)}%</span>
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
            {isPublishing ? 'Publishing...' : 'Publish'}
          </GameButton>
        </div>
      </div>

      {/* Editor area with 3-column layout */}
      <div className="flex gap-4">
        {/* Block palette on left */}
        {!isPlaying && (
          <BlockPalette 
            selectedBlock={selectedBlock} 
            onSelectBlock={setSelectedBlock}
            blockSettings={blockSettings}
            onSettingsChange={setBlockSettings}
            texturePack={texturePack || undefined}
          />
        )}

        {/* Canvas area in center */}
        <div className="flex-1">
          <div className="relative">
            <GameCanvas
              blocks={blocks}
              players={player ? [player] : []}
              isEditing={!isPlaying}
              selectedBlock={selectedBlock}
              onPlaceBlock={handlePlaceBlock}
              onRemoveBlock={handleRemoveBlock}
              onMoveBlock={handleMoveBlock}
              cameraX={cameraX}
              cameraY={cameraY}
              getUpdatedBlockPositions={getUpdatedBlockPositions}
              onDragPlace={handleDragPlace}
              goalPosition={goalPosition}
              texturePack={texturePack || undefined}
            />
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center font-pixel-body text-muted-foreground">
            {isPlaying ? (
              <p className="text-lg">
                <span className="text-primary">WASD</span> or <span className="text-primary">Arrow Keys</span> to move • <span className="text-primary">Space</span> to jump • <span className="text-primary">ESC</span> to exit
              </p>
            ) : (
              <p className="text-lg">
                <span className="text-primary">WASD</span> or <span className="text-primary">Arrow Keys</span> to move camera • <span className="text-primary">Click</span>/<span className="text-primary">Drag</span> to place • <span className="text-primary">Shift+Drag</span> to move • <span className="text-primary">Right-click</span> to remove
              </p>
            )}
          </div>
        </div>

        {/* Block settings panel on right */}
        {!isPlaying && (
          <BlockSettingsPanel
            selectedBlock={selectedBlock}
            blockSettings={blockSettings}
            onSettingsChange={setBlockSettings}
          />
        )}
      </div>

      {/* Max Time Dialog */}
      {showMaxTimeDialog && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card pixel-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-pixel text-sm text-primary mb-4">Level Settings</h2>
            
            {/* Maximum Time Section */}
            <div className="mb-6">
              <h3 className="font-pixel text-xs text-accent mb-3">Maximum Time</h3>
              <p className="font-pixel-body text-muted-foreground text-xs mb-3">
                Your completion time: <span className="text-success">{formatTime(completionTime || 0)}</span>
              </p>
              
              <div className="flex items-center gap-4">
                <Clock size={20} className="text-accent" />
                <input
                  type="number"
                  value={maxTime}
                  onChange={e => setMaxTime(Math.min(MAX_LEVEL_TIME, Math.max((completionTime || 0) + 1, parseInt(e.target.value) || 0)))}
                  min={(completionTime || 0) + 1}
                  max={MAX_LEVEL_TIME}
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