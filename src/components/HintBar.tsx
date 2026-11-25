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

    if (regA && regB && regA === regB) {
      return regA;
    }
    if (regA && regB && regA !== regB) {
      return `${regA} / ${regB}`;
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
      content: `${Math.round(border.lengthKm).toLocaleString()} km`,
      lockedLabel: '1 wrong guess',
    },
    {
      title: 'Extensions',
      icon: GitFork,
      unlocked: wrongGuessesCount >= 2 || isGameOver,
      content: `${border.contextStubs.length} adjacent lines`,
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
    <div className="w-full flex flex-col gap-2 font-mono text-xs sm:text-sm">
      <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-1 font-bold uppercase tracking-wider text-[11px] sm:text-xs text-black dark:text-zinc-300">
        <span>EXHIBITION DOSSIER // CARTOGRAPHIC NOTES</span>
        <span className="text-zinc-500">[ REVEALS PROGRESSIVELY ]</span>
      </div>

      {/* 2x2 Clean Grid: Generous width per card to eliminate clipping */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1">
        {hints.map((hint, idx) => {
          return (
            <div
              key={hint.title}
              className={`p-2.5 sm:p-3 border-2 flex flex-col justify-between gap-1.5 transition-all sharp-box ${
                hint.unlocked
                  ? 'border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 text-black dark:text-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 text-zinc-400 dark:text-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between uppercase font-bold text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                <span>0{idx + 1} / {hint.title}</span>
                {!hint.unlocked && <Lock className="w-3 h-3 shrink-0" />}
              </div>

              <div className="text-xs sm:text-sm font-bold leading-snug uppercase">
                {hint.unlocked ? (
                  <span className="text-black dark:text-zinc-100 font-bold break-words">{hint.content}</span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-600 font-normal text-[10px] sm:text-xs">[ {hint.lockedLabel} ]</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
