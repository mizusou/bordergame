import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { BorderItem, GuessResult, GameStatus, DailyGameState } from './types/game.ts';
import {
  getDailyBorder,
  getRandomPracticeBorder,
  getTodayDateString,
  getDayNumber,
} from './utils/daily.ts';
import {
  calculateDistanceKm,
  calculateBearingDeg,
  bearingToCardinal,
} from './utils/geo.ts';
import { getGuessedPairMidpoint } from './utils/neighbors.ts';
import {
  loadDailyState,
  saveDailyState,
  loadGameStats,
  recordGameResult,
  hasSeenTutorial,
  setSeenTutorial,
} from './utils/storage.ts';

import { Header } from './components/Header.tsx';
import { MapCanvas } from './components/MapCanvas.tsx';
import { GuessInput } from './components/GuessInput.tsx';
import { GuessHistory } from './components/GuessHistory.tsx';
import { HintBar } from './components/HintBar.tsx';
import { ResultsPanel } from './components/ResultsPanel.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { HelpModal } from './components/HelpModal.tsx';

export default function App() {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const initialDaily = useMemo(() => getDailyBorder(todayStr), [todayStr]);

  // Theme: light | dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('frontier_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('frontier_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Mode: daily or practice
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');

  // Daily Game State
  const [dailyState, setDailyState] = useState<DailyGameState>(() => {
    const saved = loadDailyState(todayStr);
    if (saved && saved.borderId === initialDaily.border.id) {
      return saved;
    }
    return {
      dateStr: todayStr,
      dayNumber: initialDaily.dayNumber,
      borderId: initialDaily.border.id,
      guesses: [],
      status: 'playing',
      lockedCountry: null,
    };
  });

  // Practice State
  const [practiceBorder, setPracticeBorder] = useState<BorderItem>(() =>
    getRandomPracticeBorder(initialDaily.border.id)
  );
  const [practiceGuesses, setPracticeGuesses] = useState<GuessResult[]>([]);
  const [practiceStatus, setPracticeStatus] = useState<GameStatus>('playing');
  const [practiceLockedCountry, setPracticeLockedCountry] = useState<string | null>(null);

  // Active target border and game status
  const currentBorder = mode === 'daily' ? initialDaily.border : practiceBorder;
  const currentGuesses = mode === 'daily' ? dailyState.guesses : practiceGuesses;
  const currentStatus = mode === 'daily' ? dailyState.status : practiceStatus;
  const currentLockedCountry =
    mode === 'daily' ? dailyState.lockedCountry : practiceLockedCountry;

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  // First visit check
  useEffect(() => {
    if (!hasSeenTutorial()) {
      setIsHelpOpen(true);
      setSeenTutorial(true);
    }
  }, []);

  // Sync daily state to localStorage whenever it changes
  useEffect(() => {
    saveDailyState(dailyState);
  }, [dailyState]);

  // Trigger celebration confetti
  const triggerWinConfetti = useCallback(() => {
    try {
      const count = 180;
      const defaults = { origin: { y: 0.7 } };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch (e) {
      console.warn('Confetti error', e);
    }
  }, []);

  // Count wrong guesses for progressive hints (0..4)
  const wrongGuessesCount = useMemo(() => {
    return currentGuesses.filter((g) => !g.isCorrect).length;
  }, [currentGuesses]);

  // Handlers for guesses
  const handleMakeGuess = (c1Input: string, c2Input: string) => {
    if (currentStatus !== 'playing') return;

    const nameA = currentBorder.countryA.name;
    const nameB = currentBorder.countryB.name;

    const g1 = c1Input.trim();
    const g2 = c2Input.trim();

    // Check exact match (ignoring order)
    const isExact =
      (g1.toLowerCase() === nameA.toLowerCase() && g2.toLowerCase() === nameB.toLowerCase()) ||
      (g1.toLowerCase() === nameB.toLowerCase() && g2.toLowerCase() === nameA.toLowerCase());

    // Check half-match
    let halfMatch: 'none' | 'A' | 'B' = 'none';
    let halfMatchCountry: string | undefined = undefined;

    if (!isExact) {
      if (g1.toLowerCase() === nameA.toLowerCase() || g2.toLowerCase() === nameA.toLowerCase()) {
        halfMatch = 'A';
        halfMatchCountry = nameA;
      } else if (
        g1.toLowerCase() === nameB.toLowerCase() ||
        g2.toLowerCase() === nameB.toLowerCase()
      ) {
        halfMatch = 'B';
        halfMatchCountry = nameB;
      }
    }

    // Distance and bearing
    const guessMidpoint = getGuessedPairMidpoint(g1, g2);
    const distKm = calculateDistanceKm(guessMidpoint, currentBorder.midpoint);
    const bearing = calculateBearingDeg(guessMidpoint, currentBorder.midpoint);
    const direction = bearingToCardinal(bearing);

    const newGuess: GuessResult = {
      country1: g1,
      country2: g2,
      isCorrect: isExact,
      halfMatch,
      halfMatchCountry,
      distanceKm: distKm,
      bearingDeg: bearing,
      compassDirection: direction,
    };

    const nextGuesses = [...currentGuesses, newGuess];
    const isWon = isExact;
    const isLost = !isWon && nextGuesses.length >= 6;
    const nextStatus: GameStatus = isWon ? 'won' : isLost ? 'lost' : 'playing';

    const nextLockedCountry = currentLockedCountry || halfMatchCountry || null;

    if (mode === 'daily') {
      setDailyState((prev) => ({
        ...prev,
        guesses: nextGuesses,
        status: nextStatus,
        lockedCountry: nextLockedCountry,
      }));
      if (isWon || isLost) {
        recordGameResult(isWon, nextGuesses.length);
      }
    } else {
      setPracticeGuesses(nextGuesses);
      setPracticeStatus(nextStatus);
      setPracticeLockedCountry(nextLockedCountry);
    }

    if (isWon) {
      triggerWinConfetti();
    }
  };

  const handleToggleMode = () => {
    if (mode === 'daily') {
      setMode('practice');
    } else {
      setMode('daily');
    }
  };

  const handleStartPractice = () => {
    setMode('practice');
    setPracticeBorder(getRandomPracticeBorder(practiceBorder.id));
    setPracticeGuesses([]);
    setPracticeStatus('playing');
    setPracticeLockedCountry(null);
  };

  const alreadyGuessedPairs: Array<[string, string]> = useMemo(() => {
    return currentGuesses.map((g) => [g.country1, g.country2]);
  }, [currentGuesses]);

  const guessedCountriesList = useMemo(() => {
    const list: string[] = [];
    for (const g of currentGuesses) {
      if (g.isCorrect) {
        list.push(currentBorder.countryA.name, currentBorder.countryB.name);
      } else if (g.halfMatchCountry) {
        list.push(g.halfMatchCountry);
      }
    }
    return Array.from(new Set(list));
  }, [currentGuesses, currentBorder]);

  return (
    <div className="min-h-screen bg-[#edece6] dark:bg-[#0d0e11] text-black dark:text-zinc-100 p-2 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center transition-colors duration-200">
      {/* Exhibition Outer Sheet */}
      <div className="w-full max-w-[1600px] 2xl:max-w-[1780px] min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)] border-2 sm:border-4 border-black dark:border-zinc-300 bg-[#f4f3ee] dark:bg-[#121318] p-3 sm:p-6 lg:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col justify-between gap-4 sm:gap-6 sharp-box">
        {/* Exhibition Header */}
        <Header
          isDaily={mode === 'daily'}
          dayNumber={getDayNumber(todayStr)}
          lengthKm={currentBorder.lengthKm}
          isUnlockedLength={wrongGuessesCount >= 1}
          gameStatus={currentStatus}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onToggleMode={handleToggleMode}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
        />

        {/* Practice Mode Strip */}
        {mode === 'practice' && (
          <div className="border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono flex items-center justify-between font-bold uppercase sharp-box">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#d92626] dark:bg-[#f87171] inline-block animate-pulse"></span>
              <span>PRACTICE SESSION ACTIVE</span>
            </span>
            <button
              onClick={handleStartPractice}
              className="text-[#d92626] dark:text-[#f87171] hover:underline cursor-pointer"
            >
              [ NEXT BOUNDARY → ]
            </button>
          </div>
        )}

        {/* Exhibition Two-Column Work Grid (FIGURE A.1 on left, HYPOTHESIS SUBMISSION on right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-8 items-stretch my-1 sm:my-2">
          {/* Left Column: [ FIGURE A.1 ] Map & Segmented Legend */}
          <div className="w-full lg:col-span-7 flex flex-col justify-between h-full">
            <MapCanvas
              theme={theme}
              mode={mode}
              border={currentBorder}
              unlockedHints={wrongGuessesCount}
              lockedCountry={currentLockedCountry}
              guessedCountries={guessedCountriesList}
              isGameOver={currentStatus !== 'playing'}
              isWon={currentStatus === 'won'}
            />
          </div>

          {/* Right Column: [ HYPOTHESIS SUBMISSION / EXHIBITION DEBRIEF ] & Recordings */}
          <div className="w-full lg:col-span-5 flex flex-col justify-between h-full gap-4 font-mono">
            <div className="flex flex-col gap-4">
              {/* Header Strip */}
              <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 text-xs sm:text-sm font-bold uppercase">
                <span className="tracking-wider">
                  {currentStatus === 'playing'
                    ? '[ HYPOTHESIS SUBMISSION ]'
                    : '[ EXHIBITION DEBRIEF // OFFICIAL RECORD ]'}
                </span>
                <span
                  className={
                    currentStatus === 'won'
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : currentStatus === 'lost'
                      ? 'text-[#d92626] dark:text-[#f87171] font-bold'
                      : 'text-[#d92626] dark:text-[#f87171]'
                  }
                >
                  {currentStatus === 'playing'
                    ? `${currentGuesses.length} / 6 ATTEMPTS`
                    : currentStatus === 'won'
                    ? `[ SOLVED • ${currentGuesses.length}/6 ]`
                    : '[ UNRESOLVED • 6/6 ]'}
                </span>
              </div>

              {/* Active State: GuessInput during play, or In-Layout ResultsPanel when finished */}
              {currentStatus === 'playing' ? (
                <GuessInput
                  lockedCountry={currentLockedCountry}
                  onMakeGuess={handleMakeGuess}
                  disabled={false}
                  alreadyGuessedPairs={alreadyGuessedPairs}
                />
              ) : (
                <ResultsPanel
                  border={currentBorder}
                  guesses={currentGuesses}
                  isWon={currentStatus === 'won'}
                  isDaily={mode === 'daily'}
                  dayNumber={getDayNumber(todayStr)}
                  onStartPractice={handleStartPractice}
                />
              )}

              {/* Previous Recordings */}
              <GuessHistory guesses={currentGuesses} maxGuesses={6} />
            </div>

            {/* Progressive Notes / Hints */}
            <div className="mt-auto pt-2">
              <HintBar
                border={currentBorder}
                wrongGuessesCount={wrongGuessesCount}
                isGameOver={currentStatus !== 'playing'}
              />
            </div>
          </div>
        </div>

        {/* Bottom Exhibition Footer: NEUE TYPOGRAPHIE SYSTEM // 2026 EDITION */}
        <footer className="border-t-2 border-black dark:border-zinc-400 pt-3 text-xs font-mono flex items-center justify-between text-zinc-600 dark:text-zinc-400 uppercase font-bold mt-auto">
          <span>NEUE TYPOGRAPHIE SYSTEM</span>
          <span>CARTOGRAPHIC DIVISION // 2026 EDITION</span>
        </footer>
      </div>

      {/* Modals */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={loadGameStats()}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
