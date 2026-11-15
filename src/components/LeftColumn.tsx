import type { SeedMovie } from '../lib/types';
import PosterImage from './PosterImage';

interface LeftColumnProps {
  selectedSeed: SeedMovie | null;
}

export default function LeftColumn({ selectedSeed }: LeftColumnProps) {
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen p-8 flex-col justify-between border-r border-[#262629] overflow-hidden select-none">
      {/* Top: Oversized Serif Wordmark & Subtitle */}
      <div>
        <h1 className="font-serif text-7xl font-normal tracking-tight text-[#F2EFE9] leading-none">
          kuro<span className="text-[#E62E25]">.</span>
        </h1>
        <p className="font-mono text-[11px] text-[#8A8882] tracking-wider uppercase mt-3 leading-relaxed">
          One film. One sentence.<br />Zero algorithm slop.
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
              NO SEED SELECTED
            </p>
          </div>
        )}
      </div>

      {/* Bottom: Editorial Grid Colophon */}
      <div className="pt-4 border-t border-[#262629] font-mono text-[10px] text-[#8A8882] flex justify-between uppercase tracking-wider">
        <span>GRID / TOKYO EDITORIAL</span>
        <span>FINDERS ARCHIVE</span>
      </div>
    </aside>
  );
}
