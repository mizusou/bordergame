import React, { useState } from 'react';
import { BorderItem } from '../types/game.ts';
import { LeafletMap } from './LeafletMap.tsx';
import { GlobeView } from './GlobeView.tsx';
import { Map, Globe } from 'lucide-react';
import { formatCoordinates } from '../utils/geo.ts';

interface MapCanvasProps {
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'globe'>('map');

  return (
    <div className="relative isolate w-full h-[380px] sm:h-[440px] md:h-[480px] bg-[#0c0d12] rounded-3xl border border-zinc-800/80 overflow-hidden shadow-2xl transition-all">
      {/* View Mode Component: Real Leaflet Map or 3D Interactive Globe */}
      {viewMode === 'map' ? (
        <LeafletMap
          border={border}
          unlockedHints={unlockedHints}
          lockedCountry={lockedCountry}
          guessedCountries={guessedCountries}
          isGameOver={isGameOver}
          isWon={isWon}
        />
      ) : (
        <GlobeView
          border={border}
          lockedCountry={lockedCountry}
          guessedCountries={guessedCountries}
          isGameOver={isGameOver}
          isWon={isWon}
        />
      )}

      {/* TOP-LEFT: Clean Legend Pill & Coordinates */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5 pointer-events-none">
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

        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800/80 text-[10px] text-zinc-400 font-mono w-fit">
          {formatCoordinates(border.midpoint)}
        </div>
      </div>

      {/* TOP-CENTER: Mode Switcher [ Real Map ] | [ 3D Globe ] */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-1 shadow-md">
        <button
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'map'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Real Map</span>
        </button>

        <button
          onClick={() => setViewMode('globe')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'globe'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>3D Globe</span>
        </button>
      </div>

      {/* BOTTOM-LEFT: Scale & Length Info Pill */}
      {(unlockedHints >= 1 || isGameOver) && (
        <div className="absolute bottom-3.5 left-3.5 z-10 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] shadow-md flex items-center gap-2 pointer-events-none animate-fade-in">
          <span className="text-emerald-400 font-semibold font-mono">
            {border.lengthKm.toLocaleString()} km
          </span>
          <span className="text-zinc-500 font-mono text-[10px]">total length</span>
        </div>
      )}
    </div>
  );
};
