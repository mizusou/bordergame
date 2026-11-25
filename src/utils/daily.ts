import { BorderItem } from '../types/game.ts';
import { allBorders } from './neighbors.ts';

const EASTERN_TIMEZONE = 'America/New_York';

// Nov 11, 2026 is Day 0 (Nov 12, 2026 = Day #1, Nov 20, 2026 = Day #9)
const EPOCH_UTC_MS = Date.UTC(2026, 10, 11);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const easternFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EASTERN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getEasternParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = easternFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

export function getTodayDateString(date: Date = new Date()): string {
  const { year, month, day } = getEasternParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDayNumber(dateStr: string = getTodayDateString()): number {
  const [y, m, day] = dateStr.split('-').map(Number);
  const targetUtcMs = Date.UTC(y, m - 1, day);
  const diffDays = Math.round((targetUtcMs - EPOCH_UTC_MS) / MS_PER_DAY);
  return Math.max(1, diffDays);
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
  const shuffledIndex = SHUFFLED_INDICES[(dayNum - 1) % SHUFFLED_INDICES.length];
  return {
    border: allBorders[shuffledIndex],
    dayNumber: dayNum,
  };
}

export function getRandomPracticeBorder(excludeId?: string): BorderItem {
  const available = excludeId
    ? allBorders.filter((b) => b.id !== excludeId)
    : allBorders;
  const pool = available.length > 0 ? available : allBorders;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function getTimeUntilMidnight(now: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const { year, month, day, hour, minute, second } = getEasternParts(now);
  const nyNowAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetNowMs = nyNowAsUtc - now.getTime();
  const tomorrowMidnightAsUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

  let targetUtcMs = tomorrowMidnightAsUtc - offsetNowMs;
  // Refine once in case a DST transition occurs between now and Eastern midnight
  const pTarget = getEasternParts(new Date(targetUtcMs));
  const targetAsUtc = Date.UTC(
    pTarget.year,
    pTarget.month - 1,
    pTarget.day,
    pTarget.hour,
    pTarget.minute,
    pTarget.second
  );
  const offsetAtTargetMs = targetAsUtc - targetUtcMs;
  targetUtcMs = tomorrowMidnightAsUtc - offsetAtTargetMs;

  const diffMs = Math.max(0, targetUtcMs - now.getTime());
  const totalSeconds = Math.ceil(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}
