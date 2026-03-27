import { useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Hammer, LogIn, LogOut, MessageSquarePlus, FileText, Settings } from 'lucide-react';
import { FeatureRequestDialog } from '@/components/game/FeatureRequestDialog';
import { PatchNotesDialog } from '@/components/game/PatchNotesDialog';
import { StartupWarningDialog } from '@/components/game/StartupWarningDialog';

export default function Home() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, signOut, loading } = useAuth();
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#0a0e14]">
      {/* Floating background blocks (same as in-game) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { x: 100, y: 50, w: 64, h: 32, delay: 0 },
          { x: 300, y: 120, w: 48, h: 48, delay: 0.5 },
          { x: 500, y: 80, w: 32, h: 64, delay: 1 },
          { x: 700, y: 150, w: 56, h: 28, delay: 1.5 },
          { x: 850, y: 60, w: 40, h: 40, delay: 2 },
          { x: 200, y: 350, w: 48, h: 32, delay: 2.5 },
          { x: 600, y: 380, w: 64, h: 24, delay: 3 },
          { x: 400, y: 200, w: 32, h: 32, delay: 3.5 },
          { x: 150, y: 250, w: 40, h: 48, delay: 4 },
          { x: 750, y: 300, w: 56, h: 32, delay: 4.5 },
        ].map((block, i) => (
          <div
            key={i}
            className="absolute bg-[#3d4a5c] opacity-10 animate-float"
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.w}px`,
              height: `${block.h}px`,
              animationDelay: `${block.delay}s`,
            }}
          />
        ))}
      </div>

      {/* User info / Auth buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {loading ? (
          <span className="font-pixel text-xs text-muted-foreground">Loading...</span>
        ) : isAuthenticated ? (
          <>
            <GameButton 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <Settings size={14} />
            </GameButton>
            <GameButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setFeatureRequestOpen(true)}
              title="Request a feature"
            >
              <MessageSquarePlus size={14} />
            </GameButton>
            <GameButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setPatchNotesOpen(true)}
              title="View patch notes"
            >
              <FileText size={14} />
            </GameButton>
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 bg-amber-950/60 px-3 py-2 border-2 border-amber-800/50 hover:border-amber-700 transition-colors cursor-pointer"
            >
              <div 
                className="w-6 h-6 border-2 border-amber-700" 
                style={{ backgroundColor: profile?.avatar_color || '#26c6da' }} 
              />
              <span className="font-pixel-body text-amber-100">
                {profile?.display_name || 'Player'}
              </span>
            </button>
            <GameButton variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={14} />
            </GameButton>
          </>
        ) : (
          <GameButton variant="primary" size="sm" onClick={() => navigate('/auth')}>
            <LogIn size={14} className="mr-2" />
            Sign In
          </GameButton>
        )}
      </div>

      {/* Title */}
      <div className="text-center mb-10 z-10">
        <h1 className="font-pixel text-4xl md:text-5xl text-amber-400 tracking-widest drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">
          ARCHITECT
        </h1>
        <div className="mt-2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto" />
      </div>

      {/* Main menu buttons - wooden/construction themed */}
      <div className="flex flex-col gap-3 z-10 w-full max-w-xs">
        <button 
          onClick={() => navigate('/browse')}
          className="group relative w-full py-4 px-6 bg-gradient-to-b from-amber-700 to-amber-800 border-4 border-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <div className="flex items-center justify-center gap-3">
            <span className="font-pixel text-sm text-amber-100">PLAY LEVELS</span>
          </div>
          {/* Nail decorations */}
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
        </button>
        
        <button 
          onClick={() => isAuthenticated ? navigate('/editor') : navigate('/auth')}
          className="group relative w-full py-4 px-6 bg-gradient-to-b from-stone-600 to-stone-700 border-4 border-stone-500 hover:from-stone-500 hover:to-stone-600 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <div className="flex items-center justify-center gap-3">
            <Hammer size={22} className="text-stone-200" />
            <span className="font-pixel text-sm text-stone-100">CREATE LEVEL</span>
          </div>
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-gray-400 border border-gray-500" />
        </button>


      </div>

      {/* Footer info */}
      <div className="absolute bottom-6 text-center">
        <p className="font-pixel text-[8px] text-amber-100/30">
          v0.5.2 ARCHITECT BETA
        </p>
      </div>

      <FeatureRequestDialog 
        open={featureRequestOpen} 
        onOpenChange={setFeatureRequestOpen} 
      />

      <PatchNotesDialog 
        open={patchNotesOpen} 
        onOpenChange={setPatchNotesOpen} 
      />

      <StartupWarningDialog />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(3px); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
