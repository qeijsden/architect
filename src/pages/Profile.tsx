import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/lib/announcer';
import { ArrowLeft, User, Palette, Mail, Pencil, Eraser, Trash2 } from 'lucide-react';

const AVATAR_COLORS = [
  '#26c6da', // Cyan
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#06b6d4', // Sky
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, loading, updateProfile, signOut, steamMode, steamIdentity, linkedSteamId } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#26c6da');
  const [avatarPixels, setAvatarPixels] = useState<string[]>(() => new Array(32 * 32).fill('transparent'));
  const [avatarTool, setAvatarTool] = useState<'draw' | 'erase'>('draw');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  const effectiveProfile = useMemo(() => {
    if (profile) {
      return profile;
    }

    if (!isAuthenticated) {
      return null;
    }

    const now = new Date().toISOString();
    const identity = user?.id || steamIdentity?.steamId || 'local-player';
    return {
      id: identity,
      user_id: identity,
      playfab_id: identity,
      display_name: user?.name || steamIdentity?.personaName || 'Player',
      avatar_color: '#26c6da',
      created_at: now,
      updated_at: now,
      provider: steamMode ? 'steam' : 'local',
      provider_id: steamIdentity?.steamId || identity,
    };
  }, [isAuthenticated, profile, steamIdentity, steamMode, user]);

  // Initialize form with profile data
  useEffect(() => {
    if (effectiveProfile) {
      setDisplayName(effectiveProfile.display_name || '');
      setSelectedColor(effectiveProfile.avatar_color || '#26c6da');
      if (Array.isArray(effectiveProfile.avatar_pixels) && effectiveProfile.avatar_pixels.length === 32 * 32) {
        setAvatarPixels(effectiveProfile.avatar_pixels);
      } else {
        setAvatarPixels(new Array(32 * 32).fill('transparent'));
      }
    } else if (!loading) {
      setDisplayName('');
      setSelectedColor('#26c6da');
      setAvatarPixels(new Array(32 * 32).fill('transparent'));
    }
  }, [effectiveProfile, loading]);

  useEffect(() => {
    const drawToCanvas = (canvas: HTMLCanvasElement | null, pixelSize: number) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = 32;
      canvas.width = size * pixelSize;
      canvas.height = size * pixelSize;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const color = avatarPixels[y * size + x];
          if (!color || color === 'transparent') continue;
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i <= size; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pixelSize, 0);
        ctx.lineTo(i * pixelSize, size * pixelSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * pixelSize);
        ctx.lineTo(size * pixelSize, i * pixelSize);
        ctx.stroke();
      }
    };

    drawToCanvas(avatarCanvasRef.current, 8);
    drawToCanvas(previewCanvasRef.current, 3);
  }, [avatarPixels]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="font-pixel text-lg text-primary text-glow">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="font-pixel text-lg text-muted-foreground">Redirecting to account creation...</p>
          <GameButton variant="ghost" onClick={() => navigate('/auth')}>
            Go to Create Account
          </GameButton>
        </div>
      </div>
    );
  }

  const drawAvatarPixel = (clientX: number, clientY: number) => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((clientX - rect.left) / 8);
    const py = Math.floor((clientY - rect.top) / 8);
    if (px < 0 || px >= 32 || py < 0 || py >= 32) return;

    const next = [...avatarPixels];
    next[py * 32 + px] = avatarTool === 'draw' ? selectedColor : 'transparent';
    setAvatarPixels(next);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setSaveLoading(true);
    try {
      const result = await updateProfile({
        display_name: displayName.trim(),
        avatar_color: selectedColor,
        avatar_pixels: avatarPixels,
      });
      
      if (result.success) {
        setSaved(true);
        toast.success('Profile updated successfully!');
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      console.error('Save profile error:', message);
      toast.error(message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        navigate('/auth');
        toast.success('Signed out successfully');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign out';
        toast.error(message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/20 pixel-border" />
        <div className="absolute bottom-32 right-20 w-24 h-8 bg-accent/20 pixel-border" />
        <div className="absolute top-1/3 right-10 w-12 h-12 bg-success/20 pixel-border" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <GameButton 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <User size={48} className="text-primary" />
          </div>
          <h1 className="font-pixel text-2xl text-primary text-glow mb-4">PROFILE</h1>
          <p className="font-pixel-body text-muted-foreground">Customize your player identity</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card/50 p-6 pixel-border space-y-6 mb-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                className="pixel-border border-4"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-center">
              <p className="font-pixel text-sm text-muted-foreground">PREVIEW</p>
              <p className="font-pixel-body text-foreground">{displayName || 'Player'}</p>
            </div>
          </div>

          {/* Avatar BLOX Editor */}
          <div>
            <label className="font-pixel text-xs text-muted-foreground mb-2 block">AVATAR BLOX (32x32)</label>
            <div className="flex items-center gap-2 mb-2">
              <GameButton size="sm" variant={avatarTool === 'draw' ? 'primary' : 'outline'} onClick={() => setAvatarTool('draw')}>
                <Pencil size={12} className="mr-1" /> Draw
              </GameButton>
              <GameButton size="sm" variant={avatarTool === 'erase' ? 'primary' : 'outline'} onClick={() => setAvatarTool('erase')}>
                <Eraser size={12} className="mr-1" /> Erase
              </GameButton>
              <GameButton
                size="sm"
                variant="outline"
                onClick={() => setAvatarPixels(new Array(32 * 32).fill('transparent'))}
              >
                <Trash2 size={12} className="mr-1" /> Clear
              </GameButton>
            </div>
            <canvas
              ref={avatarCanvasRef}
              className="w-full max-w-[256px] pixel-border border-2 cursor-crosshair"
              style={{ imageRendering: 'pixelated' }}
              onMouseDown={(e) => {
                isDrawingRef.current = true;
                drawAvatarPixel(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (!isDrawingRef.current) return;
                drawAvatarPixel(e.clientX, e.clientY);
              }}
              onMouseUp={() => {
                isDrawingRef.current = false;
              }}
              onMouseLeave={() => {
                isDrawingRef.current = false;
              }}
            />
            <p className="font-pixel-body text-xs text-muted-foreground mt-2">This 32x32 BLOX avatar is used in-game for your player.</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="font-pixel text-xs text-muted-foreground mb-2 block">
              DISPLAY NAME
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full bg-background border-2 border-border px-10 py-3 font-pixel-body text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
              />
            </div>
            <p className="font-pixel-body text-xs text-muted-foreground mt-1 text-right">
              {displayName.length}/20
            </p>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="font-pixel text-xs text-muted-foreground mb-3 block">
              AVATAR COLOR
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 pixel-border transition-all ${
                    selectedColor === color
                      ? 'border-4 border-primary scale-110'
                      : 'border-2 border-border hover:border-primary'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Email Info */}
          {user?.email && (
            <div className="p-3 bg-muted/20 pixel-border">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-muted-foreground" />
                <p className="font-pixel text-xs text-muted-foreground">EMAIL</p>
              </div>
              <p className="font-pixel-body text-sm text-foreground break-all">{user.email}</p>
            </div>
          )}

          {/* Stats */}
          {effectiveProfile && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-primary/10 border-2 border-primary/30 pixel-border">
                <p className="font-pixel text-xs text-primary mb-1">JOINED</p>
                <p className="font-pixel-body text-sm text-foreground">
                  {new Date(effectiveProfile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-accent/10 border-2 border-accent/30 pixel-border">
                <p className="font-pixel text-xs text-accent mb-1">PROVIDER</p>
                <p className="font-pixel-body text-sm text-foreground capitalize">
                  {effectiveProfile.provider || 'Local'}
                </p>
              </div>
            </div>
          )}

          {/* Steam Link Status */}
          <div className={`p-3 pixel-border border-2 ${steamMode || linkedSteamId ? 'bg-success/10 border-success/30' : 'bg-muted/20 border-border'}`}>
            <p className="font-pixel text-xs mb-1">STEAM</p>
            {steamMode || linkedSteamId ? (
              <div>
                <p className="font-pixel-body text-sm text-foreground">Linked</p>
                <p className="font-pixel-body text-xs text-muted-foreground break-all">
                  {linkedSteamId || steamIdentity?.steamId}
                </p>
              </div>
            ) : (
              <p className="font-pixel-body text-sm text-muted-foreground">Not linked. Launch through Steam desktop build to link automatically.</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <GameButton
            variant={saved ? 'success' : 'primary'}
            size="lg"
            className="w-full"
            onClick={handleSaveProfile}
            disabled={saveLoading}
          >
            {saveLoading ? '...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
          </GameButton>

          <GameButton
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate('/two-fa')}
          >
            SECURITY SETTINGS
          </GameButton>

          <GameButton
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={handleSignOut}
          >
            SIGN OUT
          </GameButton>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-card/30 border-2 border-border pixel-border">
          <h3 className="font-pixel text-xs text-primary mb-2">PROFILE TIP</h3>
          <p className="font-pixel-body text-xs text-muted-foreground">
            Your display name and avatar color are visible to other players in multiplayer games and on leaderboards.
          </p>
        </div>
      </div>
    </div>
  );
}
