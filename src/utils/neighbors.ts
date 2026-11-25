import bordersData from '../data/borders.json';
import { BorderItem } from '../types/game.ts';
import { toRadians, toDegrees } from './geo.ts';

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
const countryLookupMap = new Map<string, CountryOption>();
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

// Populate lookup map (ISO codes first, then exact names so names always win)
for (const c of countryMap.values()) {
  if (c.isoA3) countryLookupMap.set(c.isoA3.toLowerCase(), c);
  if (c.isoA2) countryLookupMap.set(c.isoA2.toLowerCase(), c);
}
for (const c of countryMap.values()) {
  countryLookupMap.set(c.name.toLowerCase(), c);
}

// Compute spherical average center for each country
function sphericalMean(points: Array<[number, number]>): [number, number] {
  if (points.length === 0) return [0, 0];
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lon, lat] of points) {
    const phi = toRadians(lat);
    const lam = toRadians(lon);
    x += Math.cos(phi) * Math.cos(lam);
    y += Math.cos(phi) * Math.sin(lam);
    z += Math.sin(phi);
  }
  const norm = Math.hypot(x, y, z);
  if (norm < 1e-9) return points[0];
  const lon = toDegrees(Math.atan2(y, x));
  const lat = toDegrees(Math.atan2(z, Math.hypot(x, y)));
  return [lon, lat];
}

for (const [name, samples] of countryPointSamples.entries()) {
  countryMidpointMap.set(name, sphericalMean(samples));
}

export const allCountries: CountryOption[] = Array.from(countryMap.values()).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function resolveCountry(input: string): CountryOption | null {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  return countryLookupMap.get(key) || null;
}

export function resolveCountryName(input: string): string | null {
  return resolveCountry(input)?.name || null;
}

export function getLandNeighbors(countryName: string): string[] {
  const canonical = resolveCountryName(countryName);
  if (!canonical) return [];
  const neighbors = neighborMap.get(canonical);
  return neighbors ? Array.from(neighbors).sort() : [];
}

export function doShareLandBorder(c1: string, c2: string): boolean {
  const n1 = resolveCountryName(c1);
  const n2 = resolveCountryName(c2);
  if (!n1 || !n2) return false;
  return borderPairMap.has(makePairKey(n1, n2));
}

export function getBorderBetween(c1: string, c2: string): BorderItem | undefined {
  const n1 = resolveCountryName(c1);
  const n2 = resolveCountryName(c2);
  if (!n1 || !n2) return undefined;
  return borderPairMap.get(makePairKey(n1, n2));
}

export function getCountryMidpoint(countryName: string): [number, number] | null {
  const canonical = resolveCountryName(countryName);
  if (!canonical) return null;
  return countryMidpointMap.get(canonical) || null;
}

/**
 * Returns estimated midpoint for a guessed pair of countries:
 * If they share a border, returns that border's exact midpoint.
 * If not, returns the spherical midpoint between both countries' centers.
 */
export function getGuessedPairMidpoint(c1: string, c2: string): [number, number] {
  const border = getBorderBetween(c1, c2);
  if (border) {
    return border.midpoint;
  }
  const mid1 = getCountryMidpoint(c1);
  const mid2 = getCountryMidpoint(c2);
  if (mid1 && mid2) {
    return sphericalMean([mid1, mid2]);
  }
  return mid1 || mid2 || [0, 0];
}
