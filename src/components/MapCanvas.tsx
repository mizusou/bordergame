import React from 'react';
import { BorderItem } from '../types/game.ts';
import { LeafletMap } from './LeafletMap.tsx';
import { formatCoordinates } from '../utils/geo.ts';

interface MapCanvasProps {
  mode?: 'daily' | 'practice';
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  mode = 'daily',
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  return (
    <div className="relative isolate w-full h-[380px] sm:h-[440px] md:h-[480px] bg-[#0c0d12] rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl transition-all">
      {/* Real Map (Leaflet) */}
      <LeafletMap
        key={`${mode}-${border.id}`}
        border={border}
        unlockedHints={unlockedHints}
        lockedCountry={lockedCountry}
        guessedCountries={guessedCountries}
        isGameOver={isGameOver}
        isWon={isWon}
      />

      {/* TOP-LEFT: Subtle Coordinates Pill */}
      <div className="absolute top-3.5 left-3.5 z-[1000] pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800/80 text-[10px] text-zinc-400 font-mono shadow-sm">
          {formatCoordinates(border.midpoint)}
        </div>
      </div>

      {/* BOTTOM-LEFT: Endpoint Legend & Border Length Pill */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] flex flex-wrap items-center gap-2 pointer-events-none">
        {/* Endpoint Legend */}
        <div className="flex items-center gap-2.5 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 text-[11px] text-zinc-300 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-300 inline-block shadow-sm" />
            <span className="font-medium text-zinc-300">Coastline</span>
          </div>
          <span className="text-zinc-600">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-400 bg-zinc-900 inline-block" />
            <span className="font-medium text-zinc-300">Tripoint</span>
          </div>
        </div>

        {/* Total Length (Unlocked after 1 guess or on game over) */}
        {(unlockedHints >= 1 || isGameOver) && (
          <div className="bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 text-[11px] shadow-md flex items-center gap-1.5 animate-fade-in">
            <span className="text-emerald-400 font-semibold font-mono">
              {border.lengthKm.toLocaleString()} km
            </span>
            <span className="text-zinc-500 text-[10px] font-mono">total</span>
          </div>
        )}
      </div>
    </div>
  );
};
