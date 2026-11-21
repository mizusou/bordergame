import React, { useState, useEffect } from 'react';
import { BorderItem, GuessResult } from '../types/game.ts';
import { generateShareText, loadGameStats } from '../utils/storage.ts';
import { getTimeUntilMidnight } from '../utils/daily.ts';
import { Trophy, XCircle, Share2, Shuffle, Check, Clock, Eye } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#090f1d] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 font-mono text-slate-200">
        {/* Header Status */}
        <div className="flex flex-col items-center justify-center text-center gap-1.5 pt-1">
          {isWon ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-bounce">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-wider text-emerald-300">
                BORDER VERIFIED!
              </h2>
              <p className="text-xs text-slate-400">
                Target identified in {guesses.length} of 6 attempts
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <XCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-wider text-rose-400">
                MISSION FAILED
              </h2>
              <p className="text-xs text-slate-400">
                You exhausted all 6 recon attempts
              </p>
            </>
          )}
        </div>

        {/* Revealed Solution Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
          <div className="text-[10px] text-slate-500 font-bold tracking-wider text-center">
            TARGET BORDER LINE IDENTITY
          </div>

          <div className="flex items-center justify-center gap-2 text-base font-bold text-slate-100 flex-wrap text-center">
            <span className="text-emerald-400">{border.countryA.name}</span>
            <span className="text-slate-600 font-normal">⇌</span>
            <span className="text-emerald-400">{border.countryB.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80 text-slate-400">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500">LENGTH</span>
              <span className="font-semibold text-slate-200">
                {border.lengthKm.toLocaleString()} KM
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500">REGION</span>
              <span className="font-semibold text-slate-200 truncate">
                {border.countryA.continent}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs py-1">
          <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg">
            <div className="text-slate-400 text-[9px]">PLAYED</div>
            <div className="text-sm font-bold text-slate-100">{stats.gamesPlayed}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg">
            <div className="text-slate-400 text-[9px]">WIN %</div>
            <div className="text-sm font-bold text-slate-100">
              {stats.gamesPlayed > 0
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg">
            <div className="text-slate-400 text-[9px]">STREAK</div>
            <div className="text-sm font-bold text-cyan-400">{stats.currentStreak}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg">
            <div className="text-slate-400 text-[9px]">MAX</div>
            <div className="text-sm font-bold text-slate-100">{stats.maxStreak}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#090f1d] font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-950 font-bold" />
                <span>COPIED TO CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>SHARE RESULTS</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>INSPECT MAP</span>
            </button>

            <button
              onClick={onStartPractice}
              className="flex-1 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/40 text-purple-300 font-semibold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>PRACTICE MODE</span>
            </button>
          </div>
        </div>

        {/* Daily Countdown */}
        {isDaily && (
          <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              NEXT DAILY IN:{' '}
              <strong className="text-slate-300">
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
