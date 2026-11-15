import type { RefObject } from 'react';
import type { HorrorMatch } from '../lib/types';
import PosterImage from './PosterImage';

interface ResultsStackProps {
  discoveryResults: {
    matches: HorrorMatch[];
    candidateCount: number;
    fallbackReason?: string;
  } | null;
  watchlist: { id: number; title: string }[];
  onToggleWatchlist: (movie: HorrorMatch) => void;
  onUseAsSeed: (movie: HorrorMatch) => void;
  onMarkSeen: (movie: HorrorMatch) => void;
  resultsRef: RefObject<HTMLDivElement | null>;
}

export default function ResultsStack({
  discoveryResults,
  watchlist,
  onToggleWatchlist,
  onUseAsSeed,
  onMarkSeen,
  resultsRef,
}: ResultsStackProps) {
  if (!discoveryResults) return null;

  const matches = discoveryResults.matches;

  return (
    <section ref={resultsRef} className="border-b border-[#262629] bg-[#0A0A0B]">
      {/* Header Row: Candidate Pool Size */}
      <div className="p-3 border-b border-[#262629] bg-[#0A0A0B] flex items-center justify-between font-mono text-[10px] text-[#8A8882] uppercase tracking-widest">
        <span>CURATED FROM {discoveryResults.candidateCount} VERIFIED CANDIDATES</span>
        {discoveryResults.fallbackReason && (
          <span className="text-[#E62E25]">[FALLBACK ENGAGED]</span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="p-8 text-center font-mono text-xs text-[#8A8882] border-b border-[#262629]">
          {discoveryResults.fallbackReason || 'ALL RECOMMENDED CANDIDATES ARE ALREADY IN YOUR SEEN ARCHIVE.'}
        </div>
      ) : (
        <div className="divide-y divide-[#262629]">
          {matches.map((movie) => {
            const redditUrl = `https://www.google.com/search?q=site:reddit.com/r/horror+"${encodeURIComponent(
              movie.title
            )}"+${movie.year}`;
            const youtubeUrl = `https://www.youtube.com/results?search_query="${encodeURIComponent(
              movie.title
            )}"+${movie.year}+horror+review`;
            const stremioUrl = movie.imdbId
              ? `stremio:///detail/movie/${movie.imdbId}`
              : `https://letterboxd.com/search/${encodeURIComponent(movie.title)}/`;

            const inWatchlist = watchlist.some((w) => w.id === movie.id);

            return (
              <article key={movie.id} className="flex bg-[#0A0A0B]">
                {/* Left 76px 2:3 TMDB Poster + Rating Badge */}
                <div className="w-[76px] shrink-0 border-r border-[#262629] relative bg-[#121214] flex flex-col justify-between">
                  <div className="w-full h-[114px] bg-[#121214] overflow-hidden">
                    <PosterImage
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-[114px] object-cover"
                      fallbackLabel="NO PIC"
                    />
                  </div>
                  <div className="bg-[#0A0A0B] border-t border-[#262629] py-1 px-0.5 text-center">
                    <span className="font-mono text-[10px] text-[#F2EFE9] font-bold tracking-tight">
                      ★ {movie.voteAverage}
                    </span>
                  </div>
                </div>

                {/* Right: Title, Metadata, Grounded Pitch, Catch Caveat & Actions */}
                <div className="p-3.5 flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <h2 className="font-serif text-xl font-normal leading-tight text-[#F2EFE9]">
                      {movie.title}
                    </h2>
                    <p className="font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mt-0.5">
                      {movie.year || '----'} · [{movie.originalLanguage}] · {movie.runtime} MIN
                    </p>

                    {/* 2-Sentence Grounded Pitch */}
                    <p className="font-sans text-xs text-[#F2EFE9]/90 leading-relaxed mt-2.5">
                      {movie.pitch}
                    </p>

                    {/* Bordered Monospace Catch Caveat */}
                    {movie.catchWarning && (
                      <div className="mt-2.5 px-2 py-1.5 border border-[#262629] bg-[#121214]">
                        <p className="font-mono text-[10px] text-[#8A8882] tracking-wide leading-relaxed">
                          <span className="text-[#E62E25] font-bold mr-1.5">CATCH:</span>
                          {movie.catchWarning}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-[#262629] flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
                    {/* Outbound Links */}
                    <div className="flex items-center gap-2 text-[#8A8882]">
                      <a
                        href={redditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#F2EFE9] transition-colors"
                      >
                        r/horror ↗
                      </a>
                      <span className="text-[#262629]">·</span>
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#F2EFE9] transition-colors"
                      >
                        YouTube ↗
                      </a>
                      <span className="text-[#262629]">·</span>
                      <a
                        href={stremioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#F2EFE9] transition-colors"
                      >
                        {movie.imdbId ? 'Stremio ↗' : 'Letterboxd ↗'}
                      </a>
                    </div>

                    {/* Utility Buttons */}
                    <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => onToggleWatchlist(movie)}
                        className={`border px-2 py-0.5 uppercase transition-colors text-[9px] ${
                          inWatchlist
                            ? 'border-[#E62E25] text-[#E62E25] bg-[#E62E25]/10 hover:bg-[#E62E25] hover:text-[#0A0A0B]'
                            : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9]'
                        }`}
                      >
                        {inWatchlist ? '[PLAN ✓]' : '[+ PLAN]'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUseAsSeed(movie)}
                        className="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] transition-colors uppercase text-[9px]"
                      >
                        [USE AS SEED]
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkSeen(movie)}
                        className="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25] transition-colors uppercase text-[9px]"
                      >
                        [MARK SEEN]
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
