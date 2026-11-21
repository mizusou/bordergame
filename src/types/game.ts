export interface CountryInfo {
  name: string;
  isoA2: string;
  isoA3: string;
  continent: string;
  region: string;
}

export interface BorderEndpoint {
  coordinates: [number, number];
  type: 'coast' | 'tripoint';
  nearCountry?: string;
}

export interface BorderItem {
  id: string;
  countryA: CountryInfo;
  countryB: CountryInfo;
  lengthKm: number;
  midpoint: [number, number];
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  endpoints: BorderEndpoint[];
  sideAAnchor: [number, number];
  sideBAnchor: [number, number];
  contextStubs: Array<Array<[number, number]>>;
}

export interface GuessResult {
  country1: string;
  country2: string;
  isCorrect: boolean;
  halfMatch: 'none' | 'A' | 'B'; // Which country was a half-match, if any
  halfMatchCountry?: string;
  distanceKm: number; // Distance from guessed border/centroid to target midpoint
  bearingDeg: number;  // Bearing from guessed border/centroid to target midpoint
  compassDirection: string; // e.g. "NE", "SSW"
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>; // 1: count, 2: count, etc.
  lastPlayedDate?: string;
}

export interface DailyGameState {
  dateStr: string;
  dayNumber: number;
  borderId: string;
  guesses: GuessResult[];
  status: GameStatus;
  lockedCountry: string | null;
}
