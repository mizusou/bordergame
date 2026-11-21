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
 * Format lat band into a concise progressive hint string (e.g. ~5°N (North))
 */
export function formatLatBand(lat: number): string {
  const hemiWord = lat >= 0 ? 'North' : 'South';
  const hemiDir = lat >= 0 ? 'N' : 'S';
  const roundedLat = Math.round(Math.abs(lat));
  return `~${roundedLat}°${hemiDir} (${hemiWord})`;
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

/**
 * Finds the closest point [lon, lat] on a GeoJSON LineString or MultiLineString to a target [lon, lat]
 */
export function getClosestPointOnGeometry(
  geom: { type: string; coordinates: any },
  target: [number, number]
): [number, number] {
  const [targetLon, targetLat] = target;
  let closest: [number, number] = target;
  let minDistance = Infinity;

  const checkSegment = (p1: [number, number], p2: [number, number]) => {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const d = (targetLon - x1) ** 2 + (targetLat - y1) ** 2;
      if (d < minDistance) {
        minDistance = d;
        closest = p1;
      }
      return;
    }

    let t = ((targetLon - x1) * dx + (targetLat - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projLon = x1 + t * dx;
    const projLat = y1 + t * dy;
    const d = (targetLon - projLon) ** 2 + (targetLat - projLat) ** 2;
    if (d < minDistance) {
      minDistance = d;
      closest = [projLon, projLat];
    }
  };

  if (geom.type === 'LineString') {
    const coords = geom.coordinates as Array<[number, number]>;
    for (let i = 0; i < coords.length - 1; i++) {
      checkSegment(coords[i], coords[i + 1]);
    }
  } else if (geom.type === 'MultiLineString') {
    const lines = geom.coordinates as Array<Array<[number, number]>>;
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        checkSegment(line[i], line[i + 1]);
      }
    }
  }

  return closest;
}
