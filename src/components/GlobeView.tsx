import React, { useRef, useEffect, useState, useCallback } from 'react';
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import { BorderItem } from '../types/game.ts';
import worldRevealData from '../data/world_reveal.json';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface GlobeViewProps {
  border: BorderItem;
  lockedCountry: string | null;
  guessedCountries: string[];
  isGameOver: boolean;
  isWon: boolean;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  border,
  lockedCountry,
  guessedCountries,
  isGameOver,
  isWon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation: [yaw, pitch, roll]
  const [rotation, setRotation] = useState<[number, number, number]>([
    -border.midpoint[0],
    -border.midpoint[1],
    0,
  ]);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotStartRef = useRef<[number, number, number]>([0, 0, 0]);

  // Center on border midpoint when border changes
  useEffect(() => {
    setRotation([-border.midpoint[0], -border.midpoint[1], 0]);
    setScaleMultiplier(1);
  }, [border.id, border.midpoint]);

  // Handle Drag to Rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rotStartRef.current = [...rotation];
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const sensitivity = 0.4 / scaleMultiplier;
      const newYaw = rotStartRef.current[0] + dx * sensitivity;
      const newPitch = Math.max(-85, Math.min(85, rotStartRef.current[1] - dy * sensitivity));

      setRotation([newYaw, newPitch, 0]);
    },
    [isDragging, scaleMultiplier]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 0.87;
    setScaleMultiplier((s) => Math.max(0.6, Math.min(6, s * delta)));
  };

  // Render 3D Globe to Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const baseRadius = Math.min(width, height) * 0.42;
    const currentRadius = baseRadius * scaleMultiplier;

    // Projection
    const projection = geoOrthographic()
      .translate([width / 2, height / 2])
      .scale(currentRadius)
      .rotate(rotation)
      .clipAngle(90);

    const path = geoPath(projection, ctx);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Space background & subtle stars
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, width, height);

    // 2. Earth Sphere Base (Midnight ocean)
    const [cx, cy] = [width / 2, height / 2];

    // Atmospheric Glow
    const atmosGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.85, cx, cy, currentRadius * 1.08);
    atmosGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    atmosGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.12)');
    atmosGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = atmosGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius * 1.08, 0, 2 * Math.PI);
    ctx.fill();

    // Ocean Globe Fill
    const oceanGrad = ctx.createRadialGradient(
      cx - currentRadius * 0.3,
      cy - currentRadius * 0.3,
      currentRadius * 0.1,
      cx,
      cy,
      currentRadius
    );
    oceanGrad.addColorStop(0, '#0f172a');
    oceanGrad.addColorStop(1, '#070b14');
    ctx.fillStyle = oceanGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Subtle Earth limb edge
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Graticule lines
    ctx.beginPath();
    path(geoGraticule().step([15, 15])());
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 4. Continents
    for (const feat of worldRevealData.features) {
      const isTargetA = feat.properties.name === border.countryA.name;
      const isTargetB = feat.properties.name === border.countryB.name;
      const isTarget = isTargetA || isTargetB;

      ctx.beginPath();
      path(feat as any);

      if (isGameOver && isTarget) {
        ctx.fillStyle = isWon ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
        ctx.fill();
        ctx.strokeStyle = isWon ? '#22c55e' : '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#141824';
        ctx.fill();
        ctx.strokeStyle = '#1f2638';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }

    // 5. Target Border Line (Bright glowing path)
    ctx.beginPath();
    path(border.geometry as any);
    ctx.strokeStyle = isGameOver
      ? isWon
        ? '#22c55e'
        : '#f59e0b'
      : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = isGameOver
      ? isWon
        ? '#22c55e'
        : '#f59e0b'
      : '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    path(border.geometry as any);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 6. Endpoint Markers
    for (const ep of border.endpoints) {
      const pt = projection(ep.coordinates);
      if (pt) {
        ctx.beginPath();
        if (ep.type === 'coast') {
          ctx.arc(pt[0], pt[1], 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#0284c7';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.arc(pt[0], pt[1], 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#08090d';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // 7. Labels if locked or game over
    const showA = isGameOver || lockedCountry === border.countryA.name || guessedCountries.includes(border.countryA.name);
    const showB = isGameOver || lockedCountry === border.countryB.name || guessedCountries.includes(border.countryB.name);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (showA && border.sideAAnchor) {
      const ptA = projection(border.sideAAnchor);
      if (ptA) {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(ptA[0] - 42, ptA[1] - 11, 84, 22);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.strokeRect(ptA[0] - 42, ptA[1] - 11, 84, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(border.countryA.name, ptA[0], ptA[1]);
      }
    }

    if (showB && border.sideBAnchor) {
      const ptB = projection(border.sideBAnchor);
      if (ptB) {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(ptB[0] - 42, ptB[1] - 11, 84, 22);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.strokeRect(ptB[0] - 42, ptB[1] - 11, 84, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(border.countryB.name, ptB[0], ptB[1]);
      }
    }
  }, [rotation, scaleMultiplier, border, lockedCountry, guessedCountries, isGameOver, isWon]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        width={720}
        height={460}
        className="w-full h-full block rounded-2xl"
      />

      {/* Top Overlay Badges */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-10 pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 text-[11px] text-zinc-300 font-medium shadow-md">
          <span>3D Interactive Globe</span>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-800 text-[10px] text-zinc-400 font-mono">
          Drag to spin · Scroll to zoom
        </div>
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-3.5 right-3.5 flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-0.5 shadow-md z-10">
        <button
          onClick={() => setScaleMultiplier((s) => Math.min(s * 1.25, 5))}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScaleMultiplier((s) => Math.max(s / 1.25, 0.6))}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setRotation([-border.midpoint[0], -border.midpoint[1], 0]);
            setScaleMultiplier(1);
          }}
          className="p-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Reset to Target Border"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
