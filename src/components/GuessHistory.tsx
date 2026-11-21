import React from 'react';
import { GuessResult } from '../types/game.ts';
import { Check, Navigation } from 'lucide-react';

interface GuessHistoryProps {
  guesses: GuessResult[];
  maxGuesses?: number;
}

export const GuessHistory: React.FC<GuessHistoryProps> = ({
  guesses,
  maxGuesses = 6,
}) => {
  const slots = Array.from({ length: maxGuesses }, (_, i) => guesses[i] || null);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
        <span>Guesses</span>
        <span className="font-mono text-zinc-500">
          {guesses.length} of {maxGuesses}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((guess, index) => {
          if (!guess) {
            return (
              <div
                key={`empty-${index}`}
                className="h-11 px-4 rounded-xl border border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between text-xs text-zinc-700 select-none font-mono"
              >
                <span className="font-semibold text-zinc-700">0{index + 1}</span>
                <span className="text-[11px] tracking-wider text-zinc-800 font-sans">
                  Empty
                </span>
                <span className="w-4" />
              </div>
            );
          }

          const {
            country1,
            country2,
            isCorrect,
            halfMatch,
            halfMatchCountry,
            distanceKm,
            bearingDeg,
            compassDirection,
          } = guess;

          const isC1Half =
            halfMatch === 'A' ||
            halfMatchCountry?.toLowerCase() === country1.toLowerCase();
          const isC2Half =
            halfMatch === 'B' ||
            halfMatchCountry?.toLowerCase() === country2.toLowerCase();

          return (
            <div
              key={`guess-${index}`}
              className={`min-h-12 px-3 sm:px-4 py-2 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs transition-all shadow-sm animate-fade-in ${
                isCorrect
                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-100 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                  : halfMatch !== 'none'
                  ? 'border-zinc-700 bg-zinc-900/90 text-zinc-200'
                  : 'border-zinc-800/90 bg-zinc-900/60 text-zinc-300'
              }`}
            >
              {/* Left: Slot number & Country Tiles (Wordle style) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-semibold text-zinc-500 w-5">
                  0{index + 1}
                </span>

                {/* Country 1 Tile */}
                <span
                  className={`px-3 py-1 rounded-lg font-medium text-xs tracking-tight shadow-sm transition-all ${
                    isCorrect || isC1Half
                      ? 'bg-emerald-600 text-white font-bold border border-emerald-500/80 shadow-emerald-950/50'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                  }`}
                >
                  {country1}
                </span>

                <span className="text-zinc-600 font-bold text-xs">+</span>

                {/* Country 2 Tile */}
                <span
                  className={`px-3 py-1 rounded-lg font-medium text-xs tracking-tight shadow-sm transition-all ${
                    isCorrect || isC2Half
                      ? 'bg-emerald-600 text-white font-bold border border-emerald-500/80 shadow-emerald-950/50'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                  }`}
                >
                  {country2}
                </span>
              </div>

              {/* Right: Telemetry / Direction & Distance Pill */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                {isCorrect ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Solved!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1 rounded-full text-xs font-mono">
                    <div
                      className="flex items-center gap-1 text-zinc-300 font-medium"
                      title={`Bearing: ${bearingDeg}° (${compassDirection})`}
                    >
                      <Navigation
                        className="w-3 h-3 text-emerald-400 transition-transform duration-500"
                        style={{
                          transform: `rotate(${bearingDeg}deg)`,
                        }}
                      />
                      <span>{compassDirection}</span>
                    </div>

                    <span className="text-zinc-600">·</span>

                    <span className="text-zinc-300 font-semibold">
                      {distanceKm.toLocaleString()} km
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
