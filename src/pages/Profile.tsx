import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, User, Palette, Mail, LogOut } from 'lucide-react';

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
  const [bio, setBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

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

  // Show error if authenticated but no profile and not loading
  if (isAuthenticated && !profile && !loading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="font-pixel text-lg text-yellow-400">Profile data unavailable</p>
          <p className="font-pixel-body text-sm text-muted-foreground">Using defaults</p>
          <GameButton 
            variant="ghost" 
            onClick={() => navigate('/')}
          >
            Go Home
          </GameButton>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="font-pixel text-lg text-muted-foreground">Redirecting to sign in...</p>
          <GameButton variant="ghost" onClick={() => navigate('/auth')}>
            Go to Sign In
          </GameButton>
        </div>
      </div>
    );
  }

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setSelectedColor(profile.avatar_color || '#26c6da');
    } else if (!loading) {
      // Set defaults if no profile loaded but loading is done
      setDisplayName('');
      setSelectedColor('#26c6da');
    }
  }, [profile, loading]);

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
              <div
                className="w-20 h-20 pixel-border border-4 flex items-center justify-center text-3xl font-pixel"
                style={{ backgroundColor: selectedColor }}
              >
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
            <div className="text-center">
              <p className="font-pixel text-sm text-muted-foreground">PREVIEW</p>
              <p className="font-pixel-body text-foreground">{displayName || 'Player'}</p>
            </div>
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
          {profile && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-primary/10 border-2 border-primary/30 pixel-border">
                <p className="font-pixel text-xs text-primary mb-1">JOINED</p>
                <p className="font-pixel-body text-sm text-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 bg-accent/10 border-2 border-accent/30 pixel-border">
                <p className="font-pixel text-xs text-accent mb-1">PROVIDER</p>
                <p className="font-pixel-body text-sm text-foreground capitalize">
                  {profile.provider || 'Email'}
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
