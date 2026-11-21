import React, { useMemo, useRef, useState, useEffect } from 'react';
import { geoAzimuthalEquidistant, geoPath, geoGraticule } from 'd3-geo';
import { BorderItem } from '../types/game.ts';
import { calculateScaleBar, formatCoordinates } from '../utils/geo.ts';
import worldRevealData from '../data/world_reveal.json';
import { ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';

interface MapCanvasProps {
  border: BorderItem;
  unlockedHints: number; // 0..4
  lockedCountry: string | null;
  guessedCountries: string[]; // List of correctly identified half or full matches
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
    width: 600,
    height: 440,
  });

  // Manual zoom/pan state
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // End-of-game reveal view toggle
  const [revealMode, setRevealMode] = useState<'focus' | 'regional'>('focus');

  // Automatically switch to regional view when game ends
  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(() => {
        setRevealMode('regional');
      }, 600);
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
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute D3 projection
  const { pathGenerator, projection, scaleBar } = useMemo(() => {
    const { width, height } = dimensions;
    const [centerLon, centerLat] = border.midpoint;

    // Azimuthal Equidistant projection centered strictly North-up on border midpoint
    const proj = geoAzimuthalEquidistant()
      .rotate([-centerLon, -centerLat, 0])
      .center([0, 0]);

    const pad = Math.min(width, height) * 0.16;

    if (revealMode === 'regional') {
      // Find the two countries in worldRevealData to fit broader region
      const featA = worldRevealData.features.find(
        (f) => f.properties.name === border.countryA.name
      );
      const featB = worldRevealData.features.find(
        (f) => f.properties.name === border.countryB.name
      );

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
  }, [dimensions, border, revealMode]);

  // Graticule lines
  const graticuleLines = useMemo(() => {
    const gr = geoGraticule().step([1, 1]);
    return pathGenerator(gr()) || '';
  }, [pathGenerator]);

  // Main border path
  const borderPath = useMemo(() => {
    return pathGenerator(border.geometry as any) || '';
  }, [pathGenerator, border.geometry]);

  // Context stub paths
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

  // Projected endpoints
  const projectedEndpoints = useMemo(() => {
    return border.endpoints
      .map((ep) => {
        const pt = projection(ep.coordinates);
        return pt ? { x: pt[0], y: pt[1], type: ep.type } : null;
      })
      .filter(Boolean) as Array<{ x: number; y: number; type: 'coast' | 'tripoint' }>;
  }, [projection, border.endpoints]);

  // Projected side anchors
  const sideAAnchorPx = useMemo(() => {
    return projection(border.sideAAnchor);
  }, [projection, border.sideAAnchor]);

  const sideBAnchorPx = useMemo(() => {
    return projection(border.sideBAnchor);
  }, [projection, border.sideBAnchor]);

  // Center midpoint pixel
  const centerPx = useMemo(() => {
    return projection(border.midpoint) || [dimensions.width / 2, dimensions.height / 2];
  }, [projection, border.midpoint, dimensions]);

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Determine line color
  const lineColor = isGameOver
    ? isWon
      ? '#10b981' // Emerald
      : '#f59e0b' // Amber
    : '#38bdf8'; // Cyan phosphor

  // Which country side labels to show
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
      className="relative w-full h-[360px] sm:h-[440px] md:h-[480px] bg-[#070b12] rounded-xl border border-slate-800/90 overflow-hidden shadow-2xl select-none carto-grid cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG Canvas */}
      <svg
        className="w-full h-full block"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <defs>
          {/* Subtle line glow filter */}
          <filter id="carto-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Radar sweep gradient */}
          <radialGradient id="center-radar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Zoom & Pan Group */}
        <g
          transform={`translate(${panOffset.x + dimensions.width / 2}, ${
            panOffset.y + dimensions.height / 2
          }) scale(${zoomScale}) translate(${-dimensions.width / 2}, ${-dimensions.height / 2})`}
          className="transition-transform duration-300 ease-out"
        >
          {/* Concentric distance radar rings */}
          {centerPx && (
            <g className="opacity-25 pointer-events-none">
              <circle
                cx={centerPx[0]}
                cy={centerPx[1]}
                r={scaleBar.pixelWidth}
                fill="none"
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="4 4"
              />
              <circle
                cx={centerPx[0]}
                cy={centerPx[1]}
                r={scaleBar.pixelWidth * 2.5}
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.8"
              />
              <circle
                cx={centerPx[0]}
                cy={centerPx[1]}
                r={scaleBar.pixelWidth * 4.5}
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.6"
              />
            </g>
          )}

          {/* Graticule lines (Latitude/Longitude coordinate grid) */}
          <path
            d={graticuleLines}
            fill="none"
            stroke="#1e293b"
            strokeWidth="0.65"
            strokeDasharray="2 3"
            className="opacity-45 pointer-events-none"
          />

          {/* World Reveal Countries (when game ends or reveal mode) */}
          {revealMode === 'regional' && (
            <g className="transition-opacity duration-1000 ease-in-out opacity-90">
              {worldRevealData.features.map((feat, idx) => {
                const isTargetCountryA = feat.properties.name === border.countryA.name;
                const isTargetCountryB = feat.properties.name === border.countryB.name;
                const isTarget = isTargetCountryA || isTargetCountryB;
                const d = pathGenerator(feat as any);
                if (!d) return null;

                const centroid = pathGenerator.centroid(feat as any);

                return (
                  <g key={`world-feat-${idx}`}>
                    <path
                      d={d}
                      fill={
                        isTarget
                          ? isWon
                            ? 'rgba(16, 185, 129, 0.16)'
                            : 'rgba(245, 158, 11, 0.16)'
                          : '#0a101d'
                      }
                      stroke={isTarget ? (isWon ? '#10b981' : '#f59e0b') : '#1e293b'}
                      strokeWidth={isTarget ? 1.5 : 0.75}
                      className="transition-colors duration-500"
                    />
                    {/* Country labels in reveal mode */}
                    {centroid && !isNaN(centroid[0]) && !isNaN(centroid[1]) && (
                      <text
                        x={centroid[0]}
                        y={centroid[1]}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={`text-[9px] font-mono pointer-events-none select-none tracking-wider ${
                          isTarget
                            ? isWon
                              ? 'fill-emerald-300 font-bold'
                              : 'fill-amber-300 font-bold'
                            : 'fill-slate-600 text-[8px]'
                        }`}
                      >
                        {feat.properties.name.toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Context Stubs (Hint 2 unlocked) */}
          {contextStubPaths.map((stubPath, idx) => (
            <g key={`stub-${idx}`} className="animate-fade-in">
              <path
                d={stubPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.75"
                strokeDasharray="4 4"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          ))}

          {/* Target Border Line Outer Glow */}
          <path
            d={borderPath}
            fill="none"
            stroke={lineColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#carto-glow)"
            opacity="0.45"
            className="transition-colors duration-700"
          />

          {/* Target Border Line Core Line */}
          <path
            d={borderPath}
            fill="none"
            stroke={isGameOver ? lineColor : '#f8fafc'}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-700"
          />

          {/* Center Point Crosshair */}
          {centerPx && (
            <g
              transform={`translate(${centerPx[0]}, ${centerPx[1]})`}
              className="pointer-events-none opacity-60"
            >
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#38bdf8" strokeWidth="1" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1" />
              <circle r="2" fill="#38bdf8" />
            </g>
          )}

          {/* Endpoint Markers */}
          {projectedEndpoints.map((ep, idx) => (
            <g key={`ep-${idx}`} transform={`translate(${ep.x}, ${ep.y})`}>
              {ep.type === 'coast' ? (
                // Solid blue dot with radiant halo for Ocean Coast
                <>
                  <circle
                    r="8.5"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    className="animate-spin-slow opacity-60"
                  />
                  <circle
                    r="5"
                    fill="#0284c7"
                    stroke="#e0f2fe"
                    strokeWidth="1.5"
                    className="shadow-[0_0_8px_#38bdf8]"
                  />
                </>
              ) : (
                // Hollow ring for Land Tripoint
                <>
                  <circle
                    r="6.5"
                    fill="#070b12"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    className="shadow-[0_0_8px_#f59e0b]"
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
              className="animate-fade-in pointer-events-none"
            >
              <rect
                x="-50"
                y="-13"
                width="100"
                height="26"
                rx="4"
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1.2"
                className="shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-emerald-100 font-mono text-[11px] font-bold tracking-wider"
              >
                {border.countryA.name.toUpperCase()}
              </text>
            </g>
          )}

          {showCountryB && sideBAnchorPx && (
            <g
              transform={`translate(${sideBAnchorPx[0]}, ${sideBAnchorPx[1]})`}
              className="animate-fade-in pointer-events-none"
            >
              <rect
                x="-50"
                y="-13"
                width="100"
                height="26"
                rx="4"
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1.2"
                className="shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-emerald-100 font-mono text-[11px] font-bold tracking-wider"
              >
                {border.countryB.name.toUpperCase()}
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* TOP-LEFT: Tactical Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-[#090f1d]/85 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-slate-800 text-[10px] font-mono shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-sky-300 inline-block shadow-[0_0_6px_#38bdf8]" />
            <span className="text-slate-300">OCEAN COAST</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-amber-400 bg-[#070b12] inline-block shadow-[0_0_6px_#f59e0b]" />
            <span className="text-slate-300">LAND TRIPOINT</span>
          </div>
        </div>

        {/* Telemetry info */}
        <div className="bg-[#090f1d]/75 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center gap-2">
          <span>CENTER: {formatCoordinates(border.midpoint)}</span>
          <span className="text-slate-600">•</span>
          <span>AZIMUTHAL EQ</span>
        </div>
      </div>

      {/* TOP-RIGHT: North Compass Rose Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
        <div className="bg-[#090f1d]/85 backdrop-blur-md border border-slate-800 rounded-md p-1.5 flex flex-col items-center justify-center font-mono shadow-lg">
          <div className="text-[10px] font-bold text-cyan-400 flex items-center gap-0.5">
            <span>▲</span>
            <span>N</span>
          </div>
          <div className="text-[8px] text-slate-500">NORTH-UP</div>
        </div>
      </div>

      {/* BOTTOM-LEFT: Dynamic Scale Bar (Unlocked on Hint 1 or Game Over) */}
      {(unlockedHints >= 1 || isGameOver) && (
        <div className="absolute bottom-3 left-3 bg-[#090f1d]/85 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-800 z-10 font-mono text-[10px] shadow-lg flex items-center gap-2.5 animate-fade-in">
          <span className="text-cyan-400 font-semibold">{scaleBar.km} KM</span>
          <div
            className="h-1.5 border-x-2 border-b-2 border-cyan-400 flex items-end justify-center relative"
            style={{ width: `${scaleBar.pixelWidth}px` }}
          >
            <div className="w-0.5 h-1 bg-cyan-400/60" />
          </div>
          <span className="text-slate-400 text-[9px]">TOTAL: {border.lengthKm.toLocaleString()} KM</span>
        </div>
      )}

      {/* BOTTOM-RIGHT: Pan / Zoom Controls & Reveal Toggle */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
        {isGameOver && (
          <button
            onClick={() => setRevealMode(revealMode === 'focus' ? 'regional' : 'focus')}
            className={`px-2.5 py-1.5 rounded-md border font-mono text-xs flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg ${
              revealMode === 'regional'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
            title="Toggle Regional Overview"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {revealMode === 'regional' ? 'FOCUS BORDER' : 'EXPAND REGION'}
            </span>
          </button>
        )}

        <div className="flex items-center bg-[#090f1d]/85 backdrop-blur-md border border-slate-800 rounded-md p-0.5 shadow-lg">
          <button
            onClick={() => setZoomScale((z) => Math.min(z * 1.35, 4))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale((z) => Math.max(z / 1.35, 0.5))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Reset View Orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
