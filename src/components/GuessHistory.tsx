import React from 'react';
import { GuessResult } from '../types/game.ts';
import { Check, ArrowUp } from 'lucide-react';

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
    <div className="w-full flex flex-col gap-2 font-mono text-xs">
      {/* Section Header (Matching reference sheet) */}
      <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-1 font-bold uppercase tracking-wider text-[11px] text-black dark:text-zinc-300">
        <span>PREVIOUS RECORDINGS</span>
        <span className="text-zinc-500">
          {guesses.length} / {maxGuesses} SLOTS
        </span>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        {slots.map((guess, index) => {
          if (!guess) {
            return (
              <div
                key={`empty-${index}`}
                className="px-3 py-2 border-2 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 flex items-center justify-between text-zinc-400 dark:text-zinc-600 select-none sharp-box"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">0{index + 1} /</span>
                  <span className="tracking-widest">-----------------------------</span>
                </div>
                <span className="text-[10px] uppercase font-bold">[ PENDING ]</span>
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
              className={`px-3 py-2 border-2 flex items-center justify-between gap-2 transition-all sharp-box animate-fade-in ${
                isCorrect
                  ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                  : 'border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100'
              }`}
            >
              {/* Left: Slot number & Country Names */}
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <span className={`font-bold shrink-0 ${isCorrect ? 'text-white' : 'text-[#d92626] dark:text-[#f87171]'}`}>
                  0{index + 1} /
                </span>

                <div className="flex items-center gap-1.5 uppercase font-bold text-xs truncate">
                  <span
                    className={
                      !isCorrect && isC1Half
                        ? 'text-emerald-600 dark:text-emerald-400 underline decoration-2'
                        : ''
                    }
                  >
                    {country1}
                  </span>
                  <span className="opacity-50">+</span>
                  <span
                    className={
                      !isCorrect && isC2Half
                        ? 'text-emerald-600 dark:text-emerald-400 underline decoration-2'
                        : ''
                    }
                  >
                    {country2}
                  </span>
                </div>
              </div>

              {/* Right: Distance & Direction in brackets matching reference */}
              <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                {isCorrect ? (
                  <div className="flex items-center gap-1 uppercase font-bold text-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>[ SOLVED ]</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {distanceKm.toLocaleString()} km
                    </span>
                    <div
                      className="flex items-center gap-1 font-bold text-[#d92626] dark:text-[#f87171]"
                      title={`Bearing: ${bearingDeg}° (${compassDirection})`}
                    >
                      <ArrowUp
                        className="w-3.5 h-3.5 stroke-[2.5]"
                        style={{
                          transform: `rotate(${bearingDeg}deg)`,
                        }}
                      />
                      <span>[ {compassDirection} ]</span>
                    </div>
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
