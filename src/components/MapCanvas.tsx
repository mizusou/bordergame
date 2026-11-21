import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { geoAzimuthalEquidistant, geoPath, geoGraticule } from 'd3-geo';
import { BorderItem } from '../types/game.ts';
import { calculateScaleBar, formatCoordinates } from '../utils/geo.ts';
import worldRevealData from '../data/world_reveal.json';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Compass } from 'lucide-react';

interface MapCanvasProps {
  border: BorderItem;
  unlockedHints: number;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  border,
  unlockedHints,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 420,
  });

  // Smooth zoom and pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Regional reveal mode toggle
  const [revealMode, setRevealMode] = useState<'focus' | 'regional'>('focus');

  // Trigger reveal view smoothly on game over
  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(() => {
        setRevealMode('regional');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRevealMode('focus');
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isGameOver, border.id]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter nearby countries once per border for lightning-fast regional projection
  const nearbyWorldFeatures = useMemo(() => {
    const [centerLon, centerLat] = border.midpoint;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    return worldRevealData.features.filter((f) => {
      const name = f.properties.name;
      if (name === border.countryA.name || name === border.countryB.name) {
        return true;
      }
      const geom = f.geometry as any;
      const coords: [number, number] =
        geom.type === 'Polygon' ? geom.coordinates[0][0] : geom.coordinates[0][0][0];
      const dx = (coords[0] - centerLon) * cosLat;
      const dy = coords[1] - centerLat;
      const distKm = Math.hypot(dx, dy) * 111.32;
      return distKm < 2800;
    });
  }, [border.id, border.midpoint, border.countryA.name, border.countryB.name]);

  // Compute D3 Projection
  const { pathGenerator, projection, scaleBar } = useMemo(() => {
    const { width, height } = dimensions;
    const [centerLon, centerLat] = border.midpoint;

    const proj = geoAzimuthalEquidistant()
      .rotate([-centerLon, -centerLat, 0])
      .center([0, 0]);

    const pad = Math.min(width, height) * 0.18;

    if (revealMode === 'regional') {
      const featA = nearbyWorldFeatures.find((f) => f.properties.name === border.countryA.name);
      const featB = nearbyWorldFeatures.find((f) => f.properties.name === border.countryB.name);

      const combinedGeom: any = {
        type: 'GeometryCollection',
        geometries: [
          border.geometry,
          ...(featA ? [featA.geometry] : []),
          ...(featB ? [featB.geometry] : []),
        ],
      };

      try {
        proj.fitExtent(
          [
            [pad, pad],
            [width - pad, height - pad],
          ],
          combinedGeom
        );
      } catch {
        proj.fitExtent(
          [
            [pad, pad],
            [width - pad, height - pad],
          ],
          border.geometry as any
        );
      }
    } else {
      proj.fitExtent(
        [
          [pad, pad],
          [width - pad, height - pad],
        ],
        border.geometry as any
      );
    }

    const path = geoPath(proj);
    const sb = calculateScaleBar(border.midpoint, (coord) => {
      const res = proj(coord);
      return res ? [res[0], res[1]] : null;
    });

    return {
      pathGenerator: path,
      projection: proj,
      scaleBar: sb,
    };
  }, [dimensions, border, revealMode, nearbyWorldFeatures]);

  // Memoize Graticule lines
  const graticuleLines = useMemo(() => {
    const gr = geoGraticule().step([2, 2]);
    return pathGenerator(gr()) || '';
  }, [pathGenerator]);

  // Memoize Main Border Line SVG Path
  const borderPath = useMemo(() => {
    return pathGenerator(border.geometry as any) || '';
  }, [pathGenerator, border.geometry]);

  // Memoize Context Stub SVG Paths
  const contextStubPaths = useMemo(() => {
    if (unlockedHints < 2) return [];
    return border.contextStubs
      .map((stub) => {
        const lineGeo: GeoJSON.LineString = {
          type: 'LineString',
          coordinates: stub,
        };
        return pathGenerator(lineGeo as any) || '';
      })
      .filter(Boolean);
  }, [pathGenerator, border.contextStubs, unlockedHints]);

  // Memoize Regional Country Paths (COMPUTED ONLY ONCE ON REVEAL, 0ms DURING DRAG/ZOOM!)
  const regionalCountryData = useMemo(() => {
    if (revealMode !== 'regional') return [];

    const items: Array<{
      name: string;
      d: string;
      centroid: [number, number] | null;
      isTarget: boolean;
    }> = [];

    for (const feat of nearbyWorldFeatures) {
      const isTarget =
        feat.properties.name === border.countryA.name ||
        feat.properties.name === border.countryB.name;

      const d = pathGenerator(feat as any);
      if (!d) continue;

      const c = pathGenerator.centroid(feat as any);
      const centroid: [number, number] | null =
        c && !isNaN(c[0]) && !isNaN(c[1]) ? [c[0], c[1]] : null;

      items.push({
        name: feat.properties.name,
        d,
        centroid,
        isTarget,
      });
    }

    return items;
  }, [revealMode, nearbyWorldFeatures, pathGenerator, border.countryA.name, border.countryB.name]);

  // Memoize Projected Endpoints
  const projectedEndpoints = useMemo(() => {
    return border.endpoints
      .map((ep) => {
        const pt = projection(ep.coordinates);
        return pt ? { x: pt[0], y: pt[1], type: ep.type } : null;
      })
      .filter(Boolean) as Array<{ x: number; y: number; type: 'coast' | 'tripoint' }>;
  }, [projection, border.endpoints]);

  // Projected side anchors
  const sideAAnchorPx = useMemo(() => projection(border.sideAAnchor), [projection, border.sideAAnchor]);
  const sideBAnchorPx = useMemo(() => projection(border.sideBAnchor), [projection, border.sideBAnchor]);
  const centerPx = useMemo(() => projection(border.midpoint), [projection, border.midpoint]);

  // High performance dragging (uses ref coordinates, zero layout thrashing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Modern styling logic
  const lineColor = isGameOver
    ? isWon
      ? '#22c55e' // Wordle / Mobbin vibrant green
      : '#f59e0b' // Modern warm amber
    : '#38bdf8'; // Crisp sky blue

  const showCountryA =
    isGameOver ||
    lockedCountry === border.countryA.name ||
    guessedCountries.includes(border.countryA.name);

  const showCountryB =
    isGameOver ||
    lockedCountry === border.countryB.name ||
    guessedCountries.includes(border.countryB.name);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[370px] sm:h-[430px] md:h-[460px] bg-[#0c0d12] rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl select-none cursor-grab active:cursor-grabbing transition-colors"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: 'none' }}
    >
      {/* Background Micro Grid (Mobbin style subtle dots/lines) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* SVG Canvas */}
      <svg
        className="w-full h-full block"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <defs>
          <filter id="border-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* GPU-Accelerated Dynamic Pan & Zoom Group */}
        <g
          style={{
            transform: `translate3d(${panOffset.x + dimensions.width / 2}px, ${
              panOffset.y + dimensions.height / 2
            }px, 0px) scale(${zoomScale}) translate3d(${-dimensions.width / 2}px, ${
              -dimensions.height / 2
            }px, 0px)`,
            willChange: 'transform',
            transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Subtle concentric distance rings */}
          {centerPx && (
            <g className="opacity-15 pointer-events-none">
              <circle
                cx={centerPx[0]}
                cy={centerPx[1]}
                r={scaleBar.pixelWidth * 1.5}
                fill="none"
                stroke="#52525b"
                strokeWidth="0.75"
                strokeDasharray="4 6"
              />
              <circle
                cx={centerPx[0]}
                cy={centerPx[1]}
                r={scaleBar.pixelWidth * 3.5}
                fill="none"
                stroke="#3f3f46"
                strokeWidth="0.75"
              />
            </g>
          )}

          {/* Graticule lines (Latitude/Longitude subtle hairline grid) */}
          <path
            d={graticuleLines}
            fill="none"
            stroke="#27272a"
            strokeWidth="0.75"
            strokeDasharray="2 4"
            className="opacity-40 pointer-events-none"
          />

          {/* Regional Countries (FAST: Pre-rendered paths from useMemo) */}
          {revealMode === 'regional' && regionalCountryData.length > 0 && (
            <g className="pointer-events-none">
              {regionalCountryData.map((item, idx) => (
                <g key={`reg-${idx}`}>
                  <path
                    d={item.d}
                    fill={
                      item.isTarget
                        ? isWon
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)'
                        : '#12131a'
                    }
                    stroke={
                      item.isTarget
                        ? isWon
                          ? '#22c55e'
                          : '#f59e0b'
                        : '#27272a'
                    }
                    strokeWidth={item.isTarget ? 1.5 : 0.75}
                  />
                  {item.centroid && (
                    <text
                      x={item.centroid[0]}
                      y={item.centroid[1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[9px] font-sans font-semibold tracking-wider ${
                        item.isTarget
                          ? isWon
                            ? 'fill-emerald-300 font-bold'
                            : 'fill-amber-300 font-bold'
                          : 'fill-zinc-500'
                      }`}
                    >
                      {item.name}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* Context Stubs (Hint 2 unlocked) */}
          {contextStubPaths.map((stubPath, idx) => (
            <path
              key={`stub-${idx}`}
              d={stubPath}
              fill="none"
              stroke="#71717a"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.8"
              className="pointer-events-none"
            />
          ))}

          {/* Target Border Line: Outer Glow */}
          <path
            d={borderPath}
            fill="none"
            stroke={lineColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#border-glow)"
            opacity="0.4"
            className="pointer-events-none transition-colors duration-500"
          />

          {/* Target Border Line: Core Solid Stroke */}
          <path
            d={borderPath}
            fill="none"
            stroke={isGameOver ? lineColor : '#ffffff'}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none transition-colors duration-500"
          />

          {/* Midpoint subtle crosshair */}
          {centerPx && (
            <g
              transform={`translate(${centerPx[0]}, ${centerPx[1]})`}
              className="pointer-events-none opacity-40"
            >
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#a1a1aa" strokeWidth="1" />
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#a1a1aa" strokeWidth="1" />
            </g>
          )}

          {/* Endpoint Markers */}
          {projectedEndpoints.map((ep, idx) => (
            <g
              key={`ep-${idx}`}
              transform={`translate(${ep.x}, ${ep.y})`}
              className="pointer-events-none"
            >
              {ep.type === 'coast' ? (
                <>
                  <circle
                    r="8"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.25"
                    strokeDasharray="2 3"
                    className="opacity-70"
                  />
                  <circle
                    r="4.5"
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              ) : (
                <>
                  <circle
                    r="6.5"
                    fill="#0c0d12"
                    stroke="#f59e0b"
                    strokeWidth="1.75"
                  />
                  <circle r="1.75" fill="#f59e0b" />
                </>
              )}
            </g>
          ))}

          {/* Half-Match / Locked Country Side Labels */}
          {showCountryA && sideAAnchorPx && (
            <g
              transform={`translate(${sideAAnchorPx[0]}, ${sideAAnchorPx[1]})`}
              className="pointer-events-none"
            >
              <rect
                x="-48"
                y="-13"
                width="96"
                height="26"
                rx="6"
                fill="#15803d"
                stroke="#22c55e"
                strokeWidth="1"
                className="shadow-lg"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-sans text-[11px] font-bold tracking-wide"
              >
                {border.countryA.name}
              </text>
            </g>
          )}

          {showCountryB && sideBAnchorPx && (
            <g
              transform={`translate(${sideBAnchorPx[0]}, ${sideBAnchorPx[1]})`}
              className="pointer-events-none"
            >
              <rect
                x="-48"
                y="-13"
                width="96"
                height="26"
                rx="6"
                fill="#15803d"
                stroke="#22c55e"
                strokeWidth="1"
                className="shadow-lg"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white font-sans text-[11px] font-bold tracking-wide"
              >
                {border.countryB.name}
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* TOP-LEFT: Clean Minimalist Legend Pill (Mobbin style) */}
      <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10 pointer-events-none">
        <div className="flex items-center gap-2.5 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 text-[11px] text-zinc-300 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-300 inline-block shadow-sm" />
            <span className="font-medium text-zinc-300">Coastline</span>
          </div>
          <span className="text-zinc-600">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-400 bg-zinc-900 inline-block" />
            <span className="font-medium text-zinc-300">Tripoint</span>
          </div>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800/80 text-[10px] text-zinc-400 font-mono w-fit">
          {formatCoordinates(border.midpoint)}
        </div>
      </div>

      {/* TOP-RIGHT: Minimalist Compass Pill */}
      <div className="absolute top-3.5 right-3.5 z-10 pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full px-2.5 py-1 flex items-center gap-1 text-[11px] font-sans font-semibold text-zinc-300 shadow-md">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>North-up</span>
        </div>
      </div>

      {/* BOTTOM-LEFT: Scale Ruler Pill */}
      {(unlockedHints >= 1 || isGameOver) && (
        <div className="absolute bottom-3.5 left-3.5 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 z-10 text-[11px] shadow-md flex items-center gap-2.5 animate-fade-in">
          <span className="font-semibold text-zinc-200 font-mono">{scaleBar.km} km</span>
          <div
            className="h-1.5 border-x-2 border-b-2 border-zinc-400 flex items-end justify-center relative"
            style={{ width: `${scaleBar.pixelWidth}px` }}
          >
            <div className="w-0.5 h-1 bg-zinc-400" />
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            {border.lengthKm.toLocaleString()} km total
          </span>
        </div>
      )}

      {/* BOTTOM-RIGHT: Modern Floating Action Pills */}
      <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5 z-10">
        {isGameOver && (
          <button
            onClick={() => setRevealMode(revealMode === 'focus' ? 'regional' : 'focus')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md ${
              revealMode === 'regional'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{revealMode === 'regional' ? 'Focus Line' : 'World View'}</span>
          </button>
        )}

        <div className="flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-0.5 shadow-md">
          <button
            onClick={() => setZoomScale((z) => Math.min(z * 1.3, 3.5))}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomScale((z) => Math.max(z / 1.3, 0.6))}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            title="Reset Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
