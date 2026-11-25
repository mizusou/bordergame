import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BorderItem } from '../types/game.ts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getClosestPointOnGeometry } from '../utils/geo.ts';
import { getLandNeighbors } from '../utils/neighbors.ts';

let cachedWorldReveal: GeoJSON.FeatureCollection | null = null;

function computeRingSignedAreaAndCentroid(
  ring: Array<[number, number]>
): { absArea: number; centroid: [number, number] } {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  const area = signedArea * 0.5;
  if (Math.abs(area) < 1e-9 || n === 0) {
    let sx = 0;
    let sy = 0;
    for (const [x, y] of ring) {
      sx += x;
      sy += y;
    }
    return {
      absArea: 0,
      centroid: n > 0 ? [sx / n, sy / n] : [0, 0],
    };
  }
  return {
    absArea: Math.abs(area),
    centroid: [cx / (6 * area), cy / (6 * area)],
  };
}

interface LeafletMapProps {
  theme: 'light' | 'dark';
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  theme,
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const themeRef = useRef<'light' | 'dark'>(theme);
  themeRef.current = theme;

  const fittedBorderIdRef = useRef<string | null>(null);
  const fittedRevealBorderIdRef = useRef<string | null>(null);

  // Layers
  const tileLayerRef = useRef<L.Layer | null>(null);
  const gridLayerRef = useRef<L.GridLayer | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Style switcher for reveal mode: 'canvas' | 'satellite'
  const [mapStyle, setMapStyle] = useState<'canvas' | 'satellite'>('canvas');
  const [worldRevealData, setWorldRevealData] = useState<GeoJSON.FeatureCollection | null>(
    () => cachedWorldReveal
  );

  // Lazy-load world reveal polygons only when game ends
  useEffect(() => {
    if (!isGameOver || cachedWorldReveal) return;
    let cancelled = false;
    import('../data/world_reveal.json').then((mod) => {
      const data = (mod.default || mod) as GeoJSON.FeatureCollection;
      cachedWorldReveal = data;
      if (!cancelled) {
        setWorldRevealData(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isGameOver]);

  // Initialize Map (runs once per mounted LeafletMap; border.id is keyed by MapCanvas)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Calculate initial bounds from border geometry
    const tempLayer = L.geoJSON(border.geometry as any);
    const initialBounds = tempLayer.getBounds();

    const [lon, lat] = border.midpoint;

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18,
    });

    if (initialBounds.isValid() && map.getSize().x > 20) {
      map.fitBounds(initialBounds, { padding: [50, 50], animate: false });
      fittedBorderIdRef.current = border.id;
    }

    // Invalidate size on container resize; only fit bounds if initial fit hasn't succeeded yet
    const handleResizeOrInit = () => {
      if (!map) return;
      map.invalidateSize();
      if (fittedBorderIdRef.current !== border.id && map.getSize().x > 20) {
        const bounds = L.geoJSON(border.geometry as any).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], animate: false });
          fittedBorderIdRef.current = border.id;
        }
      }
    };

    const t1 = setTimeout(handleResizeOrInit, 60);
    const t2 = setTimeout(handleResizeOrInit, 250);
    const t3 = setTimeout(handleResizeOrInit, 600);

    const resizeObserver = new ResizeObserver(() => {
      handleResizeOrInit();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Technical grid canvas layer matching Swiss Neue Typographie aesthetic
    const TechnicalGridLayer = L.GridLayer.extend({
      createTile: function () {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const tile = document.createElement('canvas');
        tile.width = 256 * dpr;
        tile.height = 256 * dpr;
        tile.style.width = '256px';
        tile.style.height = '256px';
        const ctx = tile.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          const isLight = themeRef.current === 'light';
          ctx.fillStyle = isLight ? '#fcfbf7' : '#0c0d12';
          ctx.fillRect(0, 0, 256, 256);

          // Subtle hairline grid
          ctx.strokeStyle = isLight ? '#e7e5dc' : '#1c1e26';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, 256, 256);

          // Center coordinate crosshair
          ctx.strokeStyle = isLight ? '#c8c5b9' : '#313543';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(128, 122);
          ctx.lineTo(128, 134);
          ctx.moveTo(122, 128);
          ctx.lineTo(134, 128);
          ctx.stroke();
        }
        return tile;
      },
    });

    const grid = new TechnicalGridLayer();
    grid.addTo(map);
    gridLayerRef.current = grid;

    const vectorGroup = L.layerGroup().addTo(map);
    vectorLayerGroupRef.current = vectorGroup;

    mapRef.current = map;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      fittedBorderIdRef.current = null;
      fittedRevealBorderIdRef.current = null;
    };
  }, []);

  // Redraw grid tiles in-place when theme changes (preserving zoom/pan)
  useEffect(() => {
    if (gridLayerRef.current && mapRef.current?.hasLayer(gridLayerRef.current)) {
      gridLayerRef.current.redraw();
    }
  }, [theme]);

  // Update Basemap Tiles based on Game Over, theme, & mapStyle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isGameOver) {
      if (gridLayerRef.current && map.hasLayer(gridLayerRef.current)) {
        map.removeLayer(gridLayerRef.current);
      }

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      if (mapStyle === 'satellite') {
        const satLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 18 }
        );
        satLayer.addTo(map);
        tileLayerRef.current = satLayer;
      } else if (theme === 'light') {
        const lightBase = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16 }
        );
        // Reduced opacity to drastically suppress county sub-borders and small city labels
        const lightLabels = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16, opacity: 0.15 }
        );
        const group = L.layerGroup([lightBase, lightLabels]);
        group.addTo(map);
        tileLayerRef.current = group;
      } else {
        const darkBase = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16 }
        );
        // Reduced opacity to drastically suppress county sub-borders and small city labels
        const darkLabels = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16, opacity: 0.15 }
        );
        const group = L.layerGroup([darkBase, darkLabels]);
        group.addTo(map);
        tileLayerRef.current = group;
      }
    } else {
      // In active guessing mode: PURGE any real map tiles immediately
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      // Ensure grid is active during guessing
      if (gridLayerRef.current && !map.hasLayer(gridLayerRef.current)) {
        gridLayerRef.current.addTo(map);
      }
    }
  }, [isGameOver, mapStyle, theme]);

  // Update Border, Endpoints, Labels, and Stubs
  useEffect(() => {
    const map = mapRef.current;
    const vectorGroup = vectorLayerGroupRef.current;
    if (!map || !vectorGroup) return;

    if (map.getSize().x <= 20) {
      map.invalidateSize();
      const bounds = L.geoJSON(border.geometry as any).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], animate: false });
      }
    }

    vectorGroup.clearLayers();

    const isLight = theme === 'light';
    const isDark = !isLight;
    const lineColor = isGameOver
      ? isWon
        ? '#16a34a'
        : '#d92626'
      : isLight
      ? '#000000'
      : '#ffffff';

    // 0. On Game Over: Draw Bright Sovereign Country Borders & Neighbor Context
    if (isGameOver && worldRevealData) {
      const countriesLayer = L.geoJSON(worldRevealData as any, {
        style: (feature) => {
          const name = feature?.properties?.name;
          const isTargetA = name === border.countryA.name;
          const isTargetB = name === border.countryB.name;
          const isTarget = isTargetA || isTargetB;

          return {
            color: isTarget
              ? (isDark ? '#ffffff' : '#000000')
              : (isDark ? '#e4e4e7' : '#27272a'), // Bright silver-white in dark mode, solid black in light mode
            weight: isTarget ? 2.5 : 1.75,
            opacity: isTarget ? 1 : 0.85,
            fillColor: isTarget
              ? (isWon ? '#16a34a' : '#d92626')
              : 'transparent',
            fillOpacity: isTarget ? 0.08 : 0,
          };
        },
      });
      vectorGroup.addLayer(countriesLayer);

      // Neighbor country labels for visible context
      const neighborsA = getLandNeighbors(border.countryA.name);
      const neighborsB = getLandNeighbors(border.countryB.name);
      const surroundingSet = new Set([...neighborsA, ...neighborsB]);
      surroundingSet.delete(border.countryA.name);
      surroundingSet.delete(border.countryB.name);

      const features = worldRevealData.features || [];
      for (const neighborName of surroundingSet) {
        const feat = features.find((f: any) => f.properties?.name === neighborName);
        if (feat && feat.geometry) {
          let bestCentroid: [number, number] | null = null;
          if (feat.geometry.type === 'Polygon') {
            const outerRing = feat.geometry.coordinates[0] as Array<[number, number]>;
            if (outerRing?.length > 0) {
              bestCentroid = computeRingSignedAreaAndCentroid(outerRing).centroid;
            }
          } else if (feat.geometry.type === 'MultiPolygon') {
            let maxArea = -1;
            for (const poly of feat.geometry.coordinates as Array<Array<Array<[number, number]>>>) {
              const outerRing = poly[0];
              if (outerRing?.length > 0) {
                const { absArea, centroid } = computeRingSignedAreaAndCentroid(outerRing);
                if (absArea > maxArea) {
                  maxArea = absArea;
                  bestCentroid = centroid;
                }
              }
            }
          }
          if (bestCentroid) {
            const [centerLon, centerLat] = bestCentroid;
            const nIcon = L.divIcon({
              className: 'custom-neighbor-label',
              html: `<div class="px-2 py-0.5 bg-black/85 text-zinc-300 dark:bg-zinc-950/90 dark:text-zinc-200 font-mono font-bold text-[10px] uppercase border border-zinc-500/60 shadow-sm w-max transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">${neighborName}</div>`,
              iconSize: [0, 0],
            });
            const nMarker = L.marker([centerLat, centerLon], { icon: nIcon });
            vectorGroup.addLayer(nMarker);
          }
        }
      }
    }

    // 1. Outer Glow / Contrast Halo
    if (!isLight || isGameOver) {
      const glowLayer = L.geoJSON(border.geometry as any, {
        style: {
          color: lineColor,
          weight: 7,
          opacity: isGameOver ? 0.35 : 0.2,
          lineCap: 'square',
          lineJoin: 'miter',
        },
      });
      vectorGroup.addLayer(glowLayer);
    }

    // 2. Inner Sharp Line (Stark black in light mode, stark white in dark mode)
    const mainLine = L.geoJSON(border.geometry as any, {
      style: {
        color: lineColor,
        weight: 4,
        opacity: 1,
        lineCap: 'square',
        lineJoin: 'miter',
      },
    });
    vectorGroup.addLayer(mainLine);

    // 3. Square Endpoint Markers (Swiss / Neue Typographie aesthetic)
    for (const ep of border.endpoints) {
      const [lon, lat] = ep.coordinates;
      if (ep.type === 'coast') {
        const coastIcon = L.divIcon({
          className: 'square-endpoint-marker',
          html: `<div class="w-3 h-3 bg-[#d92626] border-2 border-black dark:border-white shadow-none transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([lat, lon], { icon: coastIcon });
        vectorGroup.addLayer(marker);
      } else {
        const triIcon = L.divIcon({
          className: 'square-endpoint-marker',
          html: `<div class="w-3 h-3 bg-black dark:bg-white border-2 border-black dark:border-zinc-300 shadow-none transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([lat, lon], { icon: triIcon });
        vectorGroup.addLayer(marker);
      }
    }

    // 4. Context Stubs (Hint 2 unlocked)
    if (unlockedHints >= 2) {
      for (const stub of border.contextStubs) {
        const latLngs = stub.map((c) => [c[1], c[0]] as [number, number]);
        const stubLine = L.polyline(latLngs, {
          color: '#71717a',
          weight: 2,
          dashArray: '4, 5',
          opacity: 0.85,
        });
        vectorGroup.addLayer(stubLine);
      }
    }

    // 5. Country Side Labels (Always show on game-over reveal so nations are prominently identifiable, or during active gameplay when half-matched)
    const bounds = mainLine.getBounds();
    let updateLabels: (() => void) | null = null;

    const showA =
      isGameOver ||
      lockedCountry === border.countryA.name ||
      guessedCountries.includes(border.countryA.name);

    const showB =
      isGameOver ||
      lockedCountry === border.countryB.name ||
      guessedCountries.includes(border.countryB.name);

    if (showA || showB) {

      // Helper to dynamically calculate screen-space anchor position
      // Guarantees labels never overlap the border when zooming out and stay on the correct side
      const computeDynamicAnchor = (
        sideAnchor: [number, number],
        defaultBorderPt: [number, number]
      ): { borderLatLng: [number, number]; labelLatLng: [number, number] } => {
        const size = map.getSize();
        const screenCenter = L.point(size.x / 2, size.y / 2);

        // Find visible vertex on border closest to screen center
        let bestBorderPt: [number, number] = defaultBorderPt;
        let minCenterDist = Infinity;

        const checkPt = (coord: [number, number]) => {
          const ptScreen = map.latLngToContainerPoint([coord[1], coord[0]]);
          if (
            ptScreen.x >= 30 &&
            ptScreen.x <= size.x - 30 &&
            ptScreen.y >= 30 &&
            ptScreen.y <= size.y - 30
          ) {
            const d = ptScreen.distanceTo(screenCenter);
            if (d < minCenterDist) {
              minCenterDist = d;
              bestBorderPt = coord;
            }
          }
        };

        if (border.geometry.type === 'LineString') {
          const coords = border.geometry.coordinates as Array<[number, number]>;
          for (const c of coords) checkPt(c);
        } else if (border.geometry.type === 'MultiLineString') {
          const lines = border.geometry.coordinates as Array<Array<[number, number]>>;
          for (const line of lines) {
            for (const c of line) checkPt(c);
          }
        }

        const borderScreen = map.latLngToContainerPoint([bestBorderPt[1], bestBorderPt[0]]);
        const anchorScreen = map.latLngToContainerPoint([sideAnchor[1], sideAnchor[0]]);

        const dx = anchorScreen.x - borderScreen.x;
        const dy = anchorScreen.y - borderScreen.y;
        const len = Math.hypot(dx, dy);

        let ux = 1;
        let uy = 0;
        if (len > 0.001) {
          ux = dx / len;
          uy = dy / len;
        }

        // Elliptical clearance calculation for ~90px x 28px pill
        const badgeRadius = Math.hypot(ux * 45, uy * 15);
        const minClearancePx = 28; // guaranteed visual air gap
        const minOffsetPx = badgeRadius + minClearancePx; // ~55px to 75px minimum screen distance

        // Offset never drops below minOffsetPx, preventing collision at any zoom level
        const targetOffsetPx = Math.max(minOffsetPx, Math.min(len, 120));

        const labelScreenX = borderScreen.x + ux * targetOffsetPx;
        const labelScreenY = borderScreen.y + uy * targetOffsetPx;

        const labelLatLng = map.containerPointToLatLng(L.point(labelScreenX, labelScreenY));

        return {
          borderLatLng: [bestBorderPt[1], bestBorderPt[0]],
          labelLatLng: [labelLatLng.lat, labelLatLng.lng],
        };
      };

      let elementsA: {
        leader: L.Polyline;
        dot: L.CircleMarker;
        marker: L.Marker;
        defaultBorderPt: [number, number];
      } | null = null;

      let elementsB: {
        leader: L.Polyline;
        dot: L.CircleMarker;
        marker: L.Marker;
        defaultBorderPt: [number, number];
      } | null = null;

      if (showA && border.sideAAnchor) {
        const defaultBorderPt = getClosestPointOnGeometry(border.geometry, border.sideAAnchor);

        const leaderA = L.polyline([], {
          color: '#10b981',
          weight: 1.5,
          dashArray: '3, 4',
          opacity: 0.85,
        });
        vectorGroup.addLayer(leaderA);

        const anchorDotA = L.circleMarker([defaultBorderPt[1], defaultBorderPt[0]], {
          radius: 3,
          fillColor: '#10b981',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 1,
        });
        vectorGroup.addLayer(anchorDotA);

        const badgeBgA = isGameOver && !isWon ? 'bg-[#d92626]' : 'bg-emerald-600';
        const iconA = L.divIcon({
          className: 'custom-map-label',
          html: `<div class="inline-flex items-center gap-1.5 px-2.5 py-1 ${badgeBgA} text-white font-mono font-bold text-xs uppercase border-2 border-black dark:border-white shadow-none w-max transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"><span class="w-1.5 h-1.5 bg-white shrink-0"></span><span>${border.countryA.name}</span></div>`,
          iconSize: [0, 0],
        });
        const markerA = L.marker([border.sideAAnchor[1], border.sideAAnchor[0]], { icon: iconA });
        vectorGroup.addLayer(markerA);

        elementsA = { leader: leaderA, dot: anchorDotA, marker: markerA, defaultBorderPt };
      }

      if (showB && border.sideBAnchor) {
        const defaultBorderPt = getClosestPointOnGeometry(border.geometry, border.sideBAnchor);

        const leaderB = L.polyline([], {
          color: '#10b981',
          weight: 1.5,
          dashArray: '3, 4',
          opacity: 0.85,
        });
        vectorGroup.addLayer(leaderB);

        const anchorDotB = L.circleMarker([defaultBorderPt[1], defaultBorderPt[0]], {
          radius: 3,
          fillColor: '#10b981',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 1,
        });
        vectorGroup.addLayer(anchorDotB);

        const badgeBgB = isGameOver && !isWon ? 'bg-[#d92626]' : 'bg-emerald-600';
        const iconB = L.divIcon({
          className: 'custom-map-label',
          html: `<div class="inline-flex items-center gap-1.5 px-2.5 py-1 ${badgeBgB} text-white font-mono font-bold text-xs uppercase border-2 border-black dark:border-white shadow-none w-max transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"><span class="w-1.5 h-1.5 bg-white shrink-0"></span><span>${border.countryB.name}</span></div>`,
          iconSize: [0, 0],
        });
        const markerB = L.marker([border.sideBAnchor[1], border.sideBAnchor[0]], { icon: iconB });
        vectorGroup.addLayer(markerB);

        elementsB = { leader: leaderB, dot: anchorDotB, marker: markerB, defaultBorderPt };
      }

      if (elementsA || elementsB) {
        updateLabels = () => {
          if (elementsA && border.sideAAnchor) {
            const posA = computeDynamicAnchor(border.sideAAnchor, elementsA.defaultBorderPt);
            elementsA.marker.setLatLng(posA.labelLatLng);
            elementsA.leader.setLatLngs([posA.borderLatLng, posA.labelLatLng]);
            elementsA.dot.setLatLng(posA.borderLatLng);
          }
          if (elementsB && border.sideBAnchor) {
            const posB = computeDynamicAnchor(border.sideBAnchor, elementsB.defaultBorderPt);
            elementsB.marker.setLatLng(posB.labelLatLng);
            elementsB.leader.setLatLngs([posB.borderLatLng, posB.labelLatLng]);
            elementsB.dot.setLatLng(posB.borderLatLng);
          }
        };

        map.on('move zoom viewreset resize', updateLabels);
        updateLabels();
      }
    }

    // Fit view only on initial border load or on first transition to Game Over reveal
    if (bounds.isValid() && map.getSize().x > 20) {
      if (isGameOver) {
        if (fittedRevealBorderIdRef.current !== border.id) {
          fittedRevealBorderIdRef.current = border.id;
          fittedBorderIdRef.current = border.id;
          map.flyToBounds(bounds.pad(1.2), { duration: 1.4 });
        }
      } else if (fittedBorderIdRef.current !== border.id) {
        fittedBorderIdRef.current = border.id;
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      }
    }

    return () => {
      if (updateLabels) {
        map.off('move zoom viewreset resize', updateLabels);
      }
    };
  }, [border, unlockedHints, lockedCountry, guessedCountries, isGameOver, isWon, theme, worldRevealData]);

  // Controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    const tempLayer = L.geoJSON(border.geometry as any);
    const bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      if (isGameOver) {
        map.flyToBounds(bounds.pad(1.2), { duration: 0.6 });
      } else {
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-none overflow-hidden" />

      {/* Floating Basemap Toggle (When game is over) */}
      {isGameOver && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center border-2 border-black dark:border-zinc-300 bg-white dark:bg-zinc-900 shadow-none font-mono text-xs divide-x-2 divide-black dark:divide-zinc-300">
          <button
            onClick={() => setMapStyle('canvas')}
            className={`px-3 py-1 font-bold uppercase transition-colors cursor-pointer ${
              mapStyle === 'canvas'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            [ MAP ]
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1 font-bold uppercase transition-colors cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-[#d92626] text-white dark:bg-[#ef4444] dark:text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
            }`}
          >
            [ SATELLITE ]
          </button>
        </div>
      )}

      {/* Modern Zoom & Reset Controls */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center border-2 border-black dark:border-zinc-300 bg-white dark:bg-zinc-900 shadow-none font-mono divide-x-2 divide-black dark:divide-zinc-300">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white transition-colors cursor-pointer"
          title="Reset to Border"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
