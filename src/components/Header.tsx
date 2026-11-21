import React from 'react';
import { HelpCircle, BarChart2, Dices, Calendar } from 'lucide-react';

interface HeaderProps {
  isDaily: boolean;
  dayNumber: number;
  onToggleMode: () => void;
  onOpenHelp: () => void;
  onOpenStats: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDaily,
  dayNumber,
  onToggleMode,
  onOpenHelp,
  onOpenStats,
}) => {
  return (
    <header className="border-b border-zinc-800/70 bg-[#09090b]/90 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Mode Toggle & Info */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isDaily
                ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-sm'
                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {isDaily ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Daily #{dayNumber}</span>
              </>
            ) : (
              <>
                <Dices className="w-3.5 h-3.5 text-emerald-400" />
                <span>Practice Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Iconic Wordle-style Title */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans flex items-center justify-center gap-1">
            <span>BORDERLINE</span>
          </h1>
        </div>

        {/* Right: Modern Actions (Stats & How to Play) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenStats}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Statistics"
            aria-label="Statistics"
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHelp}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="How to Play"
            aria-label="How to Play"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
