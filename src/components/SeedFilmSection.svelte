<script lang="ts">
  import type { SeedMovie, MovieSearchResult } from '$lib/types';
  import PosterImage from './PosterImage.svelte';

  const QUICK_SEEDS = [
    { id: 864370, label: "Incantation '22" },
    { id: 36095, label: "Cure '97" },
    { id: 21506, label: "Noroi '05" },
  ];

  interface Props {
    selectedSeed: SeedMovie | null;
    onSelectSeed: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
    onClearSeed: () => void;
    onToggleWatchlist?: (movie: SeedMovie) => void;
    onMarkSeen?: (movie: SeedMovie) => void;
    isInWatchlist?: boolean;
    isSeen?: boolean;
  }

  let {
    selectedSeed,
    onSelectSeed,
    onClearSeed,
    onToggleWatchlist,
    onMarkSeen,
    isInWatchlist = false,
    isSeen = false,
  }: Props = $props();

  let searchQuery = $state('');
  let searchResults = $state<MovieSearchResult[]>([]);
  let isSearching = $state(false);
  let showDropdown = $state(false);

  let searchContainerEl: HTMLDivElement | undefined = $state();

  // Debounced TMDB search
  $effect(() => {
    const query = searchQuery.trim();
    if (!query) {
      searchResults = [];
      isSearching = false;
      return;
    }

    isSearching = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          searchResults = data.results || [];
          showDropdown = true;
        }
      } catch {
        searchResults = [];
      } finally {
        isSearching = false;
      }
    }, 250);

    return () => clearTimeout(timer);
  });

  // Click outside listener
  $effect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerEl && !searchContainerEl.contains(e.target as Node)) {
        showDropdown = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  function handleSelect(movieId: number, fallbackInfo?: Partial<SeedMovie>) {
    showDropdown = false;
    searchQuery = '';
    onSelectSeed(movieId, fallbackInfo);
  }
</script>

<section class="p-5 border-b border-[#262629] relative bg-[#0A0A0B]">
  <div class="flex items-center justify-between mb-2.5">
    <span class="font-mono text-[10px] tracking-widest text-[#8A8882] uppercase">
      01 / STARTING FILM
    </span>
  </div>

  {#if !selectedSeed}
    <!-- Default Search & Quick Seed Chips -->
    <div bind:this={searchContainerEl} class="space-y-3">
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          onfocus={() => {
            if (searchResults.length > 0) showDropdown = true;
          }}
          placeholder="Search horror title (e.g. Incantation, Cure)..."
          class="w-full h-11 bg-transparent border border-[#262629] pl-3 pr-9 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882] focus:border-[#F2EFE9] focus:outline-none transition-colors"
        />
        {#if isSearching}
          <span
            class="absolute inset-y-0 right-0 w-9 flex items-center justify-center font-mono text-[10px] leading-none text-[#8A8882] animate-pulse"
          >
            ...
          </span>
        {:else if searchQuery}
          <button
            type="button"
            onclick={() => {
              searchQuery = '';
              searchResults = [];
              showDropdown = false;
            }}
            aria-label="Clear search"
            class="absolute inset-y-0 right-0 w-9 flex items-center justify-center font-mono text-[11px] leading-none text-[#8A8882] hover:text-[#F2EFE9] transition-colors"
          >
            ✕
          </button>
        {/if}
      </div>

      <!-- 250ms Debounced Dropdown Overlay -->
      {#if showDropdown && searchResults.length > 0}
        <div
          class="absolute left-5 right-5 top-[76px] z-40 bg-[#0A0A0B] border border-[#262629] divide-y divide-[#262629] max-h-72 overflow-y-auto"
        >
          {#each searchResults as item (item.id)}
            <button
              type="button"
              onclick={() => handleSelect(item.id, item)}
              class="w-full p-2.5 flex items-center gap-3 text-left hover:bg-[#121214] transition-colors group"
            >
              <div class="w-8 h-12 shrink-0 overflow-hidden">
                <PosterImage
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-8 h-12 object-cover border border-[#262629]"
                  fallbackLabel="NO PIC"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p
                  class="font-serif text-base text-[#F2EFE9] group-hover:text-[#E62E25] truncate transition-colors leading-tight"
                >
                  {item.title}
                </p>
                <p class="font-mono text-[10px] text-[#8A8882] mt-0.5 tracking-wider">
                  {item.year || '----'} · [{item.originalLanguage}] · ★ {item.voteAverage}
                </p>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- 3 Quick-Seed Chips -->
      <div class="pt-1 flex items-center gap-1.5 flex-wrap">
        <span class="font-mono text-[10px] text-[#8A8882] uppercase mr-1">
          POPULAR:
        </span>
        {#each QUICK_SEEDS as chip (chip.id)}
          <button
            type="button"
            onclick={() => handleSelect(chip.id)}
            class="font-mono text-[10px] border border-[#262629] px-2 py-1 text-[#F2EFE9] hover:border-[#F2EFE9] hover:bg-[#121214] transition-colors"
          >
            [{chip.label}]
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Selected State: Compact Horizontal Ticket Strip -->
    <div class="border border-[#262629] p-2.5 flex items-start gap-3 bg-[#0A0A0B]">
      <div class="w-12 h-16 shrink-0 overflow-hidden">
        <PosterImage
          src={selectedSeed.posterUrl}
          alt={selectedSeed.title}
          className="w-12 h-16 object-cover border border-[#262629]"
          fallbackLabel="SEED"
        />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="font-serif text-lg leading-tight text-[#F2EFE9] truncate">
            {selectedSeed.title}
          </p>
          <button
            type="button"
            onclick={onClearSeed}
            class="font-mono text-[10px] text-[#8A8882] hover:text-[#E62E25] border border-[#262629] hover:border-[#E62E25] px-1.5 py-0.5 shrink-0 transition-colors"
          >
            [CHANGE]
          </button>
        </div>
        <p class="font-mono text-[10px] text-[#8A8882] tracking-wider mt-0.5">
          {selectedSeed.year || '----'} · [{selectedSeed.originalLanguage}] · {selectedSeed.runtime || 90} MIN
        </p>

        <!-- Keyword Tags (Non-Interactive Flat Metadata Chips) -->
        {#if selectedSeed.keywords && selectedSeed.keywords.length > 0}
          <div class="flex items-center gap-1.5 flex-wrap mt-2 select-none">
            {#each selectedSeed.keywords.slice(0, 4) as kw, i (i)}
              <span
                class="font-mono text-[9px] bg-[#18181B] text-[#8A8882] px-2 py-0.5 tracking-wider uppercase"
              >
                {kw}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Actions: Plan to Watch & Mark Seen -->
        {#if onToggleWatchlist || onMarkSeen}
          <div class="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#262629] font-mono text-[9px]">
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
  {/if}
</section>
