import { useState } from 'react';
import type { SeedMovie } from '../lib/types';
import PosterImage from './PosterImage';

interface LeftColumnProps {
  selectedSeed: SeedMovie | null;
  onSelectSeed?: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
  onToggleWatchlist?: (movie: SeedMovie) => void;
  onMarkSeen?: (movie: SeedMovie) => void;
  isInWatchlist?: boolean;
  isSeen?: boolean;
}

export default function LeftColumn({
  selectedSeed,
  onSelectSeed,
  onToggleWatchlist,
  onMarkSeen,
  isInWatchlist = false,
  isSeen = false,
}: LeftColumnProps) {
  const [isRolling, setIsRolling] = useState(false);

  const handleRandomRoll = async () => {
    if (!onSelectSeed || isRolling) return;
    setIsRolling(true);
    try {
      const res = await fetch('/api/random');
      if (res.ok) {
        const data = await res.json();
        if (data.movie) {
          onSelectSeed(data.movie.id, data.movie);
        }
      }
    } catch (err) {
      console.error('[LeftColumn] Random horror roll failed:', err);
    } finally {
      setIsRolling(false);
    }
  };

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen p-8 flex-col justify-between border-r border-[#262629] overflow-hidden select-none">
      {/* Top: Oversized Serif Wordmark & Subtitle */}
      <div>
        <h1 className="font-serif text-7xl font-normal tracking-tight text-[#F2EFE9] leading-none">
          kuro<span className="text-[#E62E25]">.</span>
        </h1>
        <p className="font-mono text-[11px] text-[#8A8882] tracking-wider uppercase mt-3 leading-relaxed">
          Horror film discovery.
        </p>
      </div>

      {/* Center: Dynamic Poster Stage */}
      <div className="my-auto w-full max-w-[280px] mx-auto">
        {selectedSeed ? (
          <div className="border border-[#262629] p-3 bg-[#0A0A0B] flex flex-col">
            <div className="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden">
              <PosterImage
                src={selectedSeed.posterUrl}
                alt={selectedSeed.title}
                className="w-full h-full object-cover"
                fallbackLabel="NO POSTER"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-[#262629]">
              <p className="font-serif text-lg leading-tight text-[#F2EFE9] truncate">
                {selectedSeed.title}
              </p>
              <p className="font-mono text-[10px] text-[#8A8882] uppercase mt-1 tracking-wider">
                {selectedSeed.director ? `DIR. ${selectedSeed.director.toUpperCase()} · ` : ''}
                {selectedSeed.year || '----'} · [{selectedSeed.originalLanguage}]
              </p>
              {(onToggleWatchlist || onMarkSeen) && (
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#262629] font-mono text-[9px]">
                  {onToggleWatchlist && (
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(selectedSeed)}
                      className={`border px-2 py-0.5 uppercase transition-colors ${
                        isInWatchlist
                          ? 'border-[#E62E25] text-[#E62E25] bg-[#E62E25]/10 hover:bg-[#E62E25] hover:text-[#0A0A0B]'
                          : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9]'
                      }`}
                    >
                      {isInWatchlist ? '[PLAN ✓]' : '[+ PLAN]'}
                    </button>
                  )}
                  {onMarkSeen && (
                    <button
                      type="button"
                      onClick={() => onMarkSeen(selectedSeed)}
                      className={`border px-2 py-0.5 uppercase transition-colors ${
                        isSeen
                          ? 'border-[#E62E25] text-[#E62E25] bg-[#E62E25]/10'
                          : 'border-[#262629] text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25]'
                      }`}
                    >
                      {isSeen ? '[SEEN ✓]' : '[MARK SEEN]'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-[#262629] aspect-[2/3] w-full flex flex-col items-center justify-center p-6 text-center bg-[#0A0A0B]">
            <span className="font-serif text-6xl text-[#262629] font-normal leading-none mb-4">
              黒
            </span>
            <span className="font-mono text-[11px] text-[#8A8882] tracking-widest uppercase">
              — 00 —
            </span>
            <p className="font-mono text-[10px] text-[#8A8882]/70 tracking-widest uppercase mt-2">
              SELECT A FILM TO START
            </p>
          </div>
        )}
      </div>

      {/* Bottom: Dynamic Live Random Horror Film Shuffle */}
      <div className="pt-4 border-t border-[#262629]">
        <div className="flex items-center justify-between mb-2 font-mono text-[9px] uppercase tracking-wider text-[#8A8882]">
          <span>STARTING FILM</span>
          <span className="text-[#E62E25]">HORROR SHUFFLE</span>
        </div>
        <button
          type="button"
          onClick={handleRandomRoll}
          disabled={isRolling}
          className="w-full py-2.5 px-3 border border-[#262629] bg-[#0A0A0B] hover:border-[#E62E25] hover:bg-[#121214] disabled:opacity-50 transition-all font-mono text-[10px] uppercase text-[#F2EFE9] flex items-center justify-between group"
        >
          <span className="group-hover:text-[#E62E25] transition-colors">
            {isRolling ? '[DISCOVERING...]' : '[RANDOM HORROR FILM]'}
          </span>
          <span className="text-[#8A8882] text-[9px] group-hover:text-[#F2EFE9]">
            {isRolling ? '···' : 'ROLL →'}
          </span>
        </button>
      </div>
    </aside>
  );
}
