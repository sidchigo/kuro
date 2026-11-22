<script lang="ts">
  import type { WatchlistItem, RecentSeedItem, SeenItem, User } from '$lib/types';
  import PosterImage from './PosterImage.svelte';
  import AccentSwitcher from './AccentSwitcher.svelte';

  interface Props {
    currentUser: User | null;
    onOpenAuth: () => void;
    sortedWatchlist: WatchlistItem[];
    recentSeeds: RecentSeedItem[];
    seenList: SeenItem[];
    onSelectWatchlistSeed: (item: WatchlistItem) => void;
    onWatchlistMarkSeen: (item: WatchlistItem) => void;
    onRemoveWatchlist: (id: number) => void;
    onLoadRecentSeed: (seed: RecentSeedItem) => void;
    onRateSeenMovie: (id: number, rating: number) => void;
    onUndoSeen: (id: number) => void;
    onClearSeen: () => void;
  }

  let {
    currentUser,
    onOpenAuth,
    sortedWatchlist,
    recentSeeds,
    seenList,
    onSelectWatchlistSeed,
    onWatchlistMarkSeen,
    onRemoveWatchlist,
    onLoadRecentSeed,
    onRateSeenMovie,
    onUndoSeen,
    onClearSeen,
  }: Props = $props();
</script>

<aside
  class="hidden lg:flex sticky top-0 h-screen p-8 flex-col justify-between border-l border-[#262629] overflow-y-auto select-none"
>
  <div class="space-y-6">
    <!-- Top Header with Unrestricted Library Trigger -->
    <div class="flex items-center justify-between pb-3 border-b border-[#262629]">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs uppercase tracking-widest text-[#F2EFE9]">
          MY ARCHIVE
        </span>
        {#if currentUser}
          <span class="font-mono text-[9px] text-[#8A8882] select-text">
            @{currentUser.username}
          </span>
        {/if}
      </div>
      {#if currentUser}
        <a
          href="/archive"
          class="font-mono text-[9px] uppercase text-accent hover:text-[#F2EFE9] border border-[#262629] hover:border-accent px-2 py-0.5 transition-colors"
        >
          [EXPAND]
        </a>
      {/if}
    </div>

    <!-- 1. Plan to Watch (Watchlist) -->
    <div>
      <div class="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
        <span class="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
          PLAN TO WATCH {currentUser ? `(${sortedWatchlist.length})` : ''}
        </span>
      </div>

      {#if !currentUser}
        <div class="border border-[#262629] p-3 bg-[#0A0A0B]">
          <p class="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
            SIGN IN TO ACCESS YOUR SAVED WATCHLIST
          </p>
          <button
            type="button"
            onclick={onOpenAuth}
            class="font-mono text-[9px] text-accent hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-accent px-2 py-1 transition-colors"
          >
            [SIGN IN / REGISTER]
          </button>
        </div>
      {:else if sortedWatchlist.length === 0}
        <p class="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
          NO FILMS SAVED
        </p>
      {:else}
        <div class="space-y-2 max-h-56 overflow-y-auto">
          {#each sortedWatchlist as item (item.id)}
            <div
              class="border border-[#262629] p-2 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex gap-2.5"
            >
              <div class="w-9 h-12 shrink-0 bg-[#121214] border border-[#262629] overflow-hidden">
                <PosterImage
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  fallbackLabel="PLAN"
                />
              </div>
              <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <p class="font-serif text-sm leading-tight text-[#F2EFE9] truncate">
                    {item.title}
                  </p>
                  <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-0.5 tracking-wider">
                    {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                  </p>
                </div>
                <div class="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-[#262629] font-mono text-[9px]">
                  <button
                    type="button"
                    onclick={() => onSelectWatchlistSeed(item)}
                    class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] transition-colors uppercase"
                  >
                    [USE AS BASE]
                  </button>
                  <button
                    type="button"
                    onclick={() => onWatchlistMarkSeen(item)}
                    class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-accent hover:border-accent transition-colors uppercase"
                  >
                    [SEEN]
                  </button>
                  <button
                    type="button"
                    onclick={() => onRemoveWatchlist(item.id)}
                    class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-accent transition-colors uppercase ml-auto"
                    title="Remove from watchlist"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 2. Recent Searches (With Saved Sentence Quote & 1-Click Restore) -->
    <div>
      <div class="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
        <span class="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
          RECENT SEARCHES {currentUser ? `(${recentSeeds.length})` : ''}
        </span>
      </div>

      {#if !currentUser}
        <div class="border border-[#262629] p-3 bg-[#0A0A0B]">
          <p class="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
            SIGN IN TO SAVE YOUR SEARCH HISTORY
          </p>
          <button
            type="button"
            onclick={onOpenAuth}
            class="font-mono text-[9px] text-accent hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-accent px-2 py-1 transition-colors"
          >
            [SIGN IN / REGISTER]
          </button>
        </div>
      {:else if recentSeeds.length === 0}
        <p class="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
          NO RECENT SEARCHES
        </p>
      {:else}
        <div class="space-y-2">
          {#each recentSeeds as seed (seed.id)}
            <div class="border border-[#262629] p-2 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="font-serif text-sm leading-tight text-[#F2EFE9] truncate">
                    {seed.title}
                  </p>
                  <p class="font-mono text-[9px] text-[#8A8882] uppercase mt-0.5 tracking-wider">
                    {seed.year || '----'} · [{seed.originalLanguage || 'EN'}]
                  </p>
                  {#if seed.sentence}
                    <p
                      class="font-serif italic text-[11px] text-[#8A8882] mt-1.5 line-clamp-1 border-l border-accent pl-1.5"
                    >
                      "{seed.sentence}"
                    </p>
                  {/if}
                </div>
                <button
                  type="button"
                  onclick={() => onLoadRecentSeed(seed)}
                  class="font-mono text-[9px] text-[#8A8882] hover:text-accent border border-[#262629] hover:border-accent px-1.5 py-0.5 shrink-0 transition-colors uppercase mt-0.5"
                >
                  LOAD →
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- 3. Already Seen Archive (With Interactive Star Ratings) -->
    <div>
      <div class="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
        <span class="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
          ALREADY SEEN {currentUser ? `(${seenList.length})` : ''}
        </span>
        {#if currentUser && seenList.length > 0}
          <button
            type="button"
            onclick={onClearSeen}
            class="font-mono text-[9px] text-[#8A8882] hover:text-accent hover:border-accent border border-[#262629] px-1.5 py-0.5 transition-colors uppercase"
          >
            [CLEAR]
          </button>
        {/if}
      </div>

      {#if !currentUser}
        <div class="border border-[#262629] p-3 bg-[#0A0A0B]">
          <p class="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
            SIGN IN TO MAINTAIN YOUR SEEN BLACKLIST & STAR RATINGS
          </p>
          <button
            type="button"
            onclick={onOpenAuth}
            class="font-mono text-[9px] text-accent hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-accent px-2 py-1 transition-colors"
          >
            [SIGN IN / REGISTER]
          </button>
        </div>
      {:else if seenList.length === 0}
        <p class="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
          0 FILMS BLACKLISTED
        </p>
      {:else}
        <div class="max-h-60 overflow-y-auto divide-y divide-[#262629] border border-[#262629]">
          {#each seenList as item (item.id)}
            <div class="p-2 bg-[#0A0A0B] hover:bg-[#121214] transition-colors">
              <div class="flex items-center justify-between gap-2">
                <span class="font-serif text-sm text-[#F2EFE9] truncate pr-2">
                  {item.title} {item.year ? `(${item.year})` : ''}
                </span>
                <button
                  type="button"
                  onclick={() => onUndoSeen(item.id)}
                  class="font-mono text-[9px] text-[#8A8882] hover:text-accent hover:border-accent border border-[#262629] px-1.5 py-0.5 uppercase transition-colors shrink-0"
                >
                  [UNDO]
                </button>
              </div>
              <!-- Interactive 5-Star Rating Control -->
              <div class="flex items-center justify-between mt-1 pt-1 border-t border-[#262629]/60">
                <div class="flex items-center gap-1">
                  <span class="font-mono text-[8px] text-[#8A8882] uppercase tracking-wider mr-1">
                    RATING:
                  </span>
                  <div class="flex items-center">
                    {#each [1, 2, 3, 4, 5] as star (star)}
                      {@const isFilled = (item.rating || 0) >= star}
                      <button
                        type="button"
                        onclick={() => onRateSeenMovie(item.id, star)}
                        class="p-1 text-sm transition-transform active:scale-125 touch-manipulation {isFilled
                          ? 'text-accent'
                          : 'text-[#3E3E42] hover:text-[#8A8882]'}"
                        title="Rate {star}/5 stars"
                        aria-label="Rate {star} of 5 stars"
                      >
                        ★
                      </button>
                    {/each}
                  </div>
                </div>
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
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Color Accent Switcher -->
  <div class="pt-4 border-t border-[#262629] mt-6 flex items-center justify-between">
    <AccentSwitcher />
  </div>
</aside>
