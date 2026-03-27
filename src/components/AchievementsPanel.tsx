import { useState } from 'react';
import { useSteamAchievements } from '@/hooks/useSteamAchievements';
import { GameButton } from '@/components/ui/GameButton';
import { Trophy, X } from 'lucide-react';

export default function AchievementsPanel() {
  const { achievements, stats, loading } = useSteamAchievements();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Achievements Button */}
      {!isOpen && (
        <GameButton
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative"
          title="View achievements"
        >
          <Trophy size={16} />
          {stats.unlocked > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs px-1.5 py-0.5 font-pixel border border-amber-700">
              {stats.unlocked}
            </span>
          )}
        </GameButton>
      )}

      {/* Achievements Panel */}
      {isOpen && (
        <div className="bg-amber-950/95 border-2 border-amber-800 w-80 max-h-96 flex flex-col pixel-border p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-800">
            <h3 className="font-pixel text-amber-100 flex items-center gap-2">
              <Trophy size={14} />
              Achievements
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-amber-400 hover:text-amber-300"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mb-3 p-2 bg-amber-900/50 border border-amber-800 text-xs font-pixel text-amber-100">
            <div className="flex justify-between mb-1">
              <span>Progress</span>
              <span>{stats.unlocked}/{stats.total}</span>
            </div>
            <div className="w-full bg-black border border-amber-700 h-3">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <div className="text-center mt-1 text-amber-300">{stats.percentage}%</div>
          </div>

          {/* Achievements List */}
          <div className="overflow-y-auto flex-1 space-y-1">
            {achievements.map(achievement => (
              <div
                key={achievement.id}
                className={`p-2 border border-amber-700 cursor-pointer transition-colors ${
                  achievement.unlocked
                    ? 'bg-amber-900/60 hover:bg-amber-800/60'
                    : 'bg-black/40 hover:bg-black/60 opacity-60'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixel text-xs text-amber-100 leading-tight">
                      {achievement.name}
                    </p>
                    <p className="font-pixel-body text-xs text-amber-300/70 leading-tight">
                      {achievement.description}
                    </p>
                    {achievement.unlocked && achievement.unlockedTime && (
                      <p className="font-pixel-body text-xs text-emerald-400 mt-1">
                        Unlocked {new Date(achievement.unlockedTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
