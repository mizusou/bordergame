import React, { useState, useEffect } from 'react';
import { BorderItem, GuessResult } from '../types/game.ts';
import { generateShareText, loadGameStats } from '../utils/storage.ts';
import { getTimeUntilMidnight } from '../utils/daily.ts';
import { Share2, Check, Clock, ArrowRight } from 'lucide-react';

interface ResultsPanelProps {
  border: BorderItem;
  guesses: GuessResult[];
  isWon: boolean;
  isDaily: boolean;
  dayNumber: number;
  onStartPractice: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  border,
  guesses,
  isWon,
  isDaily,
  dayNumber,
  onStartPractice,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  useEffect(() => {
    if (!isDaily) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [isDaily]);

  const stats = loadGameStats();

  const handleShare = async () => {
    const text = generateShareText(dayNumber, guesses, isWon);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  return (
    <div className="w-full border-2 border-black dark:border-zinc-300 bg-white dark:bg-zinc-900 p-4 sm:p-5 flex flex-col gap-4 sharp-box animate-fade-in font-mono shadow-none">
      {/* Top Banner / Verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black dark:border-zinc-700 pb-3">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-[#d92626] dark:text-[#f87171] uppercase">
            {isDaily ? `OFFICIAL DOSSIER NO. ${dayNumber}` : 'PRACTICE DOSSIER RECORD'}
          </div>
          <div className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white font-sans mt-0.5">
            {isWon ? 'EXHIBITION SOLVED' : 'EXHIBITION ARCHIVED'}
          </div>
        </div>

        <div className="sm:text-right text-xs font-bold uppercase">
          <span
            className={`inline-block px-2.5 py-1 border-2 text-[11px] tracking-wider ${
              isWon
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'border-[#d92626] bg-red-50 dark:bg-red-950/40 text-[#d92626] dark:text-[#f87171]'
            }`}
          >
            {isWon
              ? `VERIFIED IN ${guesses.length} / 6 ATTEMPTS`
              : 'ALL 6 ATTEMPTS EXHAUSTED'}
          </span>
        </div>
      </div>

      {/* Authenticated Boundary Reveal Box */}
      <div className="border-2 border-black dark:border-zinc-400 bg-[#f4f3ee] dark:bg-zinc-950 p-3.5 sm:p-4 flex flex-col gap-2.5 sharp-box">
        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-black/20 dark:border-zinc-800 pb-1.5">
          <span>AUTHENTICATED SHARED BORDER</span>
          <span>{border.lengthKm.toFixed(1)} KM</span>
        </div>

        <div className="flex items-center gap-2 text-lg sm:text-2xl font-black uppercase text-black dark:text-white flex-wrap font-sans py-1">
          <span className="text-emerald-700 dark:text-emerald-400 tracking-tight">
            {border.countryA.name}
          </span>
          <span className="text-[#d92626] dark:text-[#f87171] font-light">&</span>
          <span className="text-emerald-700 dark:text-emerald-400 tracking-tight">
            {border.countryB.name}
          </span>
        </div>

        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-black/20 dark:border-zinc-800 text-[11px]">
          <span>REGION: <strong className="text-black dark:text-zinc-200">{border.countryA.region || border.countryA.continent}</strong></span>
          <span>•</span>
          <span>CONTINENT: <strong className="text-black dark:text-zinc-200">{border.countryA.continent}</strong></span>
        </div>
      </div>

      {/* Lifetime Stats Quick Bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border-2 border-black dark:border-zinc-500 p-2 bg-white dark:bg-zinc-900 sharp-box">
          <div className="text-base sm:text-lg font-black text-black dark:text-white">{stats.gamesPlayed}</div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase">Played</div>
        </div>
        <div className="border-2 border-black dark:border-zinc-500 p-2 bg-white dark:bg-zinc-900 sharp-box">
          <div className="text-base sm:text-lg font-black text-black dark:text-white">
            {stats.gamesPlayed > 0
              ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
              : 0}
            %
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase">Win %</div>
        </div>
        <div className="border-2 border-black dark:border-zinc-500 p-2 bg-white dark:bg-zinc-900 sharp-box">
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.currentStreak}</div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase">Streak</div>
        </div>
        <div className="border-2 border-black dark:border-zinc-500 p-2 bg-white dark:bg-zinc-900 sharp-box">
          <div className="text-base sm:text-lg font-black text-black dark:text-white">{stats.maxStreak}</div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase">Max</div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          onClick={handleShare}
          className="flex-1 py-3 px-4 border-2 border-black dark:border-white bg-[#d92626] hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer sharp-box transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>COPIED TO CLIPBOARD!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>SHARE RESULTS →</span>
            </>
          )}
        </button>

        <button
          onClick={onStartPractice}
          className="py-3 px-5 border-2 border-black dark:border-zinc-300 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer sharp-box transition-colors shrink-0"
        >
          <span>{isDaily ? 'PRACTICE MODE' : 'NEXT BOUNDARY'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Next Daily Countdown (Only if daily mode) */}
      {isDaily && (
        <div className="text-center text-[11px] text-zinc-600 dark:text-zinc-400 border-t-2 border-black dark:border-zinc-700 pt-2.5 flex items-center justify-center gap-1.5 uppercase font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Next Daily Exhibition in:{' '}
            <strong className="text-black dark:text-white font-bold">
              {String(countdown.hours).padStart(2, '0')}:
              {String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};
