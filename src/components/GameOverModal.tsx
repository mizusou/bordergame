import React, { useState, useEffect } from 'react';
import { BorderItem, GuessResult } from '../types/game.ts';
import { generateShareText, loadGameStats } from '../utils/storage.ts';
import { getTimeUntilMidnight } from '../utils/daily.ts';
import { Share2, Shuffle, Check, Clock, Eye, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-zinc-100">
        {/* Close Icon Top-Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Header */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-2">
          {isWon ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-1">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Solved!
              </h2>
              <p className="text-xs text-zinc-400">
                You identified the border in {guesses.length} of 6 guesses
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mb-1">
                <X className="w-6 h-6 stroke-[3]" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Game Over
              </h2>
              <p className="text-xs text-zinc-400">
                Out of attempts for today's border
              </p>
            </>
          )}
        </div>

        {/* Revealed Solution Box */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 text-center">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Shared Border
          </div>

          <div className="flex items-center justify-center gap-2 text-lg font-bold text-white flex-wrap">
            <span className="text-emerald-400">{border.countryA.name}</span>
            <span className="text-zinc-600 font-normal">&amp;</span>
            <span className="text-emerald-400">{border.countryB.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800 text-zinc-400 font-medium">
            <div>
              <span className="text-zinc-500 text-[11px] block">Length</span>
              <span className="text-zinc-200 font-mono font-semibold">
                {border.lengthKm.toLocaleString()} km
              </span>
            </div>
            <div>
              <span className="text-zinc-500 text-[11px] block">Region</span>
              <span className="text-zinc-200 font-semibold truncate block">
                {border.countryA.continent}
              </span>
            </div>
          </div>
        </div>

        {/* Wordle-style Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-zinc-950/50 border border-zinc-800/60 p-2.5 rounded-xl">
            <div className="text-lg font-bold text-white">{stats.gamesPlayed}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Played</div>
          </div>
          <div className="bg-zinc-950/50 border border-zinc-800/60 p-2.5 rounded-xl">
            <div className="text-lg font-bold text-white">
              {stats.gamesPlayed > 0
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                : 0}
              %
            </div>
            <div className="text-[10px] text-zinc-500 font-medium">Win %</div>
          </div>
          <div className="bg-zinc-950/50 border border-zinc-800/60 p-2.5 rounded-xl">
            <div className="text-lg font-bold text-emerald-400">{stats.currentStreak}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Streak</div>
          </div>
          <div className="bg-zinc-950/50 border border-zinc-800/60 p-2.5 rounded-xl">
            <div className="text-lg font-bold text-white">{stats.maxStreak}</div>
            <div className="text-[10px] text-zinc-500 font-medium">Max</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Results</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Map</span>
            </button>

            <button
              onClick={onStartPractice}
              className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Practice Mode</span>
            </button>
          </div>
        </div>

        {/* Countdown */}
        {isDaily && (
          <div className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5 border-t border-zinc-800/80 pt-3">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              Next daily border in:{' '}
              <strong className="text-zinc-200 font-mono font-semibold">
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
