import React, { useState, useRef, useEffect, useMemo } from 'react';
import { allCountries, getLandNeighbors, doShareLandBorder } from '../utils/neighbors.ts';
import { Search, Lock, AlertCircle, ArrowRight } from 'lucide-react';

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
      setTimeout(() => {
        input2Ref.current?.focus();
        setActiveSlot(2);
      }, 100);
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
      {/* Validation Message */}
      {validationError && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-xl text-xs font-sans animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Modern Dual-Input Card */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl shadow-xl transition-all focus-within:border-zinc-700"
      >
        {/* Country 1 Input */}
        <div className="relative flex-1">
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-sm font-sans text-zinc-100 transition-colors focus-within:border-zinc-600">
            {lockedCountry ? (
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
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
              placeholder="Country 1..."
              className="w-full bg-transparent focus:outline-none placeholder:text-zinc-600 disabled:opacity-85 font-medium tracking-tight text-sm"
            />
            {lockedCountry && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Locked
              </span>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="hidden sm:flex items-center justify-center text-zinc-600 text-xs px-0.5 font-bold">
          &amp;
        </div>

        {/* Country 2 Input */}
        <div className="relative flex-1">
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-sm font-sans text-zinc-100 transition-colors focus-within:border-zinc-600">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
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
              className="w-full bg-transparent focus:outline-none placeholder:text-zinc-600 font-medium tracking-tight text-sm"
            />
          </div>
        </div>

        {/* Submit Guess Button (Wordle / Mobbin high-contrast button) */}
        <button
          type="submit"
          disabled={disabled || !country1.trim() || !country2.trim()}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-sans font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:cursor-not-allowed uppercase"
        >
          <span>Guess</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Autocomplete Dropdown List */}
      {activeSlot !== null && currentSuggestions.length > 0 && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-40 top-full mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto text-xs backdrop-blur-2xl p-1.5"
        >
          {activeSlot === 2 && country1 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-emerald-400 border-b border-zinc-800/80 mb-1 flex items-center justify-between">
              <span>Land Neighbors of {country1}</span>
              <span className="text-zinc-500 font-normal text-[10px]">Recommended</span>
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
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  isHighlighted
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-[10px] font-mono text-zinc-500">{item.isoA2}</span>
                  <span className="font-medium tracking-tight text-sm">{item.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isNeighbor && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/25">
                      Neighbor
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-500">{item.continent}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
