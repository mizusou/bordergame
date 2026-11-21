import React from 'react';
import { GameStats } from '../types/game.ts';
import { X, BarChart3, Award, Flame, Target } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#090f1d] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold tracking-wider text-slate-100">
              MISSION STATISTICS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High-level Metrics */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center">
            <Target className="w-3.5 h-3.5 text-slate-400 mb-1" />
            <div className="text-lg font-bold text-slate-100">{stats.gamesPlayed}</div>
            <div className="text-[9px] text-slate-500 font-medium">PLAYED</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center">
            <Award className="w-3.5 h-3.5 text-emerald-400 mb-1" />
            <div className="text-lg font-bold text-emerald-400">{winRate}%</div>
            <div className="text-[9px] text-slate-500 font-medium">WIN RATE</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center">
            <Flame className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <div className="text-lg font-bold text-amber-400">{stats.currentStreak}</div>
            <div className="text-[9px] text-slate-500 font-medium">CURRENT</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center">
            <Flame className="w-3.5 h-3.5 text-cyan-400 mb-1" />
            <div className="text-lg font-bold text-cyan-400">{stats.maxStreak}</div>
            <div className="text-[9px] text-slate-500 font-medium">MAX STREAK</div>
          </div>
        </div>

        {/* Guess Distribution Chart */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="text-xs font-bold text-slate-400 tracking-wider">
            GUESS DISTRIBUTION
          </div>

          <div className="flex flex-col gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const percent = Math.max(6, (count / maxDistributionCount) * 100);

              return (
                <div key={guessNum} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-slate-400 font-bold text-right">
                    {guessNum}
                  </span>
                  <div className="flex-1 bg-slate-900/90 rounded overflow-hidden h-5.5 flex items-center p-0.5 border border-slate-800/80">
                    <div
                      className={`h-full rounded flex items-center justify-end px-2 text-[10px] font-bold text-[#090f1d] transition-all duration-500 ${
                        count > 0
                          ? 'bg-cyan-500 shadow-sm'
                          : 'bg-slate-800 text-slate-500 w-6 justify-center'
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
          className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs tracking-wider transition-colors"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
