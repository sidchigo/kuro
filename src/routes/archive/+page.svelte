<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { createLibraryStore } from '$lib/stores/library.svelte';
  import PosterImage from '$lib/../components/PosterImage.svelte';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // svelte-ignore state_referenced_locally
  const library = createLibraryStore({
    watchlist: data.watchlist,
    seenList: data.seenList,
    recentSeeds: data.recentSeeds,
  });

  let activeTab = $state<'watchlist' | 'seen' | 'recent'>('watchlist');
  let filterQuery = $state('');
  let layoutMode = $state<'list' | 'grid'>('list');

  onMount(() => {
    try {
      const saved = localStorage.getItem('kuro_archive_layout');
      if (saved === 'list' || saved === 'grid') {
        layoutMode = saved;
      }
    } catch {
      // LocalStorage unavailable
    }
  });

  function setLayoutMode(mode: 'list' | 'grid') {
    layoutMode = mode;
    try {
      localStorage.setItem('kuro_archive_layout', mode);
    } catch {
      // LocalStorage unavailable
    }
  }

  let gridClass = $derived(
    layoutMode === 'list'
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-4'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4'
  );

  let filteredWatchlist = $derived.by(() => {
    if (!filterQuery.trim()) return library.watchlist;
    const q = filterQuery.toLowerCase();
    return library.watchlist.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q))
    );
  });

  let filteredSeenList = $derived.by(() => {
    if (!filterQuery.trim()) return library.seenList;
    const q = filterQuery.toLowerCase();
    return library.seenList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q))
    );
  });

  let filteredRecentSeeds = $derived.by(() => {
    if (!filterQuery.trim()) return library.recentSeeds;
    const q = filterQuery.toLowerCase();
    return library.recentSeeds.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.sentence && m.sentence.toLowerCase().includes(q))
    );
  });

  function handleUseAsSeed(movieId: number) {
    goto(`/?seed=${movieId}`);
  }

  function handleRestoreRecent(movieId: number, sentence?: string) {
    const query = new URLSearchParams({ seed: String(movieId) });
    if (sentence) query.set('sentence', sentence);
    goto(`/?${query.toString()}`);
  }
</script>

<svelte:head>
  <title>kuro. // Archive</title>
  <meta name="description" content="Your complete horror archive, watchlist, and custom ratings." />
</svelte:head>

<div class="min-h-screen bg-[#0A0A0B] flex flex-col select-none text-[#F2EFE9]">
  <!-- Top Header Bar -->
  <header
    class="h-12 sm:h-16 px-3 sm:px-6 lg:px-12 border-b border-[#262629] bg-[#0A0A0B] sticky top-0 z-30 flex items-center justify-between gap-3 shrink-0"
  >
    <div class="flex items-center gap-4 sm:gap-6 min-w-0">
      <div class="flex items-baseline gap-2 shrink-0">
        <a href="/" class="font-serif text-xl sm:text-2xl font-normal text-[#F2EFE9] hover:opacity-80 transition-opacity">
          kuro<span class="text-accent" style="color: var(--accent);">.</span>
        </a>
        <span class="font-mono text-xs uppercase text-[#8A8882] tracking-widest hidden sm:inline">
          // ARCHIVE
        </span>
      </div>

      <!-- Segmented Navigation Toggle -->
      <nav
        class="hidden sm:inline-flex items-stretch border border-[#262629] divide-x divide-[#262629] font-mono text-[11px] tracking-wider uppercase"
      >
        <button
          type="button"
          onclick={() => (activeTab = 'watchlist')}
          class="h-9 px-4 whitespace-nowrap transition-colors {activeTab === 'watchlist'
            ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
            : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
        >
          PLAN TO WATCH ({library.watchlist.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'seen')}
          class="h-9 px-4 whitespace-nowrap transition-colors {activeTab === 'seen'
            ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
            : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
        >
          ALREADY SEEN ({library.seenList.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'recent')}
          class="h-9 px-4 whitespace-nowrap transition-colors hidden md:inline-flex items-center {activeTab === 'recent'
            ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
            : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
        >
          RECENT SEARCHES ({library.recentSeeds.length})
        </button>
      </nav>
    </div>

    <!-- Right Actions: Layout Toggle, Filter & Return to Engine -->
    <div class="flex items-center gap-2.5 sm:gap-4 shrink-0">
      <!-- Desktop Layout Switcher: List vs Grid -->
      <div class="hidden sm:inline-flex items-center border border-[#262629] divide-x divide-[#262629] font-mono text-[10px]">
        <button
          type="button"
          onclick={() => setLayoutMode('list')}
          class="h-9 px-2.5 uppercase transition-colors {layoutMode === 'list'
            ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
            : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          title="List View"
        >
          LIST
        </button>
        <button
          type="button"
          onclick={() => setLayoutMode('grid')}
          class="h-9 px-2.5 uppercase transition-colors {layoutMode === 'grid'
            ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
            : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          title="Grid View"
        >
          GRID
        </button>
      </div>

      <div class="relative hidden sm:block">
        <input
          type="text"
          bind:value={filterQuery}
          placeholder="FILTER BY TITLE..."
          class="w-44 lg:w-60 h-9 bg-[#121214] border border-[#262629] pl-2.5 pr-8 font-mono text-[10px] uppercase text-[#F2EFE9] placeholder:text-[#8A8882] focus:border-[#F2EFE9] focus:outline-none transition-colors"
        />
        {#if filterQuery}
          <button
            type="button"
            onclick={() => (filterQuery = '')}
            aria-label="Clear filter"
            class="absolute inset-y-0 right-0 w-8 flex items-center justify-center font-mono text-[11px] leading-none text-[#8A8882] hover:text-[#F2EFE9] transition-colors"
          >
            ✕
          </button>
        {/if}
      </div>

      <a
        href="/"
        class="h-8 sm:h-9 inline-flex items-center font-mono text-xs uppercase px-2.5 sm:px-3 border border-[#262629] hover:border-accent hover:text-accent text-[#F2EFE9] transition-colors gap-1.5"
      >
        <span>[← ENGINE]</span>
      </a>
    </div>
  </header>

  <!-- Mobile Segmented Navigation Strip -->
  <nav
    class="sm:hidden grid grid-cols-3 border-b border-[#262629] divide-x divide-[#262629] bg-[#0A0A0B] font-mono text-[10px] tracking-wider uppercase shrink-0 sticky top-12 z-20"
  >
    <button
      type="button"
      onclick={() => (activeTab = 'watchlist')}
      class="h-9 transition-colors {activeTab === 'watchlist'
        ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
        : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
    >
      PLAN ({library.watchlist.length})
    </button>
    <button
      type="button"
      onclick={() => (activeTab = 'seen')}
      class="h-9 transition-colors {activeTab === 'seen'
        ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
        : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
    >
      SEEN ({library.seenList.length})
    </button>
    <button
      type="button"
      onclick={() => (activeTab = 'recent')}
      class="h-9 transition-colors {activeTab === 'recent'
        ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
        : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
    >
      RECENTS
    </button>
  </nav>

  <!-- Mobile Filter & Layout Toggle Strip -->
  <div class="sm:hidden border-b border-[#262629] bg-[#121214] px-3 py-2 shrink-0 flex items-center gap-2">
    <div class="relative flex-1 h-8">
      <input
        type="text"
        bind:value={filterQuery}
        placeholder="FILTER BY TITLE..."
        class="w-full h-full bg-[#0A0A0B] border border-[#262629] pl-2.5 pr-8 font-mono text-[10px] uppercase text-[#F2EFE9] placeholder:text-[#8A8882] focus:border-[#F2EFE9] focus:outline-none transition-colors"
      />
      {#if filterQuery}
        <button
          type="button"
          onclick={() => (filterQuery = '')}
          aria-label="Clear filter"
          class="absolute inset-y-0 right-0 w-8 flex items-center justify-center font-mono text-[11px] leading-none text-[#8A8882] hover:text-[#F2EFE9] transition-colors"
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- Mobile Layout Switcher: List (One by One) vs Grid (Two Column) -->
    <div class="inline-flex items-stretch h-8 border border-[#262629] divide-x divide-[#262629] font-mono text-[10px] shrink-0">
      <button
        type="button"
        onclick={() => setLayoutMode('list')}
        class="px-2.5 flex items-center justify-center uppercase transition-colors {layoutMode === 'list'
          ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
          : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
        title="1-column list (one by one)"
      >
        LIST
      </button>
      <button
        type="button"
        onclick={() => setLayoutMode('grid')}
        class="px-2.5 flex items-center justify-center uppercase transition-colors {layoutMode === 'grid'
          ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
          : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
        title="2-column grid"
      >
        GRID
      </button>
    </div>
  </div>

  <!-- Main Content Area -->
  <main class="flex-1 px-3 py-4 sm:p-6 lg:p-12">
    <div class="max-w-7xl mx-auto">
      <!-- 1. PLAN TO WATCH TAB -->
      {#if activeTab === 'watchlist'}
        <div>
          <div class="flex items-baseline justify-between mb-3 sm:mb-6 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              PLAN TO WATCH // {filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
          </div>

          {#if filteredWatchlist.length === 0}
            <div class="py-12 sm:py-24 text-center border border-[#262629] bg-[#0A0A0B]">
              <p class="font-serif text-xl sm:text-2xl text-[#8A8882]">
                {filterQuery ? 'NO MATCHING SAVED FILMS FOUND' : 'YOUR WATCHLIST IS EMPTY'}
              </p>
              <p class="font-mono text-[10px] sm:text-xs text-[#8A8882]/60 uppercase tracking-widest mt-2">
                {filterQuery
                  ? 'TRY CLEARING YOUR SEARCH FILTER'
                  : 'CLICK [+ PLAN] ON ANY DISCOVERY RESULT TO SAVE IT HERE'}
              </p>
            </div>
          {:else}
            <div class={gridClass}>
              {#each filteredWatchlist as item (item.id)}
                {#if layoutMode === 'list'}
                  <!-- List Mode: Horizontal Ticket Card (One by One) -->
                  <div
                    class="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-row group p-2.5 gap-3"
                  >
                    <div class="w-20 sm:w-24 shrink-0 aspect-[2/3] bg-[#121214] border border-[#262629] overflow-hidden">
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackLabel="PLAN"
                      />
                    </div>

                    <div class="flex-1 flex flex-col justify-between min-w-0">
                      <!-- Top Title & Cross Action Row -->
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <h3 class="font-serif text-base sm:text-lg leading-tight text-[#F2EFE9] line-clamp-2" title={item.title}>
                            {item.title}
                          </h3>
                          <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                            {item.year || '----'} · [{item.originalLanguage || 'EN'}]{item.director
                              ? ` · ${item.director}`
                              : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onclick={() => library.removeFromWatchlist(item.id)}
                          class="w-6 h-6 border border-[#262629] bg-[#0A0A0B] hover:bg-accent hover:text-[#0A0A0B] hover:border-accent text-[#8A8882] flex items-center justify-center font-mono text-xs transition-colors touch-manipulation shrink-0"
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </div>

                      <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#262629] font-mono text-[9px] uppercase">
                        <button
                          type="button"
                          onclick={() => handleUseAsSeed(item.id)}
                          class="py-1.5 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] text-center transition-colors touch-manipulation"
                        >
                          [SEED]
                        </button>
                        <button
                          type="button"
                          onclick={() => library.toggleSeen(item)}
                          class="py-1.5 border border-[#262629] hover:border-accent hover:text-accent text-[#8A8882] text-center transition-colors touch-manipulation"
                        >
                          [SEEN]
                        </button>
                      </div>
                    </div>
                  </div>
                {:else}
                  <!-- Grid Mode: Vertical Poster Card -->
                  <div
                    class="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col group p-2 sm:p-2.5"
                  >
                    <div class="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden relative">
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackLabel="PLAN"
                      />
                      <button
                        type="button"
                        onclick={() => library.removeFromWatchlist(item.id)}
                        class="absolute top-1.5 right-1.5 w-6 h-6 bg-[#0A0A0B]/80 hover:bg-accent hover:text-[#0A0A0B] text-[#F2EFE9] border border-[#262629] flex items-center justify-center font-mono text-xs transition-colors"
                        title="Remove from watchlist"
                      >
                        ✕
                      </button>
                    </div>

                    <div class="pt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 class="font-serif text-base leading-tight text-[#F2EFE9] line-clamp-1" title={item.title}>
                          {item.title}
                        </h3>
                        <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                          {item.year || '----'} · [{item.originalLanguage || 'EN'}]{item.director
                            ? ` · ${item.director}`
                            : ''}
                        </p>
                      </div>

                      <div class="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-[#262629] font-mono text-[9px] uppercase">
                        <button
                          type="button"
                          onclick={() => handleUseAsSeed(item.id)}
                          class="py-1 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] text-center transition-colors"
                        >
                          [SEED]
                        </button>
                        <button
                          type="button"
                          onclick={() => library.toggleSeen(item)}
                          class="py-1 border border-[#262629] hover:border-accent hover:text-accent text-[#8A8882] text-center transition-colors"
                        >
                          [SEEN]
                        </button>
                      </div>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- 2. ALREADY SEEN TAB -->
      {#if activeTab === 'seen'}
        <div>
          <div class="flex items-baseline justify-between mb-3 sm:mb-6 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              ALREADY SEEN // {filteredSeenList.length} {filteredSeenList.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
            {#if library.seenList.length > 0}
              <button
                type="button"
                onclick={() => {
                  if (confirm('Clear entire seen blacklist?')) {
                    library.clearSeen();
                  }
                }}
                class="font-mono text-[10px] uppercase text-[#8A8882] hover:text-accent transition-colors"
              >
                [CLEAR ALL SEEN]
              </button>
            {/if}
          </div>

          {#if filteredSeenList.length === 0}
            <div class="py-12 sm:py-24 text-center border border-[#262629] bg-[#0A0A0B]">
              <p class="font-serif text-xl sm:text-2xl text-[#8A8882]">
                {filterQuery ? 'NO MATCHING SEEN FILMS FOUND' : 'NO SEEN FILMS RECORDED'}
              </p>
              <p class="font-mono text-[10px] sm:text-xs text-[#8A8882]/60 uppercase tracking-widest mt-2">
                FILMS MARKED AS SEEN ARE AUTOMATICALLY BLACKLISTED FROM FUTURE RECOMMENDATIONS
              </p>
            </div>
          {:else}
            <div class={gridClass}>
              {#each filteredSeenList as item (item.id)}
                {#if layoutMode === 'list'}
                  <!-- List Mode: Horizontal Ticket Card (One by One) with Wide Star Rating -->
                  <div
                    class="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-row group p-2.5 gap-3"
                  >
                    <div class="w-20 sm:w-24 shrink-0 aspect-[2/3] bg-[#121214] border border-[#262629] overflow-hidden">
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackLabel="SEEN"
                      />
                    </div>

                    <div class="flex-1 flex flex-col justify-between min-w-0">
                      <!-- Top Title & Cross Action Row -->
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <h3 class="font-serif text-base sm:text-lg leading-tight text-[#F2EFE9] line-clamp-2" title={item.title}>
                            {item.title}
                          </h3>
                          <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                            {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                          </p>
                        </div>
                        <button
                          type="button"
                          onclick={() => library.undoSeen(item.id)}
                          class="w-6 h-6 border border-[#262629] bg-[#0A0A0B] hover:bg-accent hover:text-[#0A0A0B] hover:border-accent text-[#8A8882] flex items-center justify-center font-mono text-xs transition-colors touch-manipulation shrink-0"
                          title="Remove from seen blacklist"
                        >
                          ✕
                        </button>
                      </div>

                      <div class="mt-2 pt-2 border-t border-[#262629]">
                        <div class="flex items-center justify-between mb-1.5">
                          <span class="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider">
                            RATING
                          </span>
                          {#if item.rating}
                            <span class="font-mono text-[9px] text-accent font-bold">
                              {item.rating}/5
                            </span>
                          {:else}
                            <span class="font-mono text-[8px] text-[#8A8882]/40 uppercase">
                              UNRATED
                            </span>
                          {/if}
                        </div>

                        <div class="grid grid-cols-5 border border-[#262629] bg-[#0E0E10]">
                          {#each [1, 2, 3, 4, 5] as star (star)}
                            {@const isFilled = (item.rating || 0) >= star}
                            <button
                              type="button"
                              onclick={() => library.rateSeen(item.id, star)}
                              class="h-8 flex items-center justify-center text-sm transition-all touch-manipulation active:scale-125 {isFilled
                                ? 'text-accent'
                                : 'text-[#3E3E42] hover:text-[#8A8882]'}"
                              title="Rate {star}/5 stars"
                              aria-label="Rate {star} of 5 stars"
                            >
                              ★
                            </button>
                          {/each}
                        </div>

                        <button
                          type="button"
                          onclick={() => handleUseAsSeed(item.id)}
                          class="w-full mt-2 py-1.5 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] font-mono text-[9px] uppercase text-center transition-colors touch-manipulation"
                        >
                          [USE AS SEED]
                        </button>
                      </div>
                    </div>
                  </div>
                {:else}
                  <!-- Grid Mode: Vertical Poster Card -->
                  <div
                    class="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col group p-2 sm:p-2.5"
                  >
                    <div class="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden relative">
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackLabel="SEEN"
                      />
                      <button
                        type="button"
                        onclick={() => library.undoSeen(item.id)}
                        class="absolute top-1.5 right-1.5 w-7 h-7 sm:w-6 sm:h-6 bg-[#0A0A0B]/80 hover:bg-accent hover:text-[#0A0A0B] text-[#F2EFE9] border border-[#262629] flex items-center justify-center font-mono text-xs transition-colors touch-manipulation"
                        title="Remove from seen blacklist"
                      >
                        ✕
                      </button>
                    </div>

                    <div class="pt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 class="font-serif text-base leading-tight text-[#F2EFE9] line-clamp-1" title={item.title}>
                          {item.title}
                        </h3>
                        <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                          {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                        </p>
                      </div>

                      <div class="mt-3 pt-2 border-t border-[#262629]">
                        <!-- Star Rating Strip with Enlarged Touch Targets for Mobile -->
                        <div class="flex items-center justify-between mb-1.5">
                          <span class="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider">
                            RATING
                          </span>
                          {#if item.rating}
                            <span class="font-mono text-[9px] text-accent font-bold">
                              {item.rating}/5
                            </span>
                          {:else}
                            <span class="font-mono text-[8px] text-[#8A8882]/40 uppercase">
                              UNRATED
                            </span>
                          {/if}
                        </div>

                        <div class="grid grid-cols-5 border border-[#262629] bg-[#0E0E10]">
                          {#each [1, 2, 3, 4, 5] as star (star)}
                            {@const isFilled = (item.rating || 0) >= star}
                            <button
                              type="button"
                              onclick={() => library.rateSeen(item.id, star)}
                              class="h-8 sm:h-9 flex items-center justify-center text-sm sm:text-base transition-all touch-manipulation active:scale-125 {isFilled
                                ? 'text-accent'
                                : 'text-[#3E3E42] hover:text-[#8A8882]'}"
                              title="Rate {star}/5 stars"
                              aria-label="Rate {star} of 5 stars"
                            >
                              ★
                            </button>
                          {/each}
                        </div>

                        <button
                          type="button"
                          onclick={() => handleUseAsSeed(item.id)}
                          class="w-full mt-2 py-1.5 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] font-mono text-[9px] uppercase text-center transition-colors touch-manipulation"
                        >
                          [USE AS SEED]
                        </button>
                      </div>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- 3. RECENT SEARCHES TAB -->
      {#if activeTab === 'recent'}
        <div>
          <div class="flex items-baseline justify-between mb-3 sm:mb-6 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              RECENT SEARCHES // {filteredRecentSeeds.length} {filteredRecentSeeds.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
          </div>

          {#if filteredRecentSeeds.length === 0}
            <div class="py-12 sm:py-24 text-center border border-[#262629] bg-[#0A0A0B]">
              <p class="font-serif text-xl sm:text-2xl text-[#8A8882]">NO RECENT SEARCHES RECORDED</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
              {#each filteredRecentSeeds as seed (seed.id)}
                <div
                  class="border border-[#262629] p-3 sm:p-4 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-serif text-lg leading-tight text-[#F2EFE9] line-clamp-1">
                        {seed.title}
                      </h3>
                      <span
                        class="font-mono text-[9px] text-[#8A8882] uppercase bg-[#161619] px-1.5 py-0.5 shrink-0"
                      >
                        {seed.year || '----'}
                      </span>
                    </div>
                    {#if seed.sentence}
                      <p
                        class="font-serif italic text-xs text-[#8A8882] mt-2.5 border-l-2 border-accent pl-2 line-clamp-2"
                      >
                        "{seed.sentence}"
                      </p>
                    {/if}
                  </div>

                  <button
                    type="button"
                    onclick={() => handleRestoreRecent(seed.id, seed.sentence)}
                    class="w-full mt-4 py-1.5 border border-[#262629] hover:border-accent hover:text-accent text-[#F2EFE9] font-mono text-[10px] uppercase text-center transition-colors"
                  >
                    RESTORE QUERY →
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </main>
</div>
