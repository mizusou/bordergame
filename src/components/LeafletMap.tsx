import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BorderItem } from '../types/game.ts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getClosestPointOnGeometry } from '../utils/geo.ts';

interface LeafletMapProps {
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layers
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const gridLayerRef = useRef<L.GridLayer | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Style switcher for reveal mode: 'dark' | 'satellite'
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');

  // Initialize Map
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

    if (initialBounds.isValid()) {
      map.fitBounds(initialBounds, { padding: [50, 50], animate: false });
    }

    // Custom dark grid canvas layer for guessing mode
    const DarkGridLayer = L.GridLayer.extend({
      createTile: function () {
        const tile = document.createElement('canvas');
        tile.width = 256;
        tile.height = 256;
        const ctx = tile.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0b10';
          ctx.fillRect(0, 0, 256, 256);

          // Subtle hairline grid
          ctx.strokeStyle = '#181922';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, 256, 256);

          // Center coordinate dot
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(127, 127, 2, 2);
        }
        return tile;
      },
    });

    const grid = new DarkGridLayer();
    grid.addTo(map);
    gridLayerRef.current = grid;

    const vectorGroup = L.layerGroup().addTo(map);
    vectorLayerGroupRef.current = vectorGroup;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Basemap Tiles based on Game Over & mapStyle
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
      } else {
        const darkBase = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16 }
        );
        const darkLabels = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 16 }
        );
        const group = L.layerGroup([darkBase, darkLabels]);
        group.addTo(map);
        tileLayerRef.current = group as any;
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

      // Ensure dark grid is active during guessing
      if (gridLayerRef.current && !map.hasLayer(gridLayerRef.current)) {
        gridLayerRef.current.addTo(map);
      }
    }
  }, [isGameOver, mapStyle]);

  // Update Border, Endpoints, Labels, and Stubs
  useEffect(() => {
    const map = mapRef.current;
    const vectorGroup = vectorLayerGroupRef.current;
    if (!map || !vectorGroup) return;

    vectorGroup.clearLayers();

    const lineColor = isGameOver
      ? isWon
        ? '#22c55e'
        : '#f59e0b'
      : '#38bdf8';

    // 1. Outer Glow Line
    const glowLayer = L.geoJSON(border.geometry as any, {
      style: {
        color: lineColor,
        weight: 9,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round',
      },
    });
    vectorGroup.addLayer(glowLayer);

    // 2. Inner Sharp Line
    const mainLine = L.geoJSON(border.geometry as any, {
      style: {
        color: isGameOver ? lineColor : '#ffffff',
        weight: 3.5,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      },
    });
    vectorGroup.addLayer(mainLine);

    // 3. Endpoint Markers
    for (const ep of border.endpoints) {
      const [lon, lat] = ep.coordinates;
      if (ep.type === 'coast') {
        const outerCircle = L.circleMarker([lat, lon], {
          radius: 9,
          fillColor: 'transparent',
          color: '#38bdf8',
          weight: 1.5,
          dashArray: '2, 3',
        });
        const coreCircle = L.circleMarker([lat, lon], {
          radius: 5,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 1,
        });
        vectorGroup.addLayer(outerCircle);
        vectorGroup.addLayer(coreCircle);
      } else {
        const tripointCircle = L.circleMarker([lat, lon], {
          radius: 6.5,
          fillColor: '#0c0d12',
          color: '#f59e0b',
          weight: 2,
          fillOpacity: 1,
        });
        const centerDot = L.circleMarker([lat, lon], {
          radius: 1.5,
          fillColor: '#f59e0b',
          color: '#f59e0b',
          weight: 1,
          fillOpacity: 1,
        });
        vectorGroup.addLayer(tripointCircle);
        vectorGroup.addLayer(centerDot);
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

    // 5. Country Side Labels (Only show during active gameplay when a country is half-matched/locked; hide during game-over reveal since the real basemap already displays official country typography)
    const bounds = mainLine.getBounds();
    let updateLabels: (() => void) | null = null;

    if (!isGameOver) {
      const showA =
        lockedCountry === border.countryA.name ||
        guessedCountries.includes(border.countryA.name);

      const showB =
        lockedCountry === border.countryB.name ||
        guessedCountries.includes(border.countryB.name);

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

        const iconA = L.divIcon({
          className: 'custom-map-label',
          html: `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white font-sans font-bold text-xs shadow-2xl border border-emerald-400 whitespace-nowrap w-max transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-md pointer-events-none"><span class="w-1.5 h-1.5 rounded-full bg-white shadow-sm shrink-0"></span><span class="leading-none">${border.countryA.name}</span></div>`,
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

        const iconB = L.divIcon({
          className: 'custom-map-label',
          html: `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white font-sans font-bold text-xs shadow-2xl border border-emerald-400 whitespace-nowrap w-max transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-md pointer-events-none"><span class="w-1.5 h-1.5 rounded-full bg-white shadow-sm shrink-0"></span><span class="leading-none">${border.countryB.name}</span></div>`,
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

    // Fit view (animate smoothly ONLY on reveal, jump instantly without zooming in guessing mode)
    if (bounds.isValid()) {
      if (isGameOver) {
        map.flyToBounds(bounds.pad(1.2), { duration: 1.4 });
      } else {
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      }
    }

    return () => {
      if (updateLabels) {
        map.off('move zoom viewreset resize', updateLabels);
      }
    };
  }, [border, unlockedHints, lockedCountry, guessedCountries, isGameOver, isWon]);

  // Controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    const tempLayer = L.geoJSON(border.geometry as any);
    const bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Floating Basemap Toggle (When game is over) */}
      {isGameOver && (
        <div className="absolute top-3.5 right-3.5 z-[1000] flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-1 shadow-md">
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              mapStyle === 'dark'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dark Map
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
        </div>
      )}

      {/* Modern Zoom & Reset Controls */}
      <div className="absolute bottom-3.5 right-3.5 z-[1000] flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-0.5 shadow-md">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Reset to Border"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
