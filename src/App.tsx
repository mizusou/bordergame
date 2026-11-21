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
import { GameOverModal } from './components/GameOverModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { HelpModal } from './components/HelpModal.tsx';

export default function App() {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const initialDaily = useMemo(() => getDailyBorder(todayStr), [todayStr]);

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
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);

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

  // When game is over on page reload or transition, open game over modal after brief delay
  useEffect(() => {
    if (currentStatus !== 'playing') {
      const timer = setTimeout(() => {
        setIsGameOverOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus]);

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
    setIsGameOverOpen(false);
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Header */}
      <Header
        isDaily={mode === 'daily'}
        dayNumber={getDayNumber(todayStr)}
        onToggleMode={handleToggleMode}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4">
        {/* Practice Mode Banner */}
        {mode === 'practice' && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-medium flex items-center justify-between shadow-sm animate-fade-in">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Practice Mode active</span>
            </span>
            <button
              onClick={handleStartPractice}
              className="text-emerald-300 hover:text-white font-semibold underline cursor-pointer"
            >
              Next Border →
            </button>
          </div>
        )}

        {/* Map Canvas */}
        <MapCanvas
          border={currentBorder}
          unlockedHints={wrongGuessesCount}
          lockedCountry={currentLockedCountry}
          guessedCountries={guessedCountriesList}
          isGameOver={currentStatus !== 'playing'}
          isWon={currentStatus === 'won'}
        />

        {/* Dual Input */}
        <GuessInput
          lockedCountry={currentLockedCountry}
          onMakeGuess={handleMakeGuess}
          disabled={currentStatus !== 'playing'}
          alreadyGuessedPairs={alreadyGuessedPairs}
        />

        {/* Hints Bar */}
        <HintBar
          border={currentBorder}
          wrongGuessesCount={wrongGuessesCount}
          isGameOver={currentStatus !== 'playing'}
        />

        {/* Guess History */}
        <GuessHistory guesses={currentGuesses} maxGuesses={6} />
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 py-4 px-4 text-center text-xs text-zinc-600">
        <span>BORDERLINE · 100% Client-Side GIS</span>
      </footer>

      {/* Modals */}
      <GameOverModal
        isOpen={isGameOverOpen}
        onClose={() => setIsGameOverOpen(false)}
        border={currentBorder}
        guesses={currentGuesses}
        isWon={currentStatus === 'won'}
        isDaily={mode === 'daily'}
        dayNumber={getDayNumber(todayStr)}
        onStartPractice={handleStartPractice}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={loadGameStats()}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
