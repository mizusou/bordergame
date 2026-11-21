import React from 'react';
import { X, Compass } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#090f1d] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 font-mono text-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold tracking-wider text-slate-100">
              TACTICAL BRIEFING
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Objective */}
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="text-cyan-400 font-bold tracking-wider text-[11px]">
            01 // MISSION OBJECTIVE
          </div>
          <p className="text-slate-300 leading-relaxed">
            You are presented with the isolated shared land border line between two sovereign countries, strictly oriented <strong>North-up</strong>. You have <strong>6 attempts</strong> to identify both countries.
          </p>
        </div>

        {/* Section 2: Endpoint Markers */}
        <div className="flex flex-col gap-2 text-xs border-t border-slate-800/80 pt-3">
          <div className="text-cyan-400 font-bold tracking-wider text-[11px]">
            02 // ENDPOINT MARKERS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-sky-500 border border-sky-300 shrink-0 shadow-[0_0_8px_#38bdf8]" />
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 text-[11px]">OCEAN COAST</span>
                <span className="text-[10px] text-slate-400">Terminates at sea / ocean</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full border-2 border-amber-400 bg-[#070b12] shrink-0 shadow-[0_0_8px_#f59e0b]" />
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 text-[11px]">LAND TRIPOINT</span>
                <span className="text-[10px] text-slate-400">Terminates at a 3rd border</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Half-Match Lock-in */}
        <div className="flex flex-col gap-1.5 text-xs border-t border-slate-800/80 pt-3">
          <div className="text-cyan-400 font-bold tracking-wider text-[11px]">
            03 // HALF-MATCH LOCK-IN
          </div>
          <p className="text-slate-300 leading-relaxed">
            If you guess <strong>one of the two countries</strong> correctly:
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
            <li>It locks into your input automatically in green.</li>
            <li>Its name renders on its <strong>actual geographic side</strong> of the border line on the map.</li>
            <li>Your input will prioritize that country's land neighbors!</li>
          </ul>
        </div>

        {/* Section 4: Progressive Intel */}
        <div className="flex flex-col gap-1.5 text-xs border-t border-slate-800/80 pt-3">
          <div className="text-cyan-400 font-bold tracking-wider text-[11px]">
            04 // PROGRESSIVE TELEMETRY
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">WRONG GUESS 1:</span>
              <div className="text-slate-400">Exact length & scale bar</div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">WRONG GUESS 2:</span>
              <div className="text-slate-400">Adjacent context stubs</div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">WRONG GUESS 3:</span>
              <div className="text-slate-400">Continent / region</div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">WRONG GUESS 4:</span>
              <div className="text-slate-400">Latitude coordinate band</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#090f1d] font-bold text-xs tracking-wider transition-colors cursor-pointer"
        >
          COMMENCE MISSION
        </button>
      </div>
    </div>
  );
};
