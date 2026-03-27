import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { TexturePack, PixelData, BlockType } from '@/types/game';
import { ArrowLeft, Download, Upload, RotateCcw, Palette, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const TEXTURE_SIZES = [16, 32, 64, 128] as const;
const BLOCK_TYPES: BlockType[] = [
  'platform', 'hazard', 'goal', 'spawn', 'bounce', 'moving', 'ice', 'teleporter',
  'crumbling', 'conveyor', 'rotating_beam', 'checkpoint', 'low_gravity', 'tentacle',
  'speed_gate', 'ramp', 'cannon', 'wind', 'directional_impact', 'push_block', 'water', 'air_jump'
];

const DEFAULT_COLORS: Record<string, string> = {
  platform: '#6b7280',
  hazard: '#dc2626',
  goal: '#fbbf24',
  spawn: '#22c55e',
  bounce: '#a855f7',
  ice: '#06b6d4',
  teleporter: '#6366f1',
  crumbling: '#b45309',
  conveyor: '#0ea5e9',
  rotating_beam: '#f97316',
  checkpoint: '#3b82f6',
  moving: '#8b5cf6',
  low_gravity: '#ec4899',
  tentacle: '#8b5cf6',
  speed_gate: '#eab308',
  ramp: '#14b8a6',
  cannon: '#f97316',
  wind: '#60a5fa',
  directional_impact: '#f43f5e',
  push_block: '#a3e635',
  water: '#0284c7',
  air_jump: '#a78bfa',
};

export default function BLOXEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const existingTexturePack = location.state?.texturePack as TexturePack | undefined;
  const levelId = location.state?.levelId as string | undefined;

  const [textureSize, setTextureSize] = useState<16 | 32 | 64 | 128>(existingTexturePack?.size || 32);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>(BLOCK_TYPES[0]);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS['platform']);
  
  // Store all block textures, not just the selected one
  const [allBlockTextures, setAllBlockTextures] = useState<Record<BlockType, string[]>>(() => {
    const textures: Record<BlockType, string[]> = {} as Record<BlockType, string[]>;
    BLOCK_TYPES.forEach(blockType => {
      if (existingTexturePack?.textures[blockType]) {
        textures[blockType] = [...existingTexturePack.textures[blockType]!.pixels];
      } else {
        textures[blockType] = new Array((existingTexturePack?.size || 32) * (existingTexturePack?.size || 32)).fill(DEFAULT_COLORS[blockType] || '#ffffff');
      }
    });
    return textures;
  });
  
  const pixels = allBlockTextures[selectedBlockType] || new Array(textureSize * textureSize).fill(DEFAULT_COLORS[selectedBlockType] || '#ffffff');
  const setPixels = (newPixels: string[]) => {
    setAllBlockTextures(prev => ({
      ...prev,
      [selectedBlockType]: newPixels
    }));
  };
  
  const [packName, setPackName] = useState(existingTexturePack?.name || 'My Texture Pack');
  const [toolMode, setToolMode] = useState<'draw' | 'erase'>('draw');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copiedPack, setCopiedPack] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const PIXEL_DISPLAY_SIZE = textureSize <= 32 ? 16 : 12; // Responsive pixel size

  // Redraw canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const displaySize = PIXEL_DISPLAY_SIZE;
    canvasRef.current.width = textureSize * displaySize;
    canvasRef.current.height = textureSize * displaySize;

    // Draw grid
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, textureSize * displaySize, textureSize * displaySize);

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= textureSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * displaySize, 0);
      ctx.lineTo(i * displaySize, textureSize * displaySize);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * displaySize);
      ctx.lineTo(textureSize * displaySize, i * displaySize);
      ctx.stroke();
    }

    // Draw pixels for current block type
    const currentPixels = allBlockTextures[selectedBlockType] || new Array(textureSize * textureSize).fill('#ffffff');
    for (let i = 0; i < currentPixels.length; i++) {
      const x = i % textureSize;
      const y = Math.floor(i / textureSize);
      ctx.fillStyle = currentPixels[i];
      ctx.fillRect(x * displaySize, y * displaySize, displaySize, displaySize);
    }
  }, [allBlockTextures, textureSize, selectedBlockType]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_DISPLAY_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_DISPLAY_SIZE);

    if (x >= 0 && x < textureSize && y >= 0 && y < textureSize) {
      const index = y * textureSize + x;
      const newPixels = [...pixels];
      newPixels[index] = toolMode === 'draw' ? selectedColor : '#ffffff';
      setPixels(newPixels);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 0) return;
    handleCanvasClick(e);
  };

  const handleBlockTypeChange = (blockType: BlockType) => {
    setSelectedBlockType(blockType);
  };

  const handleSizeChange = (newSize: 16 | 32 | 64 | 128) => {
    if (newSize === textureSize) return;
    
    // Scale all textures
    const oldSize = textureSize;
    const scaledTextures: Record<BlockType, string[]> = {} as Record<BlockType, string[]>;
    
    BLOCK_TYPES.forEach(blockType => {
      const oldPixels = allBlockTextures[blockType] || new Array(oldSize * oldSize).fill('#ffffff');
      const newPixels = new Array(newSize * newSize).fill('#ffffff');
      
      // Scale existing pixels
      for (let y = 0; y < newSize; y++) {
        for (let x = 0; x < newSize; x++) {
          const srcX = Math.floor((x / newSize) * oldSize);
          const srcY = Math.floor((y / newSize) * oldSize);
          const srcIndex = srcY * oldSize + srcX;
          const dstIndex = y * newSize + x;
          newPixels[dstIndex] = oldPixels[srcIndex] || '#ffffff';
        }
      }
      scaledTextures[blockType] = newPixels;
    });

    setTextureSize(newSize);
    setAllBlockTextures(scaledTextures);
  };

  const handleClear = () => {
    setPixels(new Array(textureSize * textureSize).fill('#ffffff'));
  };

  const handleFill = () => {
    setPixels(new Array(textureSize * textureSize).fill(selectedColor));
  };

  const exportTexturePackJSON = () => {
    const textures: Record<string, PixelData> = {};
    BLOCK_TYPES.forEach(blockType => {
      textures[blockType] = {
        width: textureSize,
        height: textureSize,
        pixels: allBlockTextures[blockType] || new Array(textureSize * textureSize).fill('#ffffff')
      };
    });

    const texturePack: TexturePack = {
      id: `blox_${Date.now()}`,
      name: packName,
      size: textureSize,
      textures: textures as TexturePack['textures'],
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'anonymous',
    };

    const json = JSON.stringify(texturePack, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${packName.replace(/\s+/g, '_')}_${Date.now()}.blox`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Texture pack exported!');
  };

  const handleImportTexturePackJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const imported = JSON.parse(text) as TexturePack;
      setTextureSize(imported.size);
      setPackName(imported.name);
      
      // Load all textures from import
      const importedTextures: Record<BlockType, string[]> = {} as Record<BlockType, string[]>;
      BLOCK_TYPES.forEach(blockType => {
        if (imported.textures[blockType]) {
          importedTextures[blockType] = [...imported.textures[blockType]!.pixels];
        } else {
          importedTextures[blockType] = new Array(imported.size * imported.size).fill(DEFAULT_COLORS[blockType] || '#ffffff');
        }
      });
      setAllBlockTextures(importedTextures);
      toast.success('Texture pack imported!');
    } catch (error) {
      toast.error('Failed to import texture pack');
    }
  };

  const handleApplyToLevel = () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!levelId) {
      toast.error('No level to apply texture pack to');
      return;
    }

    // Build complete texture pack with all edited block textures
    const textures: Record<string, PixelData> = {};
    BLOCK_TYPES.forEach(blockType => {
      textures[blockType] = {
        width: textureSize,
        height: textureSize,
        pixels: allBlockTextures[blockType] || new Array(textureSize * textureSize).fill('#ffffff')
      };
    });

    const texturePack: TexturePack = {
      id: `blox_${Date.now()}`,
      name: packName,
      size: textureSize,
      textures: textures as TexturePack['textures'],
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    // Store and return to editor
    navigate('/editor', {
      state: { 
        appliedTexturePack: texturePack,
        levelId
      }
    });
    toast.success('Texture pack applied to level!');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <GameButton variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </GameButton>

          <div className="mt-4">
            <h1 className="font-pixel text-2xl text-primary text-glow">BLOX PIXEL EDITOR</h1>
            <p className="font-pixel-body text-muted-foreground text-sm mt-2">
              Create custom pixel art textures for your levels
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Canvas */}
          <div className="md:col-span-2">
            <div className="bg-card/50 p-6 pixel-border">
              <div className="mb-4">
                <label className="font-pixel text-sm text-foreground block mb-2">
                  {selectedBlockType.toUpperCase()} Texture ({textureSize}x{textureSize})
                </label>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  className="border-2 border-border bg-background/50 cursor-crosshair"
                />
              </div>

              {/* Texture Size */}
              <div className="mb-4">
                <label className="font-pixel-body text-xs text-foreground block mb-2">Texture Size</label>
                <div className="flex gap-2">
                  {TEXTURE_SIZES.map(size => (
                    <GameButton
                      key={size}
                      variant={textureSize === size ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleSizeChange(size)}
                    >
                      {size}x{size}
                    </GameButton>
                  ))}
                </div>
              </div>

              {/* Tool Mode */}
              <div className="flex gap-2">
                <GameButton
                  variant={toolMode === 'draw' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setToolMode('draw')}
                  className="flex-1"
                >
                  Draw
                </GameButton>
                <GameButton
                  variant={toolMode === 'erase' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setToolMode('erase')}
                  className="flex-1"
                >
                  Erase
                </GameButton>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-3">
            {/* Color Picker */}
            <div className="bg-card/50 p-4 pixel-border">
              <label className="font-pixel text-sm text-foreground block mb-3">
                <Palette size={14} className="inline mr-2" />
                Color
              </label>

              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-12 h-12 border-2 border-border cursor-pointer"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="flex-1 bg-input border border-border px-2 py-1 font-pixel-body text-sm"
                />
              </div>

              {showColorPicker && (
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {Object.values(DEFAULT_COLORS).map(color => (
                    <button
                      key={color}
                      className="w-8 h-8 border-2 border-border hover:border-primary transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setSelectedColor(color);
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <GameButton size="sm" variant="outline" onClick={handleFill} className="flex-1">
                  Fill
                </GameButton>
                <GameButton size="sm" variant="outline" onClick={handleClear} className="flex-1">
                  <RotateCcw size={12} className="mr-1" />
                  Clear
                </GameButton>
              </div>
            </div>

            {/* Block Type Selection */}
            <div className="bg-card/50 p-4 pixel-border">
              <label className="font-pixel text-sm text-foreground block mb-2">Block Types</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {BLOCK_TYPES.map(blockType => (
                  <GameButton
                    key={blockType}
                    variant={selectedBlockType === blockType ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleBlockTypeChange(blockType)}
                  >
                    <span className="text-[9px]">{blockType.substring(0, 6)}</span>
                  </GameButton>
                ))}
              </div>
            </div>

            {/* Pack Info */}
            <div className="bg-card/50 p-4 pixel-border">
              <label className="font-pixel-body text-xs text-foreground block mb-2">Pack Name</label>
              <input
                type="text"
                value={packName}
                onChange={e => setPackName(e.target.value)}
                maxLength={32}
                className="w-full bg-input border border-border px-3 py-2 font-pixel-body text-sm mb-3"
              />

              {/* Export/Import */}
              <div className="space-y-2 mb-3">
                <GameButton size="sm" onClick={exportTexturePackJSON} className="w-full">
                  <Download size={12} className="mr-2" />
                  Export Pack
                </GameButton>

                <label className="block">
                  <GameButton size="sm" variant="outline" className="w-full cursor-pointer">
                    <Upload size={12} className="mr-2" />
                    Import Pack
                  </GameButton>
                  <input
                    type="file"
                    accept=".blox,.json"
                    onChange={handleImportTexturePackJSON}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Apply to Level */}
              {levelId && (
                <GameButton size="sm" variant="primary" onClick={handleApplyToLevel} className="w-full">
                  <Check size={12} className="mr-2" />
                  Apply to Level
                </GameButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
