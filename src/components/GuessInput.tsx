import React, { useState, useRef, useEffect, useMemo } from 'react';
import { allCountries, getLandNeighbors, doShareLandBorder } from '../utils/neighbors.ts';
import { Search, Lock, AlertTriangle, CornerDownLeft } from 'lucide-react';

interface GuessInputProps {
  lockedCountry: string | null;
  onMakeGuess: (country1: string, country2: string) => boolean | void;
  disabled: boolean;
  alreadyGuessedPairs: Array<[string, string]>;
}

export const GuessInput: React.FC<GuessInputProps> = ({
  lockedCountry,
  onMakeGuess,
  disabled,
  alreadyGuessedPairs,
}) => {
  const [country1, setCountry1] = useState<string>(lockedCountry || '');
  const [country2, setCountry2] = useState<string>('');

  const [query1, setQuery1] = useState<string>(lockedCountry || '');
  const [query2, setQuery2] = useState<string>('');

  const [activeSlot, setActiveSlot] = useState<1 | 2 | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync lockedCountry if parent updates it (half-match lock-in)
  useEffect(() => {
    if (lockedCountry) {
      setCountry1(lockedCountry);
      setQuery1(lockedCountry);
      // Auto-focus slot 2
      setTimeout(() => {
        input2Ref.current?.focus();
        setActiveSlot(2);
      }, 100);
    }
  }, [lockedCountry]);

  // Compute suggestions for Slot 1
  const suggestions1 = useMemo(() => {
    if (!query1.trim()) return allCountries.slice(0, 10);
    const q = query1.toLowerCase().trim();
    return allCountries
      .filter((c) => c.name.toLowerCase().includes(q) || c.isoA2.toLowerCase() === q || c.isoA3.toLowerCase() === q)
      .slice(0, 10);
  }, [query1]);

  // Compute suggestions for Slot 2 (prioritizing land neighbors of country1 if selected!)
  const suggestions2 = useMemo(() => {
    const q = query2.toLowerCase().trim();
    const neighbors = country1 ? getLandNeighbors(country1) : [];

    let list = allCountries;
    if (q) {
      list = allCountries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.isoA2.toLowerCase() === q || c.isoA3.toLowerCase() === q
      );
    }

    // Sort to put land neighbors of country1 FIRST!
    if (country1) {
      list = [...list].sort((a, b) => {
        const aIsNeighbor = neighbors.includes(a.name);
        const bIsNeighbor = neighbors.includes(b.name);
        if (aIsNeighbor && !bIsNeighbor) return -1;
        if (!aIsNeighbor && bIsNeighbor) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Exclude country1 itself
    return list.filter((c) => c.name.toLowerCase() !== country1.toLowerCase()).slice(0, 12);
  }, [query2, country1]);

  // Active suggestions based on focused slot
  const currentSuggestions = activeSlot === 1 ? suggestions1 : suggestions2;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !input1Ref.current?.contains(e.target as Node) &&
        !input2Ref.current?.contains(e.target as Node)
      ) {
        setActiveSlot(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectCountry = (name: string, slot: 1 | 2) => {
    setValidationError(null);
    if (slot === 1) {
      setCountry1(name);
      setQuery1(name);
      setActiveSlot(2);
      setHighlightedIndex(0);
      input2Ref.current?.focus();
    } else {
      setCountry2(name);
      setQuery2(name);
      setActiveSlot(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, slot: 1 | 2) => {
    if (!activeSlot) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < currentSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : currentSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentSuggestions[highlightedIndex]) {
        selectCountry(currentSuggestions[highlightedIndex].name, slot);
      } else if (country1 && country2) {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setActiveSlot(null);
    } else if (e.key === 'Tab' && slot === 1 && !e.shiftKey) {
      if (currentSuggestions[highlightedIndex]) {
        e.preventDefault();
        selectCountry(currentSuggestions[highlightedIndex].name, 1);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled) return;

    const c1 = country1.trim();
    const c2 = country2.trim();

    if (!c1 || !c2) {
      setValidationError('Please select two neighboring sovereign countries.');
      return;
    }

    if (c1.toLowerCase() === c2.toLowerCase()) {
      setValidationError('Please select two distinct countries.');
      return;
    }

    // Check if already guessed
    const isDuplicate = alreadyGuessedPairs.some(
      ([g1, g2]) =>
        (g1.toLowerCase() === c1.toLowerCase() && g2.toLowerCase() === c2.toLowerCase()) ||
        (g1.toLowerCase() === c2.toLowerCase() && g2.toLowerCase() === c1.toLowerCase())
    );

    if (isDuplicate) {
      setValidationError(`You already submitted ${c1} and ${c2}.`);
      return;
    }

    // Check if they share a land border
    if (!doShareLandBorder(c1, c2)) {
      setValidationError(`Notice: ${c1} and ${c2} do not share a recognized land border.`);
      // We still allow submitting after gentle warning or user can adjust
      // Per instructions: "prioritize Country 2... still allow free typing with a gentle validation message if they don't share a border."
    }

    // Call submit
    onMakeGuess(c1, c2);

    // Reset slot 2, keep locked country in slot 1 if locked
    if (!lockedCountry) {
      setCountry1('');
      setQuery1('');
      setCountry2('');
      setQuery2('');
      input1Ref.current?.focus();
    } else {
      setCountry2('');
      setQuery2('');
      input2Ref.current?.focus();
    }
    setValidationError(null);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col gap-2">
      {/* Validation alert banner */}
      {validationError && (
        <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-mono animate-fade-in shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Two-Slot Input Container */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#090f1d] border border-slate-800 p-2 rounded-xl shadow-xl focus-within:border-cyan-500/60 transition-all"
      >
        {/* Slot 1: Country A */}
        <div className="relative flex-1">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus-within:border-cyan-400 transition-colors">
            {lockedCountry ? (
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <input
              ref={input1Ref}
              type="text"
              value={query1}
              disabled={disabled || Boolean(lockedCountry)}
              onChange={(e) => {
                setQuery1(e.target.value);
                setCountry1(e.target.value);
                setActiveSlot(1);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                if (!lockedCountry) {
                  setActiveSlot(1);
                  setHighlightedIndex(0);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              placeholder="FIRST COUNTRY..."
              className="w-full bg-transparent focus:outline-none placeholder:text-slate-600 disabled:opacity-75 uppercase tracking-wide font-medium"
            />
            {lockedCountry && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                LOCKED
              </span>
            )}
          </div>
        </div>

        {/* Tactical Link Indicator */}
        <div className="hidden sm:flex items-center justify-center text-slate-600 font-mono text-xs px-0.5">
          <span className="text-cyan-400/80 font-bold">⇌</span>
        </div>

        {/* Slot 2: Country B */}
        <div className="relative flex-1">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus-within:border-cyan-400 transition-colors">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              ref={input2Ref}
              type="text"
              value={query2}
              disabled={disabled}
              onChange={(e) => {
                setQuery2(e.target.value);
                setCountry2(e.target.value);
                setActiveSlot(2);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                setActiveSlot(2);
                setHighlightedIndex(0);
              }}
              onKeyDown={(e) => handleKeyDown(e, 2)}
              placeholder="SECOND COUNTRY..."
              className="w-full bg-transparent focus:outline-none placeholder:text-slate-600 uppercase tracking-wide font-medium"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || !country1.trim() || !country2.trim()}
          className="sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-[#090f1d] disabled:text-slate-500 font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/10 cursor-pointer disabled:cursor-not-allowed uppercase"
        >
          <span>SUBMIT</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Autocomplete Dropdown List */}
      {activeSlot !== null && currentSuggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-40 top-full mt-1.5 w-full bg-[#0a1120] border border-slate-700/80 rounded-xl shadow-2xl max-h-64 overflow-y-auto font-mono text-xs backdrop-blur-xl divide-y divide-slate-800/60"
        >
          {activeSlot === 2 && country1 && (
            <div className="px-3 py-1.5 bg-slate-900/80 text-[10px] text-cyan-400 font-bold border-b border-slate-800 flex items-center justify-between">
              <span>LAND NEIGHBORS OF {country1.toUpperCase()}</span>
              <span className="text-slate-500 font-normal">RECOMMENDED</span>
            </div>
          )}

          {currentSuggestions.map((item, idx) => {
            const isNeighbor =
              activeSlot === 2 && country1 && getLandNeighbors(country1).includes(item.name);
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                key={item.name}
                type="button"
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => selectCountry(item.name, activeSlot)}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                  isHighlighted
                    ? 'bg-cyan-500/20 text-cyan-100'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-[10px] text-slate-500 font-semibold">{item.isoA2}</span>
                  <span className="font-medium tracking-wide">{item.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isNeighbor && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                      NEIGHBOR
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{item.continent}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
