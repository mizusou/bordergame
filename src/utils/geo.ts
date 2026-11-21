/**
 * Geodesic and projection utility functions
 */

const R_EARTH_KM = 6371.0088;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates geodesic distance between two [lon, lat] points in km using Haversine formula
 */
export function calculateDistanceKm(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R_EARTH_KM * c);
}

/**
 * Computes forward azimuth/bearing in degrees (0..360, where 0 is North)
 * from point1 to point2
 */
export function calculateBearingDeg(
  fromPoint: [number, number],
  toPoint: [number, number]
): number {
  const [lon1, lat1] = fromPoint;
  const [lon2, lat2] = toPoint;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (toDegrees(theta) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Converts degrees into 16-point cardinal direction string
 */
export function bearingToCardinal(bearingDeg: number): string {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(bearingDeg / 22.5) % 16;
  return directions[index];
}

/**
 * Format [lon, lat] into cartographic coordinates string (e.g. 42°50'N 00°21'W)
 */
export function formatCoordinates(coord: [number, number]): string {
  const [lon, lat] = coord;
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);

  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);

  const lonDeg = Math.floor(absLon);
  const lonMin = Math.floor((absLon - lonDeg) * 60);

  return `${latDeg}°${latMin.toString().padStart(2, '0')}'${latDir} ${lonDeg}°${lonMin.toString().padStart(2, '0')}'${lonDir}`;
}

/**
 * Format lat band into a progressive hint string
 */
export function formatLatBand(lat: number): string {
  const hemi = lat >= 0 ? 'Northern Hemisphere' : 'Southern Hemisphere';
  const roundedLat = Math.round(Math.abs(lat));
  return `${hemi} • ~${roundedLat}°${lat >= 0 ? 'N' : 'S'}`;
}

/**
 * Scale bar calculation: returns pixel width for a round km distance (e.g. 100km, 250km, 500km)
 */
export function calculateScaleBar(
  midpoint: [number, number],
  projection: (coord: [number, number]) => [number, number] | null
): { km: number; pixelWidth: number } {
  const centerPx = projection(midpoint);
  if (!centerPx) return { km: 100, pixelWidth: 60 };

  // Calculate 100km offset east
  const deltaLon = 100 / (111.32 * Math.cos(toRadians(midpoint[1])));
  const offsetEast: [number, number] = [midpoint[0] + deltaLon, midpoint[1]];
  const offsetPx = projection(offsetEast);

  if (!offsetPx) return { km: 100, pixelWidth: 60 };

  const pxFor100Km = Math.hypot(offsetPx[0] - centerPx[0], offsetPx[1] - centerPx[1]);

  // Choose a clean display distance (25, 50, 100, 200, 500, 1000)
  const candidateKm = [25, 50, 100, 200, 500, 1000];
  let bestKm = 100;
  let bestWidth = pxFor100Km;

  for (const km of candidateKm) {
    const width = (km / 100) * pxFor100Km;
    if (width >= 60 && width <= 180) {
      bestKm = km;
      bestWidth = width;
      break;
    }
  }

  return { km: bestKm, pixelWidth: Math.round(bestWidth) };
}
