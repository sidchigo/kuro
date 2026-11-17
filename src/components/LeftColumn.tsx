import type { SeedMovie } from '../lib/types';
import PosterImage from './PosterImage';

const RANDOM_HORROR_POOL = [
  { id: 36095, label: "Cure '97" },
  { id: 21506, label: "Noroi: The Curse '05" },
  { id: 864370, label: "Incantation '22" },
  { id: 27324, label: "Pulse (Kairo) '01" },
  { id: 745881, label: "The Medium '21" },
  { id: 11075, label: "Audition '00" },
  { id: 41428, label: "Tetsuo: The Iron Man '89" },
  { id: 21484, label: "Possession '81" },
  { id: 409297, label: "A Dark Song '16" },
  { id: 27374, label: "Lake Mungo '09" },
  { id: 508642, label: "Gonjiam: Haunted Asylum '18" },
  { id: 74725, label: "Kill List '11" },
  { id: 1091, label: "The Thing '82" },
  { id: 348, label: "Alien '79" },
  { id: 694, label: "The Shining '80" },
  { id: 493922, label: "Hereditary '18" },
  { id: 530385, label: "Midsommar '19" },
  { id: 310131, label: "The Witch '16" },
  { id: 9392, label: "The Descent '05" },
  { id: 138843, label: "The Conjuring '13" },
  { id: 270303, label: "It Follows '15" },
  { id: 242224, label: "The Babadook '14" },
  { id: 11906, label: "Suspiria '77" },
  { id: 30497, label: "The Texas Chain Saw Massacre '74" },
  { id: 948, label: "Halloween '78" },
  { id: 9552, label: "The Exorcist '73" },
  { id: 10527, label: "Ringu '98" },
  { id: 11838, label: "Ju-on: The Grudge '02" },
  { id: 882598, label: "Smile '22" },
  { id: 913290, label: "Barbarian '22" },
  { id: 1008042, label: "Talk to Me '23" },
  { id: 82507, label: "Sinister '12" },
  { id: 565, label: "The Ring '02" },
  { id: 157547, label: "Oculus '14" },
  { id: 663712, label: "Terrifier 2 '22" },
  { id: 176, label: "Saw '04" },
  { id: 4232, label: "Scream '96" },
  { id: 377, label: "A Nightmare on Elm Street '84" },
  { id: 713704, label: "Evil Dead Rise '23" },
  { id: 2667, label: "The Blair Witch Project '99" },
  { id: 8329, label: "[REC] '07" },
  { id: 58071, label: "Insidious '10" },
  { id: 419430, label: "Get Out '17" },
  { id: 256274, label: "As Above, So Below '14" },
  { id: 9003, label: "Hellraiser '87" },
  { id: 5876, label: "The Mist '07" },
  { id: 396535, label: "Train to Busan '16" },
  { id: 17111, label: "Shutter '04" },
];

interface LeftColumnProps {
  selectedSeed: SeedMovie | null;
  onSelectSeed?: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
}

export default function LeftColumn({ selectedSeed, onSelectSeed }: LeftColumnProps) {
  const handleRandomGem = () => {
    if (!onSelectSeed) return;
    const pool = RANDOM_HORROR_POOL.filter((g) => g.id !== selectedSeed?.id);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || RANDOM_HORROR_POOL[0];
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

      {/* Bottom: Random Horror Film Shuffle Trigger */}
      <div className="pt-4 border-t border-[#262629]">
        <div className="flex items-center justify-between mb-2 font-mono text-[9px] uppercase tracking-wider text-[#8A8882]">
          <span>STARTING FILM</span>
          <span className="text-[#E62E25]">HORROR SHUFFLE</span>
        </div>
        <button
          type="button"
          onClick={handleRandomGem}
          className="w-full py-2.5 px-3 border border-[#262629] bg-[#0A0A0B] hover:border-[#E62E25] hover:bg-[#121214] transition-all font-mono text-[10px] uppercase text-[#F2EFE9] flex items-center justify-between group"
        >
          <span className="group-hover:text-[#E62E25] transition-colors">
            [RANDOM HORROR FILM]
          </span>
          <span className="text-[#8A8882] text-[9px] group-hover:text-[#F2EFE9]">
            ROLL →
          </span>
        </button>
      </div>
    </aside>
  );
}
