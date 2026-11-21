import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto font-mono text-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121318] border-2 sm:border-4 border-black dark:border-zinc-300 p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] dark:sm:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col gap-3.5 sm:gap-4 text-black dark:text-zinc-100 my-auto sharp-box">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-400 pb-2 font-bold uppercase text-xs">
          <span className="text-[#d92626] dark:text-[#f87171] tracking-wider text-[11px] sm:text-xs">
            [ EXHIBITION DIRECTIVE // HOW TO PLAY ]
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer text-xs font-bold"
            title="Close"
          >
            [ ✕ ]
          </button>
        </div>

        {/* Visual Diagram: Simplified cartographic plate */}
        <div className="border-2 border-black dark:border-zinc-400 bg-[#f4f3ee] dark:bg-zinc-950 p-2 sm:p-3 sharp-box flex flex-col items-center">
          <svg
            viewBox="0 0 320 110"
            className="w-full h-24 sm:h-28 text-black dark:text-zinc-200 select-none"
          >
            {/* Background Grid Lines */}
            <line x1="0" y1="55" x2="320" y2="55" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <line x1="160" y1="0" x2="160" y2="110" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />

            {/* Compass North Arrow */}
            <g transform="translate(24, 22)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="0,0 -3,5 3,5" fill="currentColor" />
              <text x="0" y="-4" textAnchor="middle" fontSize="8" fontWeight="900" fill="currentColor">N</text>
            </g>

            {/* Side Labels */}
            <text x="95" y="32" fontSize="10" fontWeight="bold" fill="#16a34a" textAnchor="middle" letterSpacing="1">
              [ COUNTRY 1 ]
            </text>
            <text x="225" y="86" fontSize="10" fontWeight="bold" fill="#16a34a" textAnchor="middle" letterSpacing="1">
              [ COUNTRY 2 ]
            </text>

            {/* Border Curve */}
            <path
              d="M 45 70 C 85 30, 145 80, 205 40 C 235 20, 255 65, 275 55"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="square"
            />

            {/* Left Coast Marker (Red Square) */}
            <rect x="39" y="64" width="12" height="12" fill="#d92626" stroke="currentColor" strokeWidth="1.5" />
            <text x="45" y="92" fontSize="8" fontWeight="bold" fill="#d92626" textAnchor="middle">
              ■ COAST
            </text>

            {/* Right Tripoint Marker (Black/White Square) */}
            <rect x="269" y="49" width="12" height="12" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
            <text x="275" y="77" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle">
              ■ TRIPOINT
            </text>
          </svg>
        </div>

        {/* 3 Concise Rules */}
        <div className="flex flex-col gap-2.5 font-mono text-[11px] sm:text-xs leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="font-bold text-[#d92626] dark:text-[#f87171] shrink-0">01 /</span>
            <p>
              <strong className="text-black dark:text-white uppercase">Identify the Pair:</strong> Name the 2 sovereign neighbors sharing this isolated border (6 attempts max, North-up).
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-bold text-[#d92626] dark:text-[#f87171] shrink-0">02 /</span>
            <p>
              <strong className="text-black dark:text-white uppercase">Half-Match Lock:</strong> Guessing 1 correct nation locks it in and labels its side of the boundary.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="font-bold text-[#d92626] dark:text-[#f87171] shrink-0">03 /</span>
            <p>
              <strong className="text-black dark:text-white uppercase">Telemetry &amp; Clues:</strong> Wrong guesses reveal distance in km, bearing arrows, length, adjacent lines, and latitude band.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 border-2 border-black dark:border-white bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-mono font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer sharp-box flex items-center justify-center gap-2"
          >
            <span>START EXHIBITION →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
