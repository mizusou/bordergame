import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BorderItem } from '../types/game.ts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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

    const [lon, lat] = border.midpoint;

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18,
    });

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

    // Remove existing tile layer if any
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (isGameOver) {
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

      if (gridLayerRef.current && map.hasLayer(gridLayerRef.current)) {
        map.removeLayer(gridLayerRef.current);
      }
    } else {
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

    // 5. Country Side Labels
    const showA =
      isGameOver ||
      lockedCountry === border.countryA.name ||
      guessedCountries.includes(border.countryA.name);

    const showB =
      isGameOver ||
      lockedCountry === border.countryB.name ||
      guessedCountries.includes(border.countryB.name);

    if (showA && border.sideAAnchor) {
      const iconA = L.divIcon({
        className: 'custom-map-label',
        html: `<div class="px-3 py-1 rounded-lg bg-emerald-600 text-white font-sans font-bold text-xs shadow-lg border border-emerald-400 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2">${border.countryA.name}</div>`,
        iconSize: [0, 0],
      });
      const markerA = L.marker([border.sideAAnchor[1], border.sideAAnchor[0]], { icon: iconA });
      vectorGroup.addLayer(markerA);
    }

    if (showB && border.sideBAnchor) {
      const iconB = L.divIcon({
        className: 'custom-map-label',
        html: `<div class="px-3 py-1 rounded-lg bg-emerald-600 text-white font-sans font-bold text-xs shadow-lg border border-emerald-400 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2">${border.countryB.name}</div>`,
        iconSize: [0, 0],
      });
      const markerB = L.marker([border.sideBAnchor[1], border.sideBAnchor[0]], { icon: iconB });
      vectorGroup.addLayer(markerB);
    }

    // Fit view
    const bounds = mainLine.getBounds();
    if (bounds.isValid()) {
      if (isGameOver) {
        map.flyToBounds(bounds.pad(1.2), { duration: 1.4 });
      } else {
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [border, unlockedHints, lockedCountry, guessedCountries, isGameOver, isWon]);

  // Controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    const [lon, lat] = border.midpoint;
    map.flyTo([lat, lon], 6, { duration: 0.8 });
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
