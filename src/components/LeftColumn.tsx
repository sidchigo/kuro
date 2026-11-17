import type { SeedMovie } from '../lib/types';
import PosterImage from './PosterImage';

const CULT_HORROR_GEMS = [
  { id: 36095, label: "Cure '97" },
  { id: 21506, label: "Noroi: The Curse '05" },
  { id: 864370, label: "Incantation '22" },
  { id: 8363, label: "Pulse (Kairo) '01" },
  { id: 630656, label: "The Medium '21" },
  { id: 11003, label: "Audition '99" },
  { id: 9377, label: "Tetsuo: The Iron Man '89" },
  { id: 21484, label: "Possession '81" },
  { id: 401556, label: "A Dark Song '16" },
  { id: 27264, label: "Lake Mungo '08" },
  { id: 508763, label: "Gonjiam: Haunted Asylum '18" },
  { id: 71800, label: "Kill List '11" },
];

interface LeftColumnProps {
  selectedSeed: SeedMovie | null;
  onSelectSeed?: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
}

export default function LeftColumn({ selectedSeed, onSelectSeed }: LeftColumnProps) {
  const handleRandomGem = () => {
    if (!onSelectSeed) return;
    const pool = CULT_HORROR_GEMS.filter((g) => g.id !== selectedSeed?.id);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || CULT_HORROR_GEMS[0];
    onSelectSeed(chosen.id);
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

      {/* Bottom: Surprise Me / Random Cult Gem Trigger */}
      <div className="pt-4 border-t border-[#262629]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#8A8882]">
            CURATED VAULT
          </span>
          <span className="font-mono text-[9px] uppercase text-[#E62E25]">
            SHUFFLE
          </span>
        </div>
        <button
          type="button"
          onClick={handleRandomGem}
          className="w-full py-2 px-3 border border-[#262629] bg-[#0A0A0B] hover:border-[#E62E25] hover:bg-[#121214] transition-all font-mono text-[10px] uppercase text-[#F2EFE9] flex items-center justify-between group"
        >
          <span className="group-hover:text-[#E62E25] transition-colors flex items-center gap-1.5">
            <span>🎲</span> RANDOM CULT GEM
          </span>
          <span className="text-[#8A8882] text-[9px] group-hover:text-[#F2EFE9]">
            ROLL →
          </span>
        </button>
      </div>
    </aside>
  );
}
