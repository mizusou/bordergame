import React from 'react';
import { HelpCircle, BarChart3, Shuffle, Calendar, Compass } from 'lucide-react';

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
    <header className="border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Tactical Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                <span>BORDERLINE</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-medium">
                  v2.0
                </span>
              </h1>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-tight hidden sm:block">
              CARTOGRAPHIC BORDER RECONNAISSANCE
            </p>
          </div>
        </div>

        {/* Center Mode Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-md p-1 font-mono text-xs">
          <button
            onClick={() => {
              if (!isDaily) onToggleMode();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
              isDaily
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Daily Mission (1 puzzle per day)"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-semibold">DAILY #{dayNumber}</span>
          </button>

          <button
            onClick={() => {
              if (isDaily) onToggleMode();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
              !isDaily
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Unlimited Practice Mode"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>PRACTICE</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenStats}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 font-mono text-xs flex items-center gap-1.5 transition-colors"
            title="Intelligence Statistics"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">INTEL</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 font-mono text-xs flex items-center gap-1.5 transition-colors"
            title="Mission Briefing & Rules"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">BRIEFING</span>
          </button>
        </div>
      </div>
    </header>
  );
};
