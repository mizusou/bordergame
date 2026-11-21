import { BorderItem } from '../types/game.ts';
import { allBorders } from './neighbors.ts';

// Anchor date for Day #1 (e.g., Jan 1, 2025)
const EPOCH_DATE = new Date(2025, 0, 1);

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayNumber(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  const diffTime = d.getTime() - EPOCH_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Deterministic shuffle of border indices using a fixed salt
const SHUFFLED_INDICES: number[] = (() => {
  const n = allBorders.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  // Linear congruential generator with fixed seed
  let seed = 424242;
  function nextRand() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
})();

export function getDailyBorder(dateStr: string = getTodayDateString()): {
  border: BorderItem;
  dayNumber: number;
} {
  const dayNum = getDayNumber(dateStr);
  const shuffledIndex = SHUFFLED_INDICES[dayNum % SHUFFLED_INDICES.length];
  return {
    border: allBorders[shuffledIndex],
    dayNumber: dayNum,
  };
}

export function getRandomPracticeBorder(excludeId?: string): BorderItem {
  const available = excludeId
    ? allBorders.filter((b) => b.id !== excludeId)
    : allBorders;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function getTimeUntilMidnight(): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}
