import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto font-mono text-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#121318] border-4 border-black dark:border-zinc-300 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col gap-4 text-black dark:text-zinc-100 my-8 sharp-box">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 font-bold uppercase text-xs">
          <span className="text-[#d92626] dark:text-[#f87171] tracking-wider">
            [ EXHIBITION MANUAL // OPERATIONAL DIRECTIVE ]
          </span>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
          >
            [ ✕ ]
          </button>
        </div>

        {/* Section 1: Objective */}
        <div className="flex flex-col gap-1">
          <div className="text-black dark:text-white font-black text-xs uppercase tracking-wider">
            01. OBJECTIVE &amp; ORIENTATION
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
            Identify the <strong>two sovereign countries</strong> that share the isolated boundary line in <strong>6 analytical attempts</strong>. The boundary is strictly rendered <strong>North-up</strong>.
          </p>
        </div>

        {/* Section 2: Endpoint Markers */}
        <div className="flex flex-col gap-2 border-t-2 border-black dark:border-zinc-400 pt-3">
          <div className="text-black dark:text-white font-black text-xs uppercase tracking-wider">
            02. CARTOGRAPHIC ENDPOINT SYMBOLS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="border-2 border-black dark:border-zinc-400 p-2.5 bg-[#f4f3ee] dark:bg-zinc-900 flex items-center gap-3 sharp-box">
              <span className="w-3.5 h-3.5 bg-[#d92626] border border-black dark:border-white shrink-0" />
              <div className="flex flex-col font-mono text-xs">
                <span className="font-bold text-black dark:text-white uppercase">Coastline</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400">Terminates at open sea</span>
              </div>
            </div>

            <div className="border-2 border-black dark:border-zinc-400 p-2.5 bg-[#f4f3ee] dark:bg-zinc-900 flex items-center gap-3 sharp-box">
              <span className="w-3.5 h-3.5 bg-black dark:bg-white border border-black dark:border-zinc-300 shrink-0" />
              <div className="flex flex-col font-mono text-xs">
                <span className="font-bold text-black dark:text-white uppercase">Land Tripoint</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400">Intersects another nation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Feedback & Lock-in */}
        <div className="flex flex-col gap-2 border-t-2 border-black dark:border-zinc-400 pt-3 font-sans">
          <div className="text-black dark:text-white font-black text-xs uppercase tracking-wider font-mono">
            03. ANALYTICAL TELEMETRY &amp; LOCK-IN
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>Half-Match Lock-in:</strong> Guessing one correct nation locks it into the entry slot and draws an anchor leader line pointing into that country's territory on the map.
          </p>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>Directional Bearing:</strong> Erroneous submissions report distance in kilometers and a cardinal direction arrow pointing toward the target border.
          </p>
        </div>

        {/* Section 4: Progressive Hints */}
        <div className="flex flex-col gap-1 border-t-2 border-black dark:border-zinc-400 pt-3 font-sans">
          <div className="text-black dark:text-white font-black text-xs uppercase tracking-wider font-mono">
            04. EXHIBITION DOSSIER DISCLOSURES
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs">
            Successive attempts unlock technical disclosures: exact border length (attempt 1), adjacent border stubs (attempt 2), geographic region (attempt 3), and latitude band (attempt 4).
          </p>
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 border-2 border-black dark:border-white bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-mono font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer sharp-box"
          >
            [ RETURN TO EXHIBITION ]
          </button>
        </div>
      </div>
    </div>
  );
};
