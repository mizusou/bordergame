import React from 'react';
import { GuessResult } from '../types/game.ts';
import { CheckCircle2, Navigation, Target } from 'lucide-react';

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
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 font-mono">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1.5 font-bold tracking-wider">
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span>RECON LOG</span>
        </span>
        <span className="text-[11px] text-slate-500">
          ATTEMPTS: {guesses.length} / {maxGuesses}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((guess, index) => {
          const slotNum = String(index + 1).padStart(2, '0');

          if (!guess) {
            return (
              <div
                key={`empty-${index}`}
                className="h-10 px-3 rounded-lg border border-slate-800/60 bg-slate-900/30 flex items-center justify-between text-xs text-slate-700 select-none"
              >
                <span className="font-bold text-slate-700">{slotNum}</span>
                <span className="text-[10px] tracking-widest text-slate-700/80">
                  --- AWAITING TELEMETRY ---
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
              className={`min-h-11 px-3 py-1.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs transition-all shadow-md animate-fade-in ${
                isCorrect
                  ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : halfMatch !== 'none'
                  ? 'border-cyan-500/50 bg-[#0a1526] text-slate-200'
                  : 'border-slate-800 bg-slate-900/80 text-slate-300'
              }`}
            >
              {/* Left: Slot number & Country Names */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-slate-500">{slotNum}</span>

                {/* Country 1 badge */}
                <span
                  className={`px-2 py-0.5 rounded font-medium tracking-wide ${
                    isCorrect || isC1Half
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {country1}
                </span>

                <span className="text-slate-600 font-bold">+</span>

                {/* Country 2 badge */}
                <span
                  className={`px-2 py-0.5 rounded font-medium tracking-wide ${
                    isCorrect || isC2Half
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {country2}
                </span>
              </div>

              {/* Right: Distance & Bearing Feedback */}
              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                {isCorrect ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>TARGET VERIFIED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs">
                    {/* Compass Needle pointing from guess midpoint to target */}
                    <div
                      className="flex items-center gap-1 text-cyan-400 font-semibold"
                      title={`Bearing: ${bearingDeg}° (${compassDirection})`}
                    >
                      <Navigation
                        className="w-3.5 h-3.5 text-cyan-400 transition-transform duration-500"
                        style={{
                          transform: `rotate(${bearingDeg}deg)`,
                        }}
                      />
                      <span>{compassDirection}</span>
                    </div>

                    <span className="text-slate-600">|</span>

                    {/* Geodesic Distance */}
                    <span className="text-slate-300 font-semibold">
                      {distanceKm.toLocaleString()} KM
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
