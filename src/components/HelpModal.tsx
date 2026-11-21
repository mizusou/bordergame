import React from 'react';
import { X, HelpCircle, Check, Navigation } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-zinc-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold tracking-tight text-white">
              How to Play
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Objective */}
        <div className="flex flex-col gap-1 text-xs">
          <div className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            Objective
          </div>
          <p className="text-zinc-300 leading-relaxed">
            Identify the <strong>two sovereign countries</strong> that share the isolated border line in <strong>6 guesses or fewer</strong>. The line is strictly oriented <strong>North-up</strong>.
          </p>
        </div>

        {/* Section 2: Endpoint Markers */}
        <div className="flex flex-col gap-2 text-xs border-t border-zinc-800/80 pt-3">
          <div className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            Endpoint Cues
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-2xl flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-sky-500 border border-sky-300 shrink-0 shadow-sm" />
              <div className="flex flex-col">
                <span className="font-semibold text-white text-xs">Ocean Coast</span>
                <span className="text-[11px] text-zinc-400">Terminates at open sea / ocean</span>
              </div>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-2xl flex items-center gap-3">
              <span className="w-4 h-4 rounded-full border-2 border-amber-400 bg-zinc-950 shrink-0 shadow-sm" />
              <div className="flex flex-col">
                <span className="font-semibold text-white text-xs">Land Tripoint</span>
                <span className="text-[11px] text-zinc-400">Terminates at another country</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Feedback & Lock-in */}
        <div className="flex flex-col gap-2 text-xs border-t border-zinc-800/80 pt-3">
          <div className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            Feedback &amp; Lock-in
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-zinc-300">
                <strong>Half-Match Lock-in:</strong> If you guess one country right, it turns green and locks in, while its name appears on its actual side of the line on the map.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Navigation className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span className="text-zinc-300">
                <strong>Proximity Telemetry:</strong> Wrong guesses show the distance in kilometers and a compass arrow pointing toward the target border.
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Progressive Hints */}
        <div className="flex flex-col gap-1.5 text-xs border-t border-zinc-800/80 pt-3">
          <div className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            Progressive Hints
          </div>
          <p className="text-zinc-400">
            Wrong guesses automatically unlock hints: border length &amp; scale bar (guess 1), context stubs (guess 2), continent/region (guess 3), and latitude band (guess 4).
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs tracking-wider transition-colors cursor-pointer"
        >
          Got It, Play!
        </button>
      </div>
    </div>
  );
};
