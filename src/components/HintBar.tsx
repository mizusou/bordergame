import React from 'react';
import { BorderItem } from '../types/game.ts';
import { formatLatBand } from '../utils/geo.ts';
import { Lock, Ruler, GitFork, Globe, Compass } from 'lucide-react';

interface HintBarProps {
  border: BorderItem;
  wrongGuessesCount: number; // 0..6
  isGameOver: boolean;
}

export const HintBar: React.FC<HintBarProps> = ({
  border,
  wrongGuessesCount,
  isGameOver,
}) => {
  // Region/Continent string: if both in same continent, show continent, else continent1 / continent2
  const regionString = (() => {
    if (border.countryA.continent === border.countryB.continent) {
      return `${border.countryA.continent} (${border.countryA.region || border.countryB.region})`;
    }
    return `${border.countryA.continent} / ${border.countryB.continent}`;
  })();

  const latBandString = formatLatBand(border.midpoint[1]);

  const hints = [
    {
      level: 1,
      title: 'BORDER LENGTH',
      icon: Ruler,
      unlocked: wrongGuessesCount >= 1 || isGameOver,
      content: `${border.lengthKm.toLocaleString()} KM`,
      lockedLabel: '1 WRONG GUESS',
    },
    {
      level: 2,
      title: 'CONTEXT STUBS',
      icon: GitFork,
      unlocked: wrongGuessesCount >= 2 || isGameOver,
      content: `${border.contextStubs.length} STUBS SHOWN ON MAP`,
      lockedLabel: '2 WRONG GUESSES',
    },
    {
      level: 3,
      title: 'REGION / CONTINENT',
      icon: Globe,
      unlocked: wrongGuessesCount >= 3 || isGameOver,
      content: regionString,
      lockedLabel: '3 WRONG GUESSES',
    },
    {
      level: 4,
      title: 'COORDINATE BAND',
      icon: Compass,
      unlocked: wrongGuessesCount >= 4 || isGameOver,
      content: latBandString,
      lockedLabel: '4 WRONG GUESSES',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-1.5 font-mono">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>PROGRESSIVE INTEL</span>
        </span>
        <span className="text-[10px] text-slate-500">
          AUTOMATICALLY UNLOCKED AS YOU GUESS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {hints.map((hint) => {
          const Icon = hint.icon;
          return (
            <div
              key={hint.title}
              className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 transition-all ${
                hint.unlocked
                  ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200 shadow-sm'
                  : 'border-slate-800/80 bg-slate-900/40 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <span>{hint.title}</span>
                </span>
                {!hint.unlocked && <Lock className="w-2.5 h-2.5 text-slate-600" />}
              </div>

              <div className="text-[11px] font-semibold tracking-wide truncate">
                {hint.unlocked ? (
                  <span className="text-cyan-300 font-bold">{hint.content}</span>
                ) : (
                  <span className="text-slate-600 text-[10px] tracking-tight">
                    {hint.lockedLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
