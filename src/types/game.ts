export type BlockType = 
  | 'platform' 
  | 'hazard' 
  | 'goal' 
  | 'spawn' 
  | 'bounce' 
  | 'moving'
  | 'ice'
  | 'teleporter'
  | 'crumbling'
  | 'conveyor'
  | 'rotating_beam'
  | 'checkpoint'
  | 'low_gravity'
  | 'tentacle'
  | 'speed_gate'
  | 'ramp'
  | 'cannon'
  | 'wind'
  | 'directional_impact'
  | 'push_block'
  | 'water'
  | 'air_jump'
  | 'pulse_hazard'
  | 'phase_platform'
  | 'timer_orb'
  | 'zone'
  | 'custom';

export type LevelMode = 'race' | 'survival';

export type CustomBehaviorType = Exclude<BlockType, 'custom'>;

export interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  customBlockId?: string;
  customBehaviorTypes?: CustomBehaviorType[];
  // Original position (for rotating blocks)
  originalX?: number;
  originalY?: number;
  // For moving platforms - moves X blocks left and right
  moveRange?: number; // in blocks (grid units)
  moveSpeed?: number; // 0.1 to 1
  // For teleporters (paired) - one-way connection
  teleporterId?: string;
  teleportTarget?: string; // ID of destination teleporter (one-way)
  // For conveyor belts
  direction?: 'left' | 'right' | 'up' | 'down';
  // For rotating beams - pivot block
  rotationSpeed?: number;
  rotationAngle?: number;
  pivotId?: string; // Reference to the rotating_beam this block is attached to
  // For crumbling platforms
  crumbleState?: 'solid' | 'crumbling' | 'broken';
  crumbleTimer?: number;
  crumbleTime?: number; // Time in ms before breaking (default 1000)
  resetTime?: number; // Time in ms before respawning (default 3000)
  // For permanent ground blocks
  isLocked?: boolean;
  // Spawn settings
  isGhost?: boolean; // No collision spawn point
  // Low gravity zone (5x5)
  gravityMultiplier?: number;
  // Tentacle settings
  tentacleRadius?: number; // Proximity trigger radius
  tentacleForce?: number; // Knockback force
  // Speed gate settings
  speedMultiplier?: number;
  speedDuration?: number; // Duration in ms
  // Ramp direction
  rampDirection?: 'left' | 'right';
  // Platform color
  platformColor?: string;
  // Ramp color
  rampColor?: string;
  // Cannon settings
  cannonAngle?: number; // Center angle in degrees (0-360)
  cannonArc?: number; // Sweep arc in degrees
  cannonInterval?: number; // Time between shots in ms
  cannonSpeed?: number; // Ball speed
  // Wind block
  windForce?: number; // Push force (0.1 to 2)
  windDirection?: 'left' | 'right' | 'up' | 'down';
  windAngle?: number; // Direction in degrees, 0 = right
  // Directional impact (knockback instead of death)
  knockbackForce?: number;
  knockbackDirection?: 'left' | 'right' | 'up' | 'down';
  // Push block
  pushBlockShape?: 'square' | 'rectangle_h' | 'rectangle_v' | 'circle';
  pushBlockWeight?: number; // How heavy (affects push momentum)
  // Water block
  waterDensity?: number; // Buoyancy (0.5 to 2)
  // Wall jump
  wallJumpPower?: number; // Jump velocity multiplier
  // Auto-connect for beams
  connectedBlockIds?: string[];
  // Ice slope - makes ice behave like a ramp
  isSlopeIce?: boolean;
  iceSlope?: 'left' | 'right'; // Direction of slope on ice
  // Ice sledding cap
  capSledding?: boolean; // Capped Sledding — limits max slide speed when true
  maxSlideSpeed?: number; // Max horizontal speed on ice (only used when capSledding=true)
  // Survival blocks
  pulseInterval?: number; // Full cycle duration in ms
  pulseActiveDuration?: number; // Active slice of the cycle in ms
  phaseInterval?: number; // Full cycle duration in ms
  phaseActiveDuration?: number; // Solid slice of the cycle in ms
  timerBonusSeconds?: number; // Time added when collected
  collected?: boolean; // Runtime-only pickup state
}

export interface CustomBlockDefinition {
  id: string;
  name: string;
  sprite: PixelData;
  behaviorTypes: CustomBehaviorType[];
  settings: BlockSettings;
  createdAt: string;
  updatedAt: string;
}

// Block settings interface for editor
export interface BlockSettings {
  customBehaviorTypes: CustomBehaviorType[];
  // Conveyor
  conveyorDirection: 'left' | 'right';
  conveyorSpeed: number;
  // Rotating beam
  rotationSpeed: number;
  rotationDirection: 'cw' | 'ccw';
  // Moving platform
  moveRange: number;
  moveSpeed: number;
  // Crumbling
  crumbleTime: number;
  resetTime: number;
  // Spawn
  spawnIsGhost: boolean;
  // Low gravity
  gravityMultiplier: number;
  // Tentacle
  tentacleRadius: number;
  tentacleForce: number;
  // Speed gate
  speedMultiplier: number;
  speedDuration: number;
  // Ramp
  rampDirection: 'left' | 'right';
  // Platform
  platformColor: string;
  // Ramp color
  rampColor: string;
  // Cannon
  cannonAngle: number;
  cannonArc: number;
  cannonInterval: number;
  // Wind
  windForce: number;
  windDirection: 'left' | 'right' | 'up' | 'down';
  windAngle: number;
  // Directional impact
  knockbackForce: number;
  knockbackDirection: 'left' | 'right' | 'up' | 'down';
  // Push block
  pushBlockShape: 'square' | 'rectangle_h' | 'rectangle_v' | 'circle';
  pushBlockWeight: number;
  // Water
  waterDensity: number;
  // Wall jump
  wallJumpPower: number;
  // Ice ramp
  iceSlope?: 'left' | 'right';
  // Ice sledding cap
  iceCappedSledding: boolean;
  iceMaxSlideSpeed: number;
  // Survival blocks
  pulseInterval: number;
  pulseActiveDuration: number;
  phaseInterval: number;
  phaseActiveDuration: number;
  timerBonusSeconds: number;
}

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  customBehaviorTypes: ['platform'],
  conveyorDirection: 'right',
  conveyorSpeed: 3,
  rotationSpeed: 2,
  rotationDirection: 'cw',
  moveRange: 3,
  moveSpeed: 0.5,
  crumbleTime: 1000,
  resetTime: 3000,
  spawnIsGhost: false,
  gravityMultiplier: 0.3,
  tentacleRadius: 4,
  tentacleForce: 20,
  speedMultiplier: 2,
  speedDuration: 3000,
  rampDirection: 'right',
  platformColor: '#3d4a5c',
  rampColor: '#455a64',
  cannonAngle: 90,
  cannonArc: 30,
  cannonInterval: 2000,
  windForce: 0.8,
  windDirection: 'right',
  windAngle: 0,
  knockbackForce: 15,
  knockbackDirection: 'up',
  pushBlockShape: 'square',
  pushBlockWeight: 1,
  waterDensity: 1.2,
  wallJumpPower: 1.5,
  iceSlope: undefined,
  iceCappedSledding: false,
  iceMaxSlideSpeed: 16,
  pulseInterval: 2000,
  pulseActiveDuration: 1200,
  phaseInterval: 2200,
  phaseActiveDuration: 1400,
  timerBonusSeconds: 5,
};

export interface Level {
  id: string;
  name: string;
  author: string;
  author_id?: string;
  blocks: Block[];
  validated: boolean;
  plays: number;
  likes: number;
  createdAt: Date;
  mode?: LevelMode;
  seed?: string;
  max_time_seconds?: number;
  survival_time_seconds?: number;
  completion_count?: number;
  played_by?: string[]; // Unique player IDs who have played at least once
  completed_by?: string[]; // Unique player IDs who have completed at least once
  liked_by?: string[]; // Unique player IDs who liked/favorited the level
  trackUrl?: string; // Level soundtrack link (Spotify, Apple Music, YouTube, or direct audio)
  trackTitle?: string; // Optional user-facing song title
  trackArtist?: string; // Optional user-facing song artist/creator
  allowImport?: boolean; // Allow other users to copy and modify
  gridSize?: number; // Grid size used in level (default 32), affects canvas dimensions
  texturePack?: TexturePack; // BLOX pixel art texture pack forced for this level
  customBlocks?: CustomBlockDefinition[];
}

// BLOX Pixel Editor - Texture Pack System
export interface PixelData {
  width: number; // 16, 32, 64, or 128
  height: number;
  pixels: string[]; // Array of CSS color strings, row-major order
}

export interface TexturePack {
  id: string;
  name: string;
  size: 16 | 32 | 64 | 128; // Texture resolution
  textures: {
    platform?: PixelData;
    hazard?: PixelData;
    goal?: PixelData;
    spawn?: PixelData;
    bounce?: PixelData;
    moving?: PixelData;
    ice?: PixelData;
    teleporter?: PixelData;
    crumbling?: PixelData;
    conveyor?: PixelData;
    rotating_beam?: PixelData;
    checkpoint?: PixelData;
    low_gravity?: PixelData;
    tentacle?: PixelData;
    speed_gate?: PixelData;
    ramp?: PixelData;
    cannon?: PixelData;
    wind?: PixelData;
    directional_impact?: PixelData;
    push_block?: PixelData;
    water?: PixelData;
    air_jump?: PixelData;
  };
  createdAt: string;
  createdBy: string;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isGrounded: boolean;
  onIce?: boolean;
  isDead: boolean;
  hasWon: boolean;
  lastCheckpoint?: { x: number; y: number };
  name?: string;
  isLocal?: boolean;
  // Speed boost effect
  speedBoostMultiplier?: number;
  speedBoostEndTime?: number;
  score?: number; // Individual/team score
}

// Cannon projectile
export interface CannonBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cannonId: string;
}

export interface GameState {
  players: Player[];
  level: Level | null;
  isPlaying: boolean;
  timeElapsed: number;
  cannonBalls?: CannonBall[];
}

export interface GameSession {
  id: string;
  level_id: string;
  room_code: string | null;
  is_public: boolean;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players?: number;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  user_id: string;
  player_name: string;
  color: string;
  position_x?: number;
  position_y?: number;
  is_ready: boolean;
  has_finished?: boolean;
  has_won?: boolean;
  finish_time?: number | null;
  deaths?: number;
  created_at?: string;
}

export interface LeaderboardEntry {
  id: string;
  level_id: string;
  user_id: string;
  player_name: string;
  time_seconds: number;
  deaths: number;
  mode?: LevelMode;
  created_at: string;
  is_multiplayer?: boolean; // False for single-player, True for multiplayer (multiplayer entries filtered from lbs)
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend_profile?: {
    display_name: string;
    avatar_color: string;
  };
}

export interface Profile {
  id: string;
  user_id: string;
  playfab_id: string | null;
  display_name: string;
  avatar_color: string;
  avatar_pixels?: string[]; // 32x32 (1024 pixels) custom avatar data
  created_at: string;
  updated_at: string;
  tutorial_completed?: boolean;
  wins?: number; // Total competitive wins
  two_fa_enabled?: boolean;
  two_fa_method?: string;
  two_fa_verified?: boolean;
  provider?: string;
  provider_id?: string;
  last_login?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedTime: string | null;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  percentage: number;
}

// Tutorial level blocks
export const TUTORIAL_LEVEL_BLOCKS: Block[] = [
  // Spawn point - ghost mode
  { id: 'tutorial-spawn', type: 'spawn', x: 64, y: 384, width: 32, height: 32, isGhost: true },
  
  // Starting platforms
  { id: 'tutorial-p1', type: 'platform', x: 32, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p1b', type: 'platform', x: 64, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p1c', type: 'platform', x: 96, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p2', type: 'platform', x: 160, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p2b', type: 'platform', x: 192, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p2c', type: 'platform', x: 224, y: 416, width: 32, height: 32 },
  
  // Jump training
  { id: 'tutorial-p3', type: 'platform', x: 300, y: 380, width: 32, height: 32 },
  { id: 'tutorial-p3b', type: 'platform', x: 332, y: 380, width: 32, height: 32 },
  { id: 'tutorial-p3c', type: 'platform', x: 364, y: 380, width: 32, height: 32 },
  { id: 'tutorial-p4', type: 'platform', x: 440, y: 340, width: 32, height: 32 },
  { id: 'tutorial-p4b', type: 'platform', x: 472, y: 340, width: 32, height: 32 },
  { id: 'tutorial-p4c', type: 'platform', x: 504, y: 340, width: 32, height: 32 },
  
  // Hazard introduction
  { id: 'tutorial-h1', type: 'hazard', x: 580, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p5', type: 'platform', x: 540, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p6', type: 'platform', x: 620, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p6b', type: 'platform', x: 652, y: 416, width: 32, height: 32 },
  
  // Bounce pad
  { id: 'tutorial-b1', type: 'bounce', x: 720, y: 416, width: 32, height: 32 },
  { id: 'tutorial-p7', type: 'platform', x: 750, y: 280, width: 32, height: 32 },
  { id: 'tutorial-p7b', type: 'platform', x: 782, y: 280, width: 32, height: 32 },
  { id: 'tutorial-p7c', type: 'platform', x: 814, y: 280, width: 32, height: 32 },
  
  // Checkpoint
  { id: 'tutorial-cp1', type: 'checkpoint', x: 780, y: 248, width: 32, height: 32 },
  
  // Ice platform
  { id: 'tutorial-i1', type: 'ice', x: 880, y: 280, width: 32, height: 32 },
  { id: 'tutorial-i2', type: 'ice', x: 912, y: 280, width: 32, height: 32 },
  { id: 'tutorial-i3', type: 'ice', x: 944, y: 280, width: 32, height: 32 },
  
  // Conveyor
  { id: 'tutorial-cv1', type: 'conveyor', x: 1020, y: 280, width: 32, height: 32, direction: 'right', moveSpeed: 3 },
  { id: 'tutorial-cv2', type: 'conveyor', x: 1052, y: 280, width: 32, height: 32, direction: 'right', moveSpeed: 3 },
  { id: 'tutorial-cv3', type: 'conveyor', x: 1084, y: 280, width: 32, height: 32, direction: 'right', moveSpeed: 3 },
  
  // Goal platform and flag
  { id: 'tutorial-p8', type: 'platform', x: 1150, y: 280, width: 32, height: 32 },
  { id: 'tutorial-p8b', type: 'platform', x: 1182, y: 280, width: 32, height: 32 },
  { id: 'tutorial-p8c', type: 'platform', x: 1214, y: 280, width: 32, height: 32 },
  { id: 'tutorial-goal', type: 'goal', x: 1180, y: 248, width: 32, height: 32 },
];
