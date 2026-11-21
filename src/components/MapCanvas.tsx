import React from 'react';
import { BorderItem } from '../types/game.ts';
import { LeafletMap } from './LeafletMap.tsx';
import { formatCoordinates } from '../utils/geo.ts';

interface MapCanvasProps {
  theme: 'light' | 'dark';
  mode?: 'daily' | 'practice';
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  theme,
  mode = 'daily',
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  return (
    <div className="w-full h-full flex flex-col gap-2.5 sm:gap-3 font-mono">
      {/* Top Header Strip: [ FIGURE A.1 ] on left, region/coords on right */}
      <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 text-xs sm:text-sm font-bold uppercase shrink-0">
        <span className="tracking-wider">[ FIGURE A.1 ]</span>
        <span className="text-zinc-600 dark:text-zinc-400 font-mono tracking-wider">
          {isGameOver ? formatCoordinates(border.midpoint) : '??°??\'?  ??°??\'?'}
        </span>
      </div>

      {/* Sharp Framed Map Viewport - Expands to fill available vertical space without dead zones */}
      <div className="relative isolate w-full h-[260px] sm:h-[360px] lg:h-auto lg:flex-1 min-h-[260px] sm:min-h-[360px] lg:min-h-[480px] border-2 border-black dark:border-zinc-400 bg-white dark:bg-[#0c0d12] overflow-hidden shadow-none">
        {/* Real Map (Leaflet) */}
        <LeafletMap
          key={`${mode}-${border.id}-${theme}`}
          theme={theme}
          border={border}
          unlockedHints={unlockedHints}
          lockedCountry={lockedCountry}
          guessedCountries={guessedCountries}
          isGameOver={isGameOver}
          isWon={isWon}
        />

        {/* BOTTOM-LEFT: Sharp Box [ NORTH-UP PROJECTION ] */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-[1000] pointer-events-none">
          <div className="bg-black text-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-mono font-bold tracking-widest uppercase border border-black shadow-none">
            NORTH-UP PROJECTION
          </div>
        </div>
      </div>

      {/* Segmented Legend Box (Matching reference sheet) */}
      <div className="border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-none shrink-0">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#d92626] border border-black dark:border-white inline-block"></span>
            <span>COAST</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-black dark:bg-white border border-black dark:border-zinc-300 inline-block"></span>
            <span>TRIPOINT</span>
          </div>
        </div>

        {/* Total Length */}
        {(unlockedHints >= 1 || isGameOver) && (
          <div className="font-bold text-[#d92626] dark:text-[#f87171] text-[10px] sm:text-xs">
            {border.lengthKm.toFixed(1)} KM TOTAL
          </div>
        )}
      </div>
    </div>
  );
};
