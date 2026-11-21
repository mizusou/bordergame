import React, { useState, useEffect } from 'react';
import { BorderItem, GuessResult } from '../types/game.ts';
import { generateShareText, loadGameStats } from '../utils/storage.ts';
import { getTimeUntilMidnight } from '../utils/daily.ts';
import { Share2, Check, Clock } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  border: BorderItem;
  guesses: GuessResult[];
  isWon: boolean;
  isDaily: boolean;
  dayNumber: number;
  onStartPractice: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
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
    if (!isOpen || !isDaily) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isDaily]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-mono">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121318] border-4 border-black dark:border-zinc-300 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col gap-4 text-black dark:text-zinc-100 sharp-box">
        {/* Top Header Strip */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 text-xs font-bold uppercase">
          <span className="text-[#d92626] dark:text-[#f87171] tracking-wider">
            [ EXHIBITION SUMMARY // NO. {dayNumber} ]
          </span>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
          >
            [ ✕ ]
          </button>
        </div>

        {/* Status Header */}
        <div className="flex flex-col items-center text-center gap-1 pt-1">
          <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black dark:text-white font-sans">
            {isWon ? 'EXHIBITION SOLVED' : 'EXHIBITION ARCHIVED'}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase">
            {isWon
              ? `Boundary verified in ${guesses.length} of 6 attempts`
              : 'All 6 analytical attempts exhausted'}
          </p>
        </div>

        {/* Revealed Solution Box */}
        <div className="border-2 border-black dark:border-zinc-400 bg-[#f4f3ee] dark:bg-zinc-900 p-3.5 flex flex-col gap-2 text-center sharp-box">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            AUTHENTICATED SHARED BORDER
          </div>

          <div className="flex items-center justify-center gap-2 text-base sm:text-lg font-black uppercase text-black dark:text-white flex-wrap font-sans">
            <span className="text-emerald-700 dark:text-emerald-400">{border.countryA.name}</span>
            <span className="text-[#d92626] dark:text-[#f87171]">&amp;</span>
            <span className="text-emerald-700 dark:text-emerald-400">{border.countryB.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t-2 border-black dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold uppercase">
            <div>
              <span className="text-[10px] block opacity-70">Length</span>
              <span className="text-black dark:text-white font-bold">
                {border.lengthKm.toFixed(1)} km
              </span>
            </div>
            <div>
              <span className="text-[10px] block opacity-70">Continent</span>
              <span className="text-black dark:text-white font-bold truncate block">
                {border.countryA.continent}
              </span>
            </div>
          </div>
        </div>

        {/* Exhibition Stats Table */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-white dark:bg-zinc-900 sharp-box">
            <div className="text-base font-black text-black dark:text-white">{stats.gamesPlayed}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase">Played</div>
          </div>
          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-white dark:bg-zinc-900 sharp-box">
            <div className="text-base font-black text-black dark:text-white">
              {stats.gamesPlayed > 0
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                : 0}
              %
            </div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase">Win %</div>
          </div>
          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-white dark:bg-zinc-900 sharp-box">
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.currentStreak}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase">Streak</div>
          </div>
          <div className="border-2 border-black dark:border-zinc-400 p-2 bg-white dark:bg-zinc-900 sharp-box">
            <div className="text-base font-black text-black dark:text-white">{stats.maxStreak}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase">Max</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleShare}
            className="w-full py-2.5 border-2 border-black dark:border-white bg-[#d92626] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer sharp-box transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>SHARE DOSSIER →</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="py-2 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold text-xs uppercase transition-colors cursor-pointer sharp-box"
            >
              [ INSPECT MAP ]
            </button>

            <button
              onClick={onStartPractice}
              className="py-2 border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black font-bold text-xs uppercase transition-colors cursor-pointer sharp-box"
            >
              [ PRACTICE MODE ]
            </button>
          </div>
        </div>

        {/* Next Border Countdown */}
        {isDaily && (
          <div className="text-center text-[11px] text-zinc-600 dark:text-zinc-400 border-t-2 border-black dark:border-zinc-700 pt-2 flex items-center justify-center gap-1.5 uppercase font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Next Exhibition in:{' '}
              <strong className="text-black dark:text-white font-bold">
                {String(countdown.hours).padStart(2, '0')}:
                {String(countdown.minutes).padStart(2, '0')}:
                {String(countdown.seconds).padStart(2, '0')}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
