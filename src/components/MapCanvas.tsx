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
    <div className="w-full h-full flex flex-col justify-between gap-3 font-mono">
      {/* Top Header Strip: [ FIGURE A.1 ] on left, region/coords on right */}
      <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 text-xs sm:text-sm font-bold uppercase">
        <span className="tracking-wider">[ FIGURE A.1 ]</span>
        <span className="text-zinc-600 dark:text-zinc-400 font-mono tracking-wider">
          {isGameOver ? formatCoordinates(border.midpoint) : '??°??\'?  ??°??\'?'}
        </span>
      </div>

      {/* Sharp Framed Map Viewport */}
      <div className="relative isolate w-full flex-1 min-h-[420px] sm:min-h-[480px] md:min-h-[540px] lg:min-h-[600px] xl:min-h-[660px] 2xl:min-h-[720px] border-2 border-black dark:border-zinc-400 bg-white dark:bg-[#0c0d12] overflow-hidden shadow-none">
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
        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
          <div className="bg-black text-white px-2.5 py-1 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase border border-black shadow-none">
            NORTH-UP PROJECTION
          </div>
        </div>
      </div>

      {/* Segmented Legend Box (Matching reference sheet) */}
      <div className="border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
            <span className="w-3 h-3 bg-[#d92626] border border-black dark:border-white inline-block"></span>
            <span>COAST ENDPOINT</span>
          </div>

          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
            <span className="w-3 h-3 bg-black dark:bg-white border border-black dark:border-zinc-300 inline-block"></span>
            <span>TRIPOINT LAND</span>
          </div>
        </div>

        {/* Total Length */}
        {(unlockedHints >= 1 || isGameOver) && (
          <div className="font-bold text-[#d92626] dark:text-[#f87171] text-xs sm:text-sm">
            {border.lengthKm.toFixed(1)} KM TOTAL
          </div>
        )}
      </div>
    </div>
  );
};
