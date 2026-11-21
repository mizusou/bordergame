import React from 'react';
import { BorderItem } from '../types/game.ts';
import { formatLatBand } from '../utils/geo.ts';
import { Lock, Ruler, GitFork, Globe, Compass } from 'lucide-react';

interface HintBarProps {
  border: BorderItem;
  wrongGuessesCount: number;
  isGameOver: boolean;
}

export const HintBar: React.FC<HintBarProps> = ({
  border,
  wrongGuessesCount,
  isGameOver,
}) => {
  const regionString = (() => {
    const cleanRegion = (r: string) => {
      const map: Record<string, string> = {
        'Eastern Africa': 'East Africa',
        'Western Africa': 'West Africa',
        'Northern Africa': 'North Africa',
        'Southern Africa': 'Southern Africa',
        'Middle Africa': 'Central Africa',
        'Western Europe': 'West Europe',
        'Eastern Europe': 'East Europe',
        'Northern Europe': 'North Europe',
        'Southern Europe': 'South Europe',
        'South-Eastern Asia': 'Southeast Asia',
        'Southern Asia': 'South Asia',
        'Western Asia': 'West Asia',
        'Eastern Asia': 'East Asia',
        'Central Asia': 'Central Asia',
        'South America': 'South America',
        'Central America': 'Central America',
        'Northern America': 'North America',
      };
      return map[r] || r;
    };

    const regA = cleanRegion(border.countryA.region);
    const regB = cleanRegion(border.countryB.region);

    if (regA && regA === regB) {
      return regA;
    }
    if (border.countryA.continent === border.countryB.continent) {
      return regA || regB || border.countryA.continent;
    }
    return `${border.countryA.continent} / ${border.countryB.continent}`;
  })();

  const latBandString = formatLatBand(border.midpoint[1]);

  const hints = [
    {
      title: 'Length',
      icon: Ruler,
      unlocked: wrongGuessesCount >= 1 || isGameOver,
      content: `${border.lengthKm.toLocaleString()} km`,
      lockedLabel: '1 wrong guess',
    },
    {
      title: 'Context',
      icon: GitFork,
      unlocked: wrongGuessesCount >= 2 || isGameOver,
      content: `${border.contextStubs.length} stubs visible`,
      lockedLabel: '2 wrong guesses',
    },
    {
      title: 'Region',
      icon: Globe,
      unlocked: wrongGuessesCount >= 3 || isGameOver,
      content: regionString,
      lockedLabel: '3 wrong guesses',
    },
    {
      title: 'Latitude',
      icon: Compass,
      unlocked: wrongGuessesCount >= 4 || isGameOver,
      content: latBandString,
      lockedLabel: '4 wrong guesses',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
        <span>Progressive Hints</span>
        <span className="text-[11px] text-zinc-500">Unlocks on wrong attempts</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {hints.map((hint) => {
          const Icon = hint.icon;
          return (
            <div
              key={hint.title}
              className={`p-3 min-h-[72px] rounded-2xl border flex flex-col justify-between gap-1 transition-all shadow-sm ${
                hint.unlocked
                  ? 'border-zinc-700 bg-zinc-900/90 text-zinc-100'
                  : 'border-zinc-800/60 bg-zinc-950/40 text-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{hint.title}</span>
                </span>
                {!hint.unlocked && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
              </div>

              <div className="text-xs font-medium leading-snug break-words">
                {hint.unlocked ? (
                  <span className="text-white font-semibold">{hint.content}</span>
                ) : (
                  <span className="text-zinc-600 text-[11px]">{hint.lockedLabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
