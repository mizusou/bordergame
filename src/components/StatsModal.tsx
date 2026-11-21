import React from 'react';
import { GameStats } from '../types/game.ts';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-mono">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121318] border-4 border-black dark:border-zinc-300 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col gap-4 text-black dark:text-zinc-100 sharp-box">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 text-xs font-bold uppercase">
          <span className="text-[#d92626] dark:text-[#f87171] tracking-wider">
            [ EXHIBITION RECORDS &amp; METRICS ]
          </span>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
          >
            [ ✕ ]
          </button>
        </div>

        {/* 4 stats numbers */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-[#f4f3ee] dark:bg-zinc-900 sharp-box">
            <div className="text-xl font-black text-black dark:text-white">{stats.gamesPlayed}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Played</div>
          </div>

          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-[#f4f3ee] dark:bg-zinc-900 sharp-box">
            <div className="text-xl font-black text-black dark:text-white">{winRate}%</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Win %</div>
          </div>

          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-[#f4f3ee] dark:bg-zinc-900 sharp-box">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.currentStreak}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Streak</div>
          </div>

          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-[#f4f3ee] dark:bg-zinc-900 sharp-box">
            <div className="text-xl font-black text-black dark:text-white">{stats.maxStreak}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase">Max</div>
          </div>
        </div>

        {/* Guess Distribution Bar Chart */}
        <div className="flex flex-col gap-2 pt-2 border-t-2 border-black dark:border-zinc-400">
          <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-zinc-300">
            RECORDED ATTEMPTS DISTRIBUTION
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6].map((guessNum) => {
              const count = stats.guessDistribution[guessNum] || 0;
              const percent = Math.max(8, (count / maxDistributionCount) * 100);

              return (
                <div key={guessNum} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-black dark:text-zinc-300 font-mono font-bold text-right shrink-0">
                    0{guessNum}
                  </span>
                  <div className="flex-1 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 h-6 flex items-center p-0.5 sharp-box">
                    <div
                      className={`h-full flex items-center justify-end px-2 text-[10px] font-bold transition-all ${
                        count > 0
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'text-zinc-400 dark:text-zinc-600'
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
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 border-2 border-black dark:border-white bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-mono font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer sharp-box"
          >
            [ CLOSE DOSSIER ]
          </button>
        </div>
      </div>
    </div>
  );
};
