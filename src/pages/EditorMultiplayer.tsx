import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Block, BlockType, Player, BlockSettings, DEFAULT_BLOCK_SETTINGS } from '@/types/game';
import { GameCanvas } from '@/components/game/GameCanvas';
import { BlockPalette } from '@/components/game/BlockPalette';
import { BlockSettingsPanel } from '@/components/game/BlockSettingsPanel';
import { GridSizeDialog } from '@/components/game/GridSizeDialog';
import { GameButton } from '@/components/ui/GameButton';
import { useGamePhysics } from '@/hooks/useGamePhysics';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Play, Square, Save, Trash2, Users, LogOut, Copy, Check, Grid3x3 } from 'lucide-react';
import { toast } from '@/lib/announcer';

const GRID_SIZE = 32;
const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 720;
const GROUND_Y = CANVAS_HEIGHT - GRID_SIZE;
const GROUND_DEPTH = 25;
const LEVEL_WIDTH = CANVAS_WIDTH * 5;
const MAX_LEVEL_TIME = 300;

const ARCHITECT_COLORS = [
  '#26c6da', '#e53935', '#43a047', '#ffb300'
];

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

interface Architect {
  id: string;
  user_id: string;
  display_name: string;
  avatar_color: string;
}

export default function EditorMultiplayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = location.state?.sessionId as string | undefined;
  const roomCode = location.state?.roomCode as string | undefined;
  const levelName = location.state?.levelName as string | undefined;
  const initialBlocks = location.state?.blocks as Block[] | undefined;
  const architects = location.state?.architects as Architect[] | undefined;
  const isHost = location.state?.isHost as boolean | undefined;

  const { user, profile } = useAuth();

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks || generateGroundBlocks());
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>('platform');
  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [cameraX, setCameraX] = useState(-100);
  const [cameraY, setCameraY] = useState(0);
  const [levelNameState, setLevelNameState] = useState(levelName || 'Collaborative Level');
  const [blockSettings, setBlockSettings] = useState<BlockSettings>(DEFAULT_BLOCK_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [showGridSizeDialog, setShowGridSizeDialog] = useState(false);
  const [levelWidth, setLevelWidth] = useState(CANVAS_WIDTH * 5);
  const [levelHeight, setLevelHeight] = useState(CANVAS_HEIGHT * 3);

  const { handleKeyDown: physicsKeyDown, handleKeyUp: physicsKeyUp, updatePlayer, resetCrumbleTimers, resetRotationAngles, getUpdatedBlockPositions } = useGamePhysics();
  const gameLoopRef = useRef<number>();
  const testStartTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!sessionId) {
      navigate('/editor');
    }
  }, [sessionId, navigate]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) {
        if (e.key === 'Escape') {
          stopPlay();
          return;
        }
        physicsKeyDown(e);
      } else {
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

      // Mouse edge panning (only if not actively dragging)
      if (document.activeElement?.tagName !== 'CANVAS' || !document.querySelector('canvas')) {
        // Pan based on mouse position if near edges
      } else {
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

  const getSpawnPoint = useCallback(() => {
    const spawn = blocks.find(b => b.type === 'spawn');
    return spawn ? { x: spawn.x, y: spawn.y - 32 } : { x: 64, y: GROUND_Y - 96 };
  }, [blocks]);

  const goalPosition = useMemo(() => {
    const goal = blocks.find(b => b.type === 'goal');
    return goal ? { x: goal.x, y: goal.y } : null;
  }, [blocks]);

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

  const stopPlay = useCallback(() => {
    setIsPlaying(false);
    setPlayer(null);
    setCameraX(-100);
    setCameraY(0);
    resetCrumbleTimers();
    resetRotationAngles();
    setBlocks(prev => prev.map(b => 
      b.type === 'crumbling' ? { ...b, crumbleState: 'solid' } : b
    ));
  }, [resetCrumbleTimers, resetRotationAngles]);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !player) return;

    const gameLoop = () => {
      setPlayer(prev => {
        if (!prev) return null;
        const updated = updatePlayer(prev, blocks, CANVAS_HEIGHT, updateBlock, cameraY);
        
        const targetCameraX = Math.max(-LEVEL_WIDTH, updated.x - CANVAS_WIDTH / 3);
        setCameraX(prevCam => prevCam + (targetCameraX - prevCam) * 0.1);
        
        const targetCameraY = Math.max(-1000, Math.min(1000, updated.y - CANVAS_HEIGHT / 2));
        setCameraY(prevCamY => prevCamY + (targetCameraY - prevCamY) * 0.1);

        if (updated.hasWon && !prev.hasWon) {
          const timeSeconds = Math.floor((Date.now() - testStartTimeRef.current) / 1000);
          toast.success(`Level Complete in ${timeSeconds}s!`);
        }
        if (updated.isDead && !prev.isDead) {
          setTimeout(() => {
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

  const handlePlaceBlock = useCallback((x: number, y: number) => {
    if (!selectedBlock) return;

    // Snap to grid absolutely to prevent off-grid placement
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;

    if (y >= GROUND_Y) {
      toast.error('Cannot place blocks on the hazard ground!');
      return;
    }

    const pushShape = blockSettings.pushBlockShape;
    let blockWidth = GRID_SIZE;
    let blockHeight = GRID_SIZE;
    if (selectedBlock === 'push_block') {
      if (pushShape === 'rectangle_h') blockWidth = GRID_SIZE * 2;
      if (pushShape === 'rectangle_v') blockHeight = GRID_SIZE * 2;
    }

    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: selectedBlock,
      x,
      y,
      width: blockWidth,
      height: blockHeight,
      direction: selectedBlock === 'conveyor' ? blockSettings.conveyorDirection :
                 selectedBlock === 'ramp' ? blockSettings.rampDirection : undefined,
      moveSpeed: selectedBlock === 'conveyor' ? blockSettings.conveyorSpeed : 
                 selectedBlock === 'moving' ? blockSettings.moveSpeed : undefined,
      moveRange: selectedBlock === 'moving' ? blockSettings.moveRange : undefined,
      crumbleState: selectedBlock === 'crumbling' ? 'solid' : undefined,
      crumbleTime: selectedBlock === 'crumbling' ? blockSettings.crumbleTime : undefined,
      resetTime: selectedBlock === 'crumbling' ? blockSettings.resetTime : undefined,
      isGhost: selectedBlock === 'spawn' ? blockSettings.spawnIsGhost : undefined,
      gravityMultiplier: selectedBlock === 'low_gravity' ? blockSettings.gravityMultiplier : undefined,
      tentacleRadius: selectedBlock === 'tentacle' ? blockSettings.tentacleRadius : undefined,
      tentacleForce: selectedBlock === 'tentacle' ? blockSettings.tentacleForce : undefined,
      speedMultiplier: selectedBlock === 'speed_gate' ? blockSettings.speedMultiplier : undefined,
      speedDuration: selectedBlock === 'speed_gate' ? blockSettings.speedDuration : undefined,
      rampDirection: selectedBlock === 'ramp' ? blockSettings.rampDirection : undefined,
      rampColor: selectedBlock === 'ramp' ? blockSettings.rampColor : undefined,
      platformColor: selectedBlock === 'platform' ? blockSettings.platformColor : undefined,
      pushBlockShape: selectedBlock === 'push_block' ? blockSettings.pushBlockShape : undefined,
      pushBlockWeight: selectedBlock === 'push_block' ? blockSettings.pushBlockWeight : undefined,
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
  }, [selectedBlock, blockSettings, blocks, blocksOverlap]);

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
          isSlopeIce: selectedBlock === 'ice' && blockSettings.iceSlope !== undefined ? true : undefined,
          iceSlope: selectedBlock === 'ice' ? blockSettings.iceSlope : undefined,
        });
      }
    }

    if (newBlocks.length > 0) {
      setBlocks(prev => [...prev, ...newBlocks]);
    }
  }, [selectedBlock, blocks, blockSettings]);

  const handleRemoveBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block?.isLocked) return;
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, [blocks]);

  const handleMoveBlock = useCallback((id: string, newX: number, newY: number) => {
    if (newY >= GROUND_Y) {
      toast.error('Cannot move blocks to the hazard ground!');
      return;
    }
    setBlocks(prev => prev.map(b => 
      b.id === id 
        ? { ...b, x: newX, y: newY }
        : b
    ));
  }, []);

  const handleClear = () => {
    setBlocks(generateGroundBlocks());
    toast.info('Level cleared');
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied!');
    }
  };

  const handleLeave = () => {
    navigate('/editor');
  };

  const currentArchitect = architects?.find(a => a.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <GameButton variant="ghost" size="sm" onClick={handleLeave}>
            <ArrowLeft size={16} className="mr-2" />
            Exit
          </GameButton>
          <input
            type="text"
            value={levelNameState}
            onChange={e => setLevelNameState(e.target.value)}
            className="bg-input border-2 border-border px-3 py-2 font-pixel text-[10px] text-foreground focus:border-primary outline-none"
            placeholder="Level name..."
          />
          
          {/* Architects indicator */}
          <div className="flex items-center gap-2 bg-card/50 px-3 py-2 pixel-border">
            <Users size={14} className="text-primary" />
            <span className="font-pixel text-[10px] text-foreground">
              {architects?.length || 1}/4 Architects
            </span>
          </div>

          {/* Room code */}
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[8px] bg-primary/20 text-primary px-2 py-1">
              {roomCode}
            </span>
            <GameButton variant="ghost" size="sm" onClick={copyRoomCode}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </GameButton>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <GameButton variant="destructive" size="sm" onClick={stopPlay}>
              <Square size={14} className="mr-2" />
              Stop Test
            </GameButton>
          ) : (
            <GameButton variant="success" size="sm" onClick={startPlay}>
              <Play size={14} className="mr-2" />
              Test
            </GameButton>
          )}
          {!isPlaying && (
            <GameButton variant="outline" size="sm" onClick={() => setShowGridSizeDialog(true)}>
              <Grid3x3 size={14} className="mr-2" />
              Grid: {Math.round(levelWidth / GRID_SIZE)}x{Math.round(levelHeight / GRID_SIZE)}
            </GameButton>
          )}
          <GameButton variant="outline" size="sm" onClick={handleClear}>
            <Trash2 size={14} className="mr-2" />
            Clear
          </GameButton>
          <GameButton variant="accent" size="sm" onClick={handleLeave}>
            <LogOut size={14} className="mr-2" />
            Save & Exit
          </GameButton>
        </div>
      </div>

      {/* Architects bar */}
      {architects && architects.length > 0 && (
        <div className="mb-4 flex gap-2 bg-card/50 p-3 pixel-border">
          <span className="font-pixel text-[10px] text-muted-foreground">Building with:</span>
          <div className="flex gap-2">
            {architects.map(arch => (
              <div
                key={arch.id}
                className="flex items-center gap-1 px-2 py-1 bg-background/50 pixel-border"
              >
                <div
                  className="w-4 h-4 pixel-border"
                  style={{ backgroundColor: arch.avatar_color }}
                />
                <span className="font-pixel-body text-[8px] text-foreground">
                  {arch.display_name}
                </span>
                {arch.user_id === user?.id && (
                  <span className="text-success">(you)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor area with 3-column layout */}
      <div className="flex gap-4">
        {/* Block palette on left */}
        {!isPlaying && (
          <BlockPalette 
            selectedBlock={selectedBlock} 
            onSelectBlock={setSelectedBlock}
            blockSettings={blockSettings}
            onSettingsChange={setBlockSettings}
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
