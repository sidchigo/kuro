import { useState, useEffect, useRef } from 'react';
import type { SeedMovie, MovieSearchResult } from '../lib/types';
import PosterImage from './PosterImage';

const QUICK_SEEDS = [
  { id: 864370, label: "Incantation '22" },
  { id: 36095, label: "Cure '97" },
  { id: 21506, label: "Noroi '05" },
];

interface SeedFilmSectionProps {
  selectedSeed: SeedMovie | null;
  onSelectSeed: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
  onClearSeed: () => void;
}

export default function SeedFilmSection({
  selectedSeed,
  onSelectSeed,
  onClearSeed,
}: SeedFilmSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced TMDB search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (movieId: number, fallbackInfo?: Partial<SeedMovie>) => {
    setShowDropdown(false);
    setSearchQuery('');
    onSelectSeed(movieId, fallbackInfo);
  };

  return (
    <section className="p-5 border-b border-[#262629] relative bg-[#0A0A0B]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-[10px] tracking-widest text-[#8A8882] uppercase">
          01 / STARTING FILM
        </span>
      </div>

      {!selectedSeed ? (
        /* Default Search & Quick Seed Chips */
        <div ref={searchContainerRef} className="space-y-3">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search horror title (e.g. Incantation, Cure)..."
              className="w-full h-11 bg-transparent border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882] focus:border-[#F2EFE9] focus:outline-none transition-colors"
            />
            {isSearching && (
              <span className="absolute right-3 top-3.5 font-mono text-[10px] text-[#8A8882] animate-pulse">
                ...
              </span>
            )}
          </div>

          {/* 250ms Debounced Dropdown Overlay */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-5 right-5 top-[76px] z-40 bg-[#0A0A0B] border border-[#262629] divide-y divide-[#262629] max-h-72 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id, item)}
                  className="w-full p-2.5 flex items-center gap-3 text-left hover:bg-[#121214] transition-colors group"
                >
                  <div className="w-8 h-12 shrink-0 overflow-hidden">
                    <PosterImage
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-8 h-12 object-cover border border-[#262629]"
                      fallbackLabel="NO PIC"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base text-[#F2EFE9] group-hover:text-[#E62E25] truncate transition-colors leading-tight">
                      {item.title}
                    </p>
                    <p className="font-mono text-[10px] text-[#8A8882] mt-0.5 tracking-wider">
                      {item.year || '----'} · [{item.originalLanguage}] · ★ {item.voteAverage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 3 Quick-Seed Chips */}
          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] text-[#8A8882] uppercase mr-1">
              POPULAR:
            </span>
            {QUICK_SEEDS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSelect(chip.id)}
                className="font-mono text-[10px] border border-[#262629] px-2 py-1 text-[#F2EFE9] hover:border-[#F2EFE9] hover:bg-[#121214] transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Selected State: Compact Horizontal Ticket Strip */
        <div className="border border-[#262629] p-2.5 flex items-start gap-3 bg-[#0A0A0B]">
          <div className="w-12 h-16 shrink-0 overflow-hidden">
            <PosterImage
              src={selectedSeed.posterUrl}
              alt={selectedSeed.title}
              className="w-12 h-16 object-cover border border-[#262629]"
              fallbackLabel="SEED"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-serif text-lg leading-tight text-[#F2EFE9] truncate">
                {selectedSeed.title}
              </p>
              <button
                type="button"
                onClick={onClearSeed}
                className="font-mono text-[10px] text-[#8A8882] hover:text-[#E62E25] border border-[#262629] hover:border-[#E62E25] px-1.5 py-0.5 shrink-0 transition-colors"
              >
                [CHANGE]
              </button>
            </div>
            <p className="font-mono text-[10px] text-[#8A8882] tracking-wider mt-0.5">
              {selectedSeed.year || '----'} · [{selectedSeed.originalLanguage}] · {selectedSeed.runtime || 90} MIN
            </p>
            {/* Keyword Pills */}
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedSeed.keywords.slice(0, 4).map((kw, i) => (
                <span
                  key={i}
                  className="font-mono text-[9px] border border-[#262629] px-1.5 py-0.5 text-[#8A8882] uppercase"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
