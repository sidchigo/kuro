<script lang="ts">
  import type { HorrorMatch } from '$lib/types';
  import PosterImage from './PosterImage.svelte';

  interface Props {
    discoveryResults: {
      matches: HorrorMatch[];
      candidateCount: number;
      fallbackReason?: string;
    } | null;
    watchlist: { id: number; title: string }[];
    seenList?: { id: number; title: string }[];
    onToggleWatchlist: (movie: HorrorMatch) => void;
    onUseAsSeed: (movie: HorrorMatch) => void;
    onMarkSeen: (movie: HorrorMatch) => void;
  }

  let {
    discoveryResults,
    watchlist,
    seenList = [],
    onToggleWatchlist,
    onUseAsSeed,
    onMarkSeen,
  }: Props = $props();

  let sectionEl: HTMLElement | undefined = $state();

  export function scrollIntoView() {
    sectionEl?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

{#if discoveryResults}
  {@const matches = discoveryResults.matches}
  <section bind:this={sectionEl} class="border-b border-[#262629] bg-[#0A0A0B]">
    <!-- Fallback Notice if any -->
    {#if discoveryResults.fallbackReason}
      <div
        class="p-3 border-b border-[#262629] bg-[#0A0A0B] flex items-center justify-between font-mono text-[10px] text-accent uppercase tracking-widest"
      >
        <span>{discoveryResults.fallbackReason}</span>
      </div>
    {/if}

    {#if matches.length === 0}
      <div class="p-8 text-center font-mono text-xs text-[#8A8882] border-b border-[#262629]">
        {discoveryResults.fallbackReason || 'ALL RECOMMENDED CANDIDATES ARE ALREADY IN YOUR SEEN ARCHIVE.'}
      </div>
    {:else}
      <div class="divide-y divide-[#262629]">
        {#each matches as movie (movie.id)}
          {@const redditUrl = `https://www.google.com/search?q=site:reddit.com/r/horror+"${encodeURIComponent(movie.title)}"+${movie.year}`}
          {@const youtubeUrl = `https://www.youtube.com/results?search_query="${encodeURIComponent(movie.title)}"+${movie.year}+horror+review`}
          {@const stremioUrl = movie.imdbId
            ? `stremio:///detail/movie/${movie.imdbId}`
            : `https://letterboxd.com/search/${encodeURIComponent(movie.title)}/`}
          {@const inWatchlist = watchlist.some((w) => w.id === movie.id)}
          {@const isSeen = seenList.some((s) => s.id === movie.id)}

          <article class="flex bg-[#0A0A0B]">
            <!-- Left 76px 2:3 TMDB Poster + Rating Badge -->
            <div
              class="w-[76px] shrink-0 border-r border-[#262629] relative bg-[#121214] flex flex-col justify-between"
            >
              <div class="w-full h-[114px] bg-[#121214] overflow-hidden">
                <PosterImage
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-[114px] object-cover"
                  fallbackLabel="NO PIC"
                />
              </div>
              <div class="bg-[#0A0A0B] border-t border-[#262629] py-1 px-0.5 text-center">
                <span class="font-mono text-[10px] text-[#F2EFE9] font-bold tracking-tight">
                  ★ {movie.voteAverage}
                </span>
              </div>
            </div>

            <!-- Right: Title, Metadata, Grounded Pitch, Catch Caveat & Actions -->
            <div class="p-3.5 flex flex-col justify-between flex-1 min-w-0">
              <div>
                <h2 class="font-serif text-xl font-normal leading-tight text-[#F2EFE9]">
                  {movie.title}
                </h2>
                <p class="font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mt-0.5">
                  {movie.year || '----'} · [{movie.originalLanguage}] · {movie.runtime} MIN
                  {#if typeof movie.similarity === 'number'}
                    <span class="ml-2 text-accent font-bold">
                      · {Math.round(movie.similarity * 100)}% MATCH
                    </span>
                  {/if}
                </p>

                <!-- Zero-LLM "Why Recommended" Semantic Trope-Anchor Badge -->
                {#if movie.explanation}
                  <div class="mt-2 py-1 px-2 border-l-2 border-accent bg-[#121214] font-mono text-[10px]">
                    <span class="text-accent font-bold mr-1.5 uppercase">WHY:</span>
                    <span class="text-[#F2EFE9]/90">{movie.explanation}</span>
                  </div>
                {/if}

                <!-- 2-Sentence Grounded Pitch -->
                <p class="font-sans text-xs text-[#F2EFE9]/90 leading-relaxed mt-2.5">
                  {movie.pitch}
                </p>
              </div>

              <!-- Bottom Action Bar -->
              <div
                class="mt-3 pt-2.5 border-t border-[#262629] flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]"
              >
                <!-- Outbound Links -->
                <div class="flex items-center gap-2 text-[#8A8882]">
                  <a
                    href={redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-[#F2EFE9] transition-colors"
                  >
                    r/horror ↗
                  </a>
                  <span class="text-[#262629]">·</span>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-[#F2EFE9] transition-colors"
                  >
                    YouTube ↗
                  </a>
                  <span class="text-[#262629]">·</span>
                  <a
                    href={stremioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:text-[#F2EFE9] transition-colors"
                  >
                    {movie.imdbId ? 'Stremio ↗' : 'Letterboxd ↗'}
                  </a>
                </div>

                <!-- Utility Buttons -->
                <div class="flex items-center gap-1.5 ml-auto flex-wrap">
                  <button
                    type="button"
                    onclick={() => onToggleWatchlist(movie)}
                    class="border px-2 py-0.5 uppercase transition-colors text-[9px] {inWatchlist
                      ? 'border-accent text-accent bg-accent/10 hover:bg-accent hover:text-[#0A0A0B]'
                      : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9]'}"
                  >
                    {inWatchlist ? '[PLAN ✓]' : '[+ PLAN]'}
                  </button>
                  <button
                    type="button"
                    onclick={() => onUseAsSeed(movie)}
                    class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] transition-colors uppercase text-[9px]"
                  >
                    [USE AS SEED]
                  </button>
                  <button
                    type="button"
                    onclick={() => onMarkSeen(movie)}
                    class="border px-2 py-0.5 uppercase transition-colors text-[9px] {isSeen
                      ? 'border-accent text-accent bg-accent/10 hover:bg-accent hover:text-[#0A0A0B]'
                      : 'border-[#262629] text-[#8A8882] hover:text-accent hover:border-accent'}"
                  >
                    {isSeen ? '[SEEN ✓]' : '[MARK SEEN]'}
                  </button>
                </div>
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
{/if}
