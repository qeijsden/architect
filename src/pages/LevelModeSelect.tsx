import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/ui/GameButton';
import { ArrowLeft, Flag, TimerReset } from 'lucide-react';

const MODES = [
  {
    id: 'race',
    title: 'Race',
    description: 'Players sprint to the goal. Great for classic platforming and speedrun routes.',
    accent: 'border-cyan-300 bg-cyan-400/15',
    icon: Flag,
  },
  {
    id: 'survival',
    title: 'Survival',
    description: 'Players must survive for the target time. Ideal for arenas, traps, waves, and endurance maps.',
    accent: 'border-pink-300 bg-pink-400/15',
    icon: TimerReset,
  },
] as const;

export default function LevelModeSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e14] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <GameButton variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </GameButton>

        <div className="mt-10 text-center">
          <h1 className="font-pixel text-2xl text-primary">SELECT A MODE</h1>
          <p className="font-pixel-body text-sm text-muted-foreground mt-3">Pick the kind of level you want to build before entering the editor.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => navigate('/editor', { state: { mode: mode.id } })}
                className={`border-2 p-8 text-left transition-transform hover:scale-[1.02] ${mode.accent}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-pixel text-lg text-foreground">{mode.title}</div>
                    <p className="font-pixel-body text-sm text-muted-foreground mt-4 leading-relaxed">{mode.description}</p>
                  </div>
                  <Icon className="h-10 w-10 text-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}