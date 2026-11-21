import bordersData from '../data/borders.json';
import { BorderItem } from '../types/game.ts';

const borders: BorderItem[] = bordersData as BorderItem[];

export const allBorders = borders;

// Map of unique countries
export interface CountryOption {
  name: string;
  isoA2: string;
  isoA3: string;
  continent: string;
  region: string;
}

const countryMap = new Map<string, CountryOption>();
const neighborMap = new Map<string, Set<string>>();
const borderPairMap = new Map<string, BorderItem>();
const countryMidpointMap = new Map<string, [number, number]>();
const countryPointSamples = new Map<string, Array<[number, number]>>();

function makePairKey(c1: string, c2: string): string {
  return [c1.toLowerCase(), c2.toLowerCase()].sort().join(':::');
}

// Build indexes
for (const b of borders) {
  const { countryA, countryB, midpoint, sideAAnchor, sideBAnchor } = b;

  if (!countryMap.has(countryA.name)) {
    countryMap.set(countryA.name, countryA);
  }
  if (!countryMap.has(countryB.name)) {
    countryMap.set(countryB.name, countryB);
  }

  // Neighbors
  if (!neighborMap.has(countryA.name)) neighborMap.set(countryA.name, new Set());
  if (!neighborMap.has(countryB.name)) neighborMap.set(countryB.name, new Set());
  neighborMap.get(countryA.name)!.add(countryB.name);
  neighborMap.get(countryB.name)!.add(countryA.name);

  // Border pair map
  borderPairMap.set(makePairKey(countryA.name, countryB.name), b);

  // Sample points for country centroid estimate
  if (!countryPointSamples.has(countryA.name)) countryPointSamples.set(countryA.name, []);
  if (!countryPointSamples.has(countryB.name)) countryPointSamples.set(countryB.name, []);
  countryPointSamples.get(countryA.name)!.push(sideAAnchor || midpoint);
  countryPointSamples.get(countryB.name)!.push(sideBAnchor || midpoint);
}

// Compute average center for each country
for (const [name, samples] of countryPointSamples.entries()) {
  const avgLon = samples.reduce((sum, p) => sum + p[0], 0) / samples.length;
  const avgLat = samples.reduce((sum, p) => sum + p[1], 0) / samples.length;
  countryMidpointMap.set(name, [avgLon, avgLat]);
}

export const allCountries: CountryOption[] = Array.from(countryMap.values()).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function getLandNeighbors(countryName: string): string[] {
  const neighbors = neighborMap.get(countryName);
  return neighbors ? Array.from(neighbors).sort() : [];
}

export function doShareLandBorder(c1: string, c2: string): boolean {
  return borderPairMap.has(makePairKey(c1, c2));
}

export function getBorderBetween(c1: string, c2: string): BorderItem | undefined {
  return borderPairMap.get(makePairKey(c1, c2));
}

export function getCountryMidpoint(countryName: string): [number, number] {
  return countryMidpointMap.get(countryName) || [0, 0];
}

/**
 * Returns estimated midpoint for a guessed pair of countries:
 * If they share a border, returns that border's exact midpoint.
 * If not, returns the midpoint between both countries' centers.
 */
export function getGuessedPairMidpoint(c1: string, c2: string): [number, number] {
  const border = getBorderBetween(c1, c2);
  if (border) {
    return border.midpoint;
  }
  const mid1 = getCountryMidpoint(c1);
  const mid2 = getCountryMidpoint(c2);
  return [(mid1[0] + mid2[0]) / 2, (mid1[1] + mid2[1]) / 2];
}
