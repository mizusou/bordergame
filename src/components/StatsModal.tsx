import React from 'react';
import { GameStats } from '../types/game.ts';
import { X, BarChart2 } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  if (!isOpen) return null;

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const maxDistributionCount = Math.max(
    1,
    ...Object.values(stats.guessDistribution)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold tracking-tight text-white">
              Statistics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wordle-style 4 stats numbers */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-2xl">
            <div className="text-xl font-bold text-white">{stats.gamesPlayed}</div>
            <div className="text-[11px] text-zinc-500 font-medium">Played</div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-2xl">
            <div className="text-xl font-bold text-white">{winRate}%</div>
            <div className="text-[11px] text-zinc-500 font-medium">Win %</div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-2xl">
            <div className="text-xl font-bold text-emerald-400">{stats.currentStreak}</div>
            <div className="text-[11px] text-zinc-500 font-medium">Streak</div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/60 p-3 rounded-2xl">
            <div className="text-xl font-bold text-white">{stats.maxStreak}</div>
            <div className="text-[11px] text-zinc-500 font-medium">Max</div>
          </div>
        </div>

        {/* Guess Distribution Bar Chart */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="text-xs font-semibold text-zinc-400">
            Guess Distribution
          </div>

          <div className="flex flex-col gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const percent = Math.max(7, (count / maxDistributionCount) * 100);

              return (
                <div key={guessNum} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-zinc-400 font-mono font-semibold text-right">
                    {guessNum}
                  </span>
                  <div className="flex-1 bg-zinc-950/80 rounded-lg overflow-hidden h-6 flex items-center p-0.5 border border-zinc-800/80">
                    <div
                      className={`h-full rounded-md flex items-center justify-end px-2 text-[11px] font-bold text-white transition-all duration-500 ${
                        count > 0
                          ? 'bg-emerald-600 shadow-sm'
                          : 'bg-zinc-800 text-zinc-500 w-6 justify-center'
                      }`}
                      style={{ width: `${percent}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
