import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GameButton } from "@/components/ui/GameButton";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#0a0e14]">
      {/* Decorative background blocks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        {[
          { x: 100, y: 50, w: 64, h: 32, delay: 0 },
          { x: 300, y: 120, w: 48, h: 48, delay: 0.5 },
          { x: 500, y: 80, w: 32, h: 64, delay: 1 },
          { x: 700, y: 150, w: 56, h: 28, delay: 1.5 },
          { x: 850, y: 60, w: 40, h: 40, delay: 2 },
        ].map((block, i) => (
          <div
            key={i}
            className="absolute bg-cyan-500"
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.w}px`,
              height: `${block.h}px`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="z-10 text-center max-w-md w-full">
        <h1 className="font-pixel text-6xl text-red-500 mb-4 tracking-widest drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
          404
        </h1>
        <p className="font-pixel text-2xl text-amber-400 mb-2">PAGE NOT FOUND</p>
        <p className="font-pixel-body text-slate-400 mb-8">
          The player couldn't find that level. It might not exist yet!
        </p>
        
        <div className="mb-8 p-4 bg-red-900/30 border-2 border-red-700">
          <p className="font-pixel-body text-red-300 text-sm break-all">
            {location.pathname}
          </p>
        </div>

        <GameButton 
          onClick={() => navigate("/")}
          variant="primary"
          size="lg"
          className="w-full flex items-center justify-center gap-2"
        >
          <Home size={20} />
          Return to Home
        </GameButton>

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
    </div>
  );
};

export default NotFound;
