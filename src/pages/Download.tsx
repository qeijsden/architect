import { GameButton } from '@/components/ui/GameButton';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download as DownloadIcon, Monitor, Server, Zap, Shield, Gamepad2, ExternalLink } from 'lucide-react';
import { openDownloadPage, DOWNLOADS } from '@/utils/downloadHelpers';

export default function Download() {
  const navigate = useNavigate();

  const handleWindowsDownload = () => {
    openDownloadPage(DOWNLOADS.windows.url);
  };

  const handleLinuxDownload = () => {
    openDownloadPage(DOWNLOADS.linux.url);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#0a0e14]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        {[
          { x: 50, y: 100, w: 64, h: 32, delay: 0 },
          { x: 400, y: 150, w: 48, h: 48, delay: 0.5 },
          { x: 750, y: 80, w: 32, h: 64, delay: 1 },
          { x: 200, y: 400, w: 56, h: 28, delay: 1.5 },
          { x: 950, y: 120, w: 40, h: 40, delay: 2 },
        ].map((block, i) => (
          <div
            key={i}
            className="absolute bg-cyan-500"
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

      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>
      </div>

      {/* Content */}
      <div className="z-10 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <DownloadIcon size={32} className="text-cyan-400" />
            <h1 className="font-pixel text-3xl md:text-4xl text-cyan-400 tracking-widest">
              DOWNLOAD
            </h1>
          </div>
          <h2 className="font-pixel text-2xl text-amber-400 mb-2">ARCHITECT</h2>
          <p className="font-pixel-body text-slate-400 text-sm">
            Get the desktop app for the ultimate experience
          </p>
          <div className="mt-4 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-600 to-transparent mx-auto" />
        </div>

        {/* Download Options */}
        <div className="grid gap-6 mb-8">
          {/* Windows Download */}
          <button
            onClick={handleWindowsDownload}
            className="group relative w-full py-6 px-6 bg-gradient-to-b from-blue-600 to-blue-700 border-4 border-blue-500 hover:from-blue-500 hover:to-blue-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-600/50"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/5 pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/30 rounded">
                  <Monitor size={28} className="text-blue-100" />
                </div>
                <div className="text-left">
                  <div className="font-pixel text-lg text-blue-100">WINDOWS</div>
                  <div className="font-pixel-body text-blue-200/70 text-xs">64-bit Installer (.exe)</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-300 animate-pulse" />
                <ExternalLink size={18} className="text-blue-200 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
          </button>

          {/* Linux Download */}
          <button
            onClick={handleLinuxDownload}
            className="group relative w-full py-6 px-6 bg-gradient-to-b from-orange-600 to-orange-700 border-4 border-orange-500 hover:from-orange-500 hover:to-orange-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-orange-600/50"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-white/5 pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/30 rounded">
                  <Server size={28} className="text-orange-100" />
                </div>
                <div className="text-left">
                  <div className="font-pixel text-lg text-orange-100">LINUX</div>
                  <div className="font-pixel-body text-orange-200/70 text-xs">AppImage Format</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-300 animate-pulse" />
                <ExternalLink size={18} className="text-orange-200 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-yellow-300 border border-yellow-400" />
          </button>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-slate-800/60 border-2 border-cyan-700/50 hover:border-cyan-600">
            <h3 className="font-pixel text-sm text-cyan-400 mb-3">PERFORMANCE</h3>
            <ul className="space-y-2 font-pixel-body text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Higher framerates
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Smooth gameplay
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Optimized graphics
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800/60 border-2 border-amber-700/50 hover:border-amber-600">
            <h3 className="font-pixel text-sm text-amber-400 mb-3">FEATURES</h3>
            <ul className="space-y-2 font-pixel-body text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Fullscreen mode
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Offline editing
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Game controller support
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800/60 border-2 border-green-700/50 hover:border-green-600">
            <h3 className="font-pixel text-sm text-green-400 mb-3">GAMEPLAY</h3>
            <ul className="space-y-2 font-pixel-body text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <Gamepad2 size={14} className="text-green-400" /> Enhanced controls
              </li>
              <li className="flex items-center gap-2">
                <Gamepad2 size={14} className="text-green-400" /> Multiplayer ready
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800/60 border-2 border-purple-700/50 hover:border-purple-600">
            <h3 className="font-pixel text-sm text-purple-400 mb-3">SECURITY</h3>
            <ul className="space-y-2 font-pixel-body text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <Shield size={14} className="text-purple-400" /> Sandboxed app
              </li>
              <li className="flex items-center gap-2">
                <Shield size={14} className="text-purple-400" /> Safe downloads
              </li>
            </ul>
          </div>
        </div>

        {/* System Requirements */}
        <div className="p-4 bg-slate-900/80 border-2 border-slate-700 rounded">
          <h3 className="font-pixel text-sm text-slate-300 mb-3">SYSTEM REQUIREMENTS</h3>
          <div className="grid md:grid-cols-2 gap-4 font-pixel-body text-xs text-slate-400">
            <div>
              <p className="text-slate-300 font-pixel mb-1">Windows:</p>
              <ul className="space-y-1 ml-2">
                <li>• Windows 10 or later</li>
                <li>• 4GB RAM minimum</li>
                <li>• 500MB free disk space</li>
              </ul>
            </div>
            <div>
              <p className="text-slate-300 font-pixel mb-1">Linux:</p>
              <ul className="space-y-1 ml-2">
                <li>• GLIBC 2.29+</li>
                <li>• 4GB RAM minimum</li>
                <li>• 500MB free disk space</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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
