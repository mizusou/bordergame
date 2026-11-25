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

  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
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
 * Finds the closest point [lon, lat] on a GeoJSON LineString or MultiLineString to a target [lon, lat]
 */
export function getClosestPointOnGeometry(
  geom: { type: string; coordinates: any },
  target: [number, number]
): [number, number] {
  const [targetLon, targetLat] = target;
  const cosLat = Math.max(0.1, Math.cos(toRadians(targetLat)));
  let closest: [number, number] = target;
  let minDistance = Infinity;

  const checkSegment = (p1: [number, number], p2: [number, number]) => {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const dx = (x2 - x1) * cosLat;
    const dy = y2 - y1;
    const tx = (targetLon - x1) * cosLat;
    const ty = targetLat - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const d = tx * tx + ty * ty;
      if (d < minDistance) {
        minDistance = d;
        closest = p1;
      }
      return;
    }

    let t = (tx * dx + ty * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projLon = x1 + t * (x2 - x1);
    const projLat = y1 + t * (y2 - y1);
    const dLon = (targetLon - projLon) * cosLat;
    const dLat = targetLat - projLat;
    const d = dLon * dLon + dLat * dLat;
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
