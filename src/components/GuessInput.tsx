import React, { useState, useRef, useEffect, useMemo } from 'react';
import { allCountries, getLandNeighbors, doShareLandBorder } from '../utils/neighbors.ts';
import { AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    if (lockedCountry) {
      setCountry1(lockedCountry);
      setQuery1(lockedCountry);
      setActiveSlot(null);
    }
  }, [lockedCountry]);

  // Suggestions Slot 1
  const suggestions1 = useMemo(() => {
    if (!query1.trim()) return allCountries.slice(0, 10);
    const q = query1.toLowerCase().trim();
    return allCountries
      .filter((c) => c.name.toLowerCase().includes(q) || c.isoA2.toLowerCase() === q || c.isoA3.toLowerCase() === q)
      .slice(0, 10);
  }, [query1]);

  // Suggestions Slot 2
  const suggestions2 = useMemo(() => {
    const q = query2.toLowerCase().trim();
    const neighbors = country1 ? getLandNeighbors(country1) : [];

    let list = allCountries;
    if (q) {
      list = allCountries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.isoA2.toLowerCase() === q || c.isoA3.toLowerCase() === q
      );
    }

    if (country1) {
      list = [...list].sort((a, b) => {
        const aIsNeighbor = neighbors.includes(a.name);
        const bIsNeighbor = neighbors.includes(b.name);
        if (aIsNeighbor && !bIsNeighbor) return -1;
        if (!aIsNeighbor && bIsNeighbor) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return list.filter((c) => c.name.toLowerCase() !== country1.toLowerCase()).slice(0, 12);
  }, [query2, country1]);

  const currentSuggestions = activeSlot === 1 ? suggestions1 : suggestions2;

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
      setValidationError('Select two neighboring countries.');
      return;
    }

    if (c1.toLowerCase() === c2.toLowerCase()) {
      setValidationError('Please select two different countries.');
      return;
    }

    const isDuplicate = alreadyGuessedPairs.some(
      ([g1, g2]) =>
        (g1.toLowerCase() === c1.toLowerCase() && g2.toLowerCase() === c2.toLowerCase()) ||
        (g1.toLowerCase() === c2.toLowerCase() && g2.toLowerCase() === c1.toLowerCase())
    );

    if (isDuplicate) {
      setValidationError(`Already guessed ${c1} & ${c2}.`);
      return;
    }

    if (!doShareLandBorder(c1, c2)) {
      setValidationError(`Note: ${c1} and ${c2} do not share a land border.`);
    }

    onMakeGuess(c1, c2);

    // Close any open autocomplete dropdown and blur inputs so history is fully visible
    setActiveSlot(null);
    input1Ref.current?.blur();
    input2Ref.current?.blur();

    if (!lockedCountry) {
      setCountry1('');
      setQuery1('');
      setCountry2('');
      setQuery2('');
    } else {
      setCountry2('');
      setQuery2('');
    }
    setValidationError(null);
  };

  return (
    <div className="relative w-full flex flex-col gap-2 font-mono">
      {/* Validation Message */}
      {validationError && (
        <div className="flex items-center gap-2 bg-[#d92626]/10 border-2 border-[#d92626] text-[#d92626] dark:text-[#f87171] px-3 py-1.5 text-xs font-bold animate-fade-in sharp-box">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Section Heading */}
        <div className="text-[11px] font-bold tracking-wider uppercase text-black dark:text-zinc-300">
          COUNTRY PAIR SELECTION
        </div>

        {/* Dual Input Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {/* Country 1 Input */}
          <div className="relative">
            <div className="flex items-center justify-between border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 px-3.5 py-2.5 sm:py-3 text-sm text-black dark:text-zinc-100 transition-colors focus-within:border-[#d92626] dark:focus-within:border-white sharp-box">
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
                placeholder="Country 1..."
                className="w-full bg-transparent focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-bold font-mono text-xs sm:text-sm uppercase"
              />
              {lockedCountry ? (
                <span className="text-[10px] sm:text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 border border-black uppercase shrink-0">
                  LOCKED
                </span>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-600 text-xs sm:text-sm shrink-0 select-none">
                  ▾
                </span>
              )}
            </div>
          </div>

          {/* Country 2 Input */}
          <div className="relative">
            <div className="flex items-center justify-between border-2 border-black dark:border-zinc-400 bg-white dark:bg-zinc-900 px-3.5 py-2.5 sm:py-3 text-sm text-black dark:text-zinc-100 transition-colors focus-within:border-[#d92626] dark:focus-within:border-white sharp-box">
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
                placeholder={country1 ? 'Neighboring country 2...' : 'Country 2...'}
                className="w-full bg-transparent focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-bold font-mono text-xs sm:text-sm uppercase"
              />
              <span className="text-zinc-400 dark:text-zinc-600 text-xs sm:text-sm shrink-0 select-none">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button: Solid sharp button matching reference image */}
        <button
          type="submit"
          disabled={disabled || !country1.trim() || !country2.trim()}
          className="w-full py-3 sm:py-3.5 border-2 border-black dark:border-white bg-black hover:bg-zinc-800 disabled:bg-zinc-300 dark:bg-white dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 dark:text-black dark:disabled:text-zinc-600 font-mono font-black text-xs sm:text-sm tracking-widest uppercase transition-colors cursor-pointer disabled:cursor-not-allowed sharp-box flex items-center justify-center gap-2"
        >
          <span>SUBMIT ENTRY →</span>
        </button>
      </form>

      {/* Autocomplete Dropdown List */}
      {activeSlot !== null && currentSuggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-40 top-full mt-1 w-full border-2 border-black dark:border-zinc-300 bg-white dark:bg-zinc-900 shadow-2xl max-h-60 overflow-y-auto text-xs p-1 font-mono sharp-box"
        >
          {activeSlot === 2 && country1 && (
            <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-b border-black dark:border-zinc-700 mb-1 flex items-center justify-between uppercase">
              <span>Neighbors of {country1}</span>
              <span className="text-zinc-400 dark:text-zinc-500">[ RECOMMENDED ]</span>
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
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer uppercase font-bold text-xs ${
                  isHighlighted
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-black dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] opacity-60">[{item.isoA2}]</span>
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isNeighbor && (
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 border border-black uppercase">
                      NEIGHBOR
                    </span>
                  )}
                  <span className="text-[10px] opacity-60">{item.continent}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
