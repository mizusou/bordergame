import { DailyGameState, GameStats, GuessResult } from '../types/game.ts';

const STATS_KEY = 'borderline_game_stats_v1';
const DAILY_STATE_KEY = 'borderline_daily_state_v1';
const HAS_SEEN_TUTORIAL_KEY = 'borderline_tutorial_seen';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

export function loadGameStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          gamesPlayed: Number(parsed.gamesPlayed) || 0,
          gamesWon: Number(parsed.gamesWon) || 0,
          currentStreak: Number(parsed.currentStreak) || 0,
          maxStreak: Number(parsed.maxStreak) || 0,
          guessDistribution: {
            ...DEFAULT_STATS.guessDistribution,
            ...(parsed.guessDistribution && typeof parsed.guessDistribution === 'object'
              ? parsed.guessDistribution
              : {}),
          },
          lastPlayedDate:
            typeof parsed.lastPlayedDate === 'string' ? parsed.lastPlayedDate : undefined,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load stats', e);
  }
  return {
    ...DEFAULT_STATS,
    guessDistribution: { ...DEFAULT_STATS.guessDistribution },
  };
}

export function saveGameStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

function isPreviousCalendarDay(prevDateStr: string | undefined, currDateStr: string): boolean {
  if (!prevDateStr) return false;
  const [py, pm, pd] = prevDateStr.split('-').map(Number);
  const [cy, cm, cd] = currDateStr.split('-').map(Number);
  if (!py || !pm || !pd || !cy || !cm || !cd) return false;
  const prevMs = Date.UTC(py, pm - 1, pd);
  const currMs = Date.UTC(cy, cm - 1, cd);
  return Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24)) === 1;
}

export function recordGameResult(
  won: boolean,
  guessCount: number,
  dateStr: string
): GameStats {
  const stats = loadGameStats();
  if (stats.lastPlayedDate === dateStr) {
    return stats;
  }

  stats.gamesPlayed += 1;
  if (won) {
    stats.gamesWon += 1;
    stats.currentStreak = isPreviousCalendarDay(stats.lastPlayedDate, dateStr)
      ? stats.currentStreak + 1
      : 1;
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }
    stats.guessDistribution[guessCount] = (stats.guessDistribution[guessCount] || 0) + 1;
  } else {
    stats.currentStreak = 0;
  }
  stats.lastPlayedDate = dateStr;
  saveGameStats(stats);
  return stats;
}

export function loadDailyState(todayStr: string): DailyGameState | null {
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    if (raw) {
      const parsed: DailyGameState = JSON.parse(raw);
      if (parsed && parsed.dateStr === todayStr && Array.isArray(parsed.guesses)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load daily state', e);
  }
  return null;
}

export function saveDailyState(state: DailyGameState): void {
  try {
    localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save daily state', e);
  }
}

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(HAS_SEEN_TUTORIAL_KEY) === 'true';
}

export function setSeenTutorial(seen: boolean): void {
  localStorage.setItem(HAS_SEEN_TUTORIAL_KEY, seen ? 'true' : 'false');
}

/**
 * Generates Wordle-style spoiler-free share text
 */
export function generateShareText(
  dayNumber: number,
  guesses: GuessResult[],
  isWon: boolean
): string {
  const resultHeader = isWon ? `${guesses.length}/6` : 'X/6';
  const lines: string[] = [`FRONT / IER #${dayNumber} ${resultHeader}`];

  for (const g of guesses) {
    if (g.isCorrect) {
      lines.push('🟩🟩 🎯 SOLVED');
    } else if (g.halfMatch !== 'none') {
      const arrow = getCompassEmoji(g.bearingDeg);
      lines.push(`🟩⬛ ${arrow} ${g.distanceKm.toLocaleString()}km`);
    } else {
      const arrow = getCompassEmoji(g.bearingDeg);
      lines.push(`⬛⬛ ${arrow} ${g.distanceKm.toLocaleString()}km`);
    }
  }

  lines.push('');
  lines.push('Exhibition & boundary analysis at frontier.game');
  return lines.join('\n');
}

function getCompassEmoji(deg: number): string {
  // Map degrees to 8 directional emojis
  const normalized = (deg + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return '⬆️';
  if (normalized >= 22.5 && normalized < 67.5) return '↗️';
  if (normalized >= 67.5 && normalized < 112.5) return '➡️';
  if (normalized >= 112.5 && normalized < 157.5) return '↘️';
  if (normalized >= 157.5 && normalized < 202.5) return '⬇️';
  if (normalized >= 202.5 && normalized < 247.5) return '↙️';
  if (normalized >= 247.5 && normalized < 292.5) return '⬅️';
  return '↖️';
}
