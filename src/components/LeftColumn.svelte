<script lang="ts">
  import { onMount } from 'svelte';
  import type { SeedMovie } from '$lib/types';
  import PosterImage from './PosterImage.svelte';

  interface Props {
    selectedSeed: SeedMovie | null;
    onSelectSeed?: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
    onToggleWatchlist?: (movie: SeedMovie) => void;
    onMarkSeen?: (movie: SeedMovie) => void;
    isInWatchlist?: boolean;
    isSeen?: boolean;
  }

  let {
    selectedSeed,
    onSelectSeed,
    onToggleWatchlist,
    onMarkSeen,
    isInWatchlist = false,
    isSeen = false,
  }: Props = $props();

  let randomQueue = $state<SeedMovie[]>([]);
  let isFetchingBatch = false;

  async function fetchBatch() {
    if (isFetchingBatch) return;
    isFetchingBatch = true;
    try {
      const res = await fetch('/api/random?batch=true&count=15');
      if (res.ok) {
        const data = await res.json();
        if (data.movies && Array.isArray(data.movies) && data.movies.length > 0) {
          randomQueue = [...randomQueue, ...data.movies];
        }
      }
    } catch (e) {
      console.warn('[LeftColumn] Pre-fetch random horror batch error:', e);
    } finally {
      isFetchingBatch = false;
    }
  }

  onMount(() => {
    fetchBatch();
  });

  async function handleRandomRoll() {
    if (!onSelectSeed) return;

    if (randomQueue.length <= 5) {
      fetchBatch();
    }

    if (randomQueue.length > 0) {
      const [nextMovie, ...remaining] = randomQueue;
      randomQueue = remaining;
      onSelectSeed(nextMovie.id, nextMovie);
    } else {
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
      }
      fetchBatch();
    }
  }
</script>

<aside
  class="hidden lg:flex sticky top-0 h-screen p-8 flex-col justify-between border-r border-[#262629] overflow-hidden select-none"
>
  <!-- Top: Oversized Serif Wordmark & Subtitle -->
  <div>
    <h1 class="font-serif text-7xl font-normal tracking-tight text-[#F2EFE9] leading-none">
      kuro<span class="text-[#E62E25]">.</span>
    </h1>
    <p class="font-mono text-[11px] text-[#8A8882] tracking-wider uppercase mt-3 leading-relaxed">
      One film. One sentence. Three nightmares.
    </p>
  </div>

  <!-- Center: Dynamic Poster Stage -->
  <div class="my-auto w-full max-w-[280px] mx-auto">
    {#if selectedSeed}
      <div class="border border-[#262629] p-3 bg-[#0A0A0B] flex flex-col">
        <div class="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden">
          <PosterImage
            src={selectedSeed.posterUrl}
            alt={selectedSeed.title}
            className="w-full h-full object-cover"
            fallbackLabel="NO POSTER"
          />
        </div>
        <div class="mt-3 pt-3 border-t border-[#262629]">
          <p class="font-serif text-lg leading-tight text-[#F2EFE9] truncate">
            {selectedSeed.title}
          </p>
          <p class="font-mono text-[10px] text-[#8A8882] uppercase mt-1 tracking-wider">
            {selectedSeed.director ? `DIR. ${selectedSeed.director.toUpperCase()} · ` : ''}{selectedSeed.year ||
              '----'} · [{selectedSeed.originalLanguage}]
          </p>
          {#if onToggleWatchlist || onMarkSeen}
            <div class="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-[#262629] font-mono text-[9px]">
              {#if onToggleWatchlist}
                <button
                  type="button"
                  onclick={() => onToggleWatchlist(selectedSeed)}
                  class="border px-2 py-0.5 uppercase transition-colors {isInWatchlist
                    ? 'border-[#E62E25] text-[#E62E25] bg-[#E62E25]/10 hover:bg-[#E62E25] hover:text-[#0A0A0B]'
                    : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9]'}"
                >
                  {isInWatchlist ? '[PLAN ✓]' : '[+ PLAN]'}
                </button>
              {/if}
              {#if onMarkSeen}
                <button
                  type="button"
                  onclick={() => onMarkSeen(selectedSeed)}
                  class="border px-2 py-0.5 uppercase transition-colors {isSeen
                    ? 'border-[#E62E25] text-[#E62E25] bg-[#E62E25]/10'
                    : 'border-[#262629] text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25]'}"
                >
                  {isSeen ? '[SEEN ✓]' : '[MARK SEEN]'}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div
        class="border border-[#262629] aspect-[2/3] w-full flex flex-col items-center justify-center p-6 text-center bg-[#0A0A0B]"
      >
        <span class="font-serif text-6xl text-[#262629] font-normal leading-none mb-4">
          黒
        </span>
        <span class="font-mono text-[11px] text-[#8A8882] tracking-widest uppercase">
          — 00 —
        </span>
        <p class="font-mono text-[10px] text-[#8A8882]/70 tracking-widest uppercase mt-2">
          SELECT A FILM TO START
        </p>
      </div>
    {/if}
  </div>

  <!-- Bottom: Dynamic Live Random Horror Film Shuffle -->
  <div class="pt-4 border-t border-[#262629]">
    <div
      class="flex items-center justify-between mb-2 font-mono text-[9px] uppercase tracking-wider text-[#8A8882]"
    >
      <span>STARTING FILM</span>
      <span class="text-[#E62E25]">HORROR SHUFFLE</span>
    </div>
    <button
      type="button"
      onclick={handleRandomRoll}
      class="w-full py-2.5 px-3 border border-[#262629] bg-[#0A0A0B] hover:border-[#E62E25] hover:bg-[#121214] transition-all font-mono text-[10px] uppercase text-[#F2EFE9] flex items-center justify-between group"
    >
      <span class="group-hover:text-[#E62E25] transition-colors">
        [RANDOM HORROR FILM]
      </span>
      <span class="text-[#8A8882] text-[9px] group-hover:text-[#F2EFE9]">
        ROLL →
      </span>
    </button>
  </div>
</aside>
