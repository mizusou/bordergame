import React from 'react';

interface HeaderProps {
  isDaily: boolean;
  dayNumber: number;
  lengthKm: number;
  isUnlockedLength: boolean;
  gameStatus: 'playing' | 'won' | 'lost';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleMode: () => void;
  onOpenHelp: () => void;
  onOpenStats: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDaily,
  dayNumber,
  lengthKm,
  isUnlockedLength,
  gameStatus,
  theme,
  onToggleTheme,
  onToggleMode,
  onOpenHelp,
  onOpenStats,
}) => {
  return (
    <header className="w-full">
      {/* Top Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black dark:border-zinc-400 pb-2.5 mb-3 sm:mb-4 text-xs sm:text-sm font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMode}
            className="px-3 py-1.5 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 font-bold hover:bg-black hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black transition-colors cursor-pointer sharp-box"
          >
            [ {isDaily ? `MODE: DAILY #${dayNumber}` : 'MODE: PRACTICE'} ]
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="px-3 py-1.5 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 font-bold hover:bg-black hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black transition-colors cursor-pointer sharp-box"
            title="Toggle Light/Dark Theme"
          >
            [ THEME: {theme === 'dark' ? 'DARK ☾' : 'LIGHT ☼'} ]
          </button>

          <button
            onClick={onOpenStats}
            className="px-3 py-1.5 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 font-bold hover:bg-black hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black transition-colors cursor-pointer sharp-box"
            title="Exhibition Records & Statistics"
          >
            [ STATS ]
          </button>

          <button
            onClick={onOpenHelp}
            className="px-3 py-1.5 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 font-bold hover:bg-black hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black transition-colors cursor-pointer sharp-box"
            title="Exhibition Dossier & Instructions"
          >
            [ DOSSIER / HELP ]
          </button>
        </div>
      </div>

      {/* Main Exhibition Masthead */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b-4 border-black dark:border-zinc-300">
        <div>
          <div className="text-xs sm:text-sm md:text-base font-mono font-bold tracking-widest text-[#d92626] dark:text-[#f87171] uppercase">
            {isDaily ? `GEOGRAPHY EXHIBITION NO. ${dayNumber}` : 'PRACTICE CARTOGRAPHIC EXHIBITION'}
          </div>
          <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight text-black dark:text-zinc-50 font-sans uppercase flex items-baseline leading-none mt-1">
            <span>FRONT</span>
            <span className="text-[#d92626] dark:text-[#f87171] px-1 sm:px-2 font-light">/</span>
            <span>IER</span>
          </div>
        </div>

        <div className="text-left sm:text-right font-mono text-xs sm:text-sm md:text-base text-black dark:text-zinc-300 sm:self-end leading-tight">
          <div className="font-bold tracking-wider uppercase text-zinc-600 dark:text-zinc-400">
            ISOLATED BOUNDARY ANALYSIS
          </div>
          <div className="font-bold text-[#d92626] dark:text-[#f87171] tracking-wider text-sm sm:text-lg my-0.5">
            {isUnlockedLength || gameStatus !== 'playing'
              ? `${lengthKm.toFixed(1)} KM LENGTH`
              : 'CLASSIFIED LENGTH'}
          </div>
          <div className="font-bold tracking-wider uppercase text-xs sm:text-sm">
            STATUS:{' '}
            <span
              className={
                gameStatus === 'won'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : gameStatus === 'lost'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-zinc-900 dark:text-zinc-200'
              }
            >
              {gameStatus === 'won'
                ? 'SOLVED'
                : gameStatus === 'lost'
                ? 'ARCHIVED'
                : 'UNRESOLVED'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
