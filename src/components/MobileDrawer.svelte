<script lang="ts">
  import type { WatchlistItem, SeenItem, User } from '$lib/types';
  import AccentSwitcher from './AccentSwitcher.svelte';

  interface Props {
    section: 'plan' | 'seen' | 'accent' | null;
    onClose: () => void;
    currentUser: User | null;
    onOpenAuth: () => void;
    watchlist: WatchlistItem[];
    seenList: SeenItem[];
    onSelectWatchlistSeed: (item: WatchlistItem) => void;
    onRemoveWatchlist: (id: number) => void;
    onUndoSeen: (id: number) => void;
  }

  let {
    section,
    onClose,
    currentUser,
    onOpenAuth,
    watchlist,
    seenList,
    onSelectWatchlistSeed,
    onRemoveWatchlist,
    onUndoSeen,
  }: Props = $props();
</script>

{#if section}
  <div class="lg:hidden border-b border-[#262629] bg-[#0A0A0B] p-4">
    <div class="flex items-center justify-between pb-2 mb-3 border-b border-[#262629]">
      <span class="font-mono text-xs uppercase text-[#F2EFE9] font-bold">
        {section === 'plan'
          ? `PLAN TO WATCH ${currentUser ? `(${watchlist.length})` : ''}`
          : section === 'seen'
            ? `ALREADY SEEN ${currentUser ? `(${seenList.length})` : ''}`
            : 'MANAGE ACCENTS'}
      </span>
      <div class="flex items-center gap-2">
        {#if section !== 'accent'}
          <a
            href="/archive"
            class="font-mono text-[9px] uppercase text-accent hover:text-[#F2EFE9] border border-[#262629] hover:border-accent px-1.5 py-0.5 transition-colors"
          >
            [EXPAND ARCHIVE]
          </a>
        {/if}
        <button
          type="button"
          onclick={onClose}
          class="font-mono text-xs text-[#8A8882] hover:text-accent"
        >
          ✕ CLOSE
        </button>
      </div>
    </div>

    {#if section === 'accent'}
      <div class="py-3">
        <p class="font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mb-3 leading-relaxed">
          Select a preset neo-brutalist accent or pick a custom hex color. Theme persists across all pages and sessions.
        </p>
        <div class="p-3 border border-[#262629] bg-[#121214] flex items-center justify-between">
          <AccentSwitcher />
        </div>
      </div>
    {:else if !currentUser}
      <div class="py-6 text-center border border-[#262629] p-4 bg-[#0A0A0B]">
        <p class="font-mono text-xs text-[#8A8882] uppercase mb-3">
          SIGN IN REQUIRED TO ACCESS {section === 'plan' ? 'PLAN TO WATCH' : 'SEEN ARCHIVE'}
        </p>
        <button
          type="button"
          onclick={() => {
            onClose();
            onOpenAuth();
          }}
          class="border border-[#262629] hover:border-accent text-accent px-3 py-1 font-mono text-xs uppercase"
        >
          [SIGN IN / REGISTER]
        </button>
      </div>
    {:else if section === 'plan'}
      {#if watchlist.length === 0}
        <p class="font-mono text-[10px] text-[#8A8882] py-4 text-center">0 FILMS IN WATCHLIST</p>
      {:else}
        <div class="space-y-2">
          {#each watchlist as item (item.id)}
            <div class="border border-[#262629] p-2 flex items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-serif text-sm text-[#F2EFE9] truncate">{item.title}</p>
                <p class="font-mono text-[9px] text-[#8A8882]">
                  {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                </p>
              </div>
              <div class="flex items-center gap-1 font-mono text-[9px]">
                <button
                  type="button"
                  onclick={() => {
                    onSelectWatchlistSeed(item);
                    onClose();
                  }}
                  class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9]"
                >
                  [SEED]
                </button>
                <button
                  type="button"
                  onclick={() => onRemoveWatchlist(item.id)}
                  class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-accent"
                >
                  ✕
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else if seenList.length === 0}
      <p class="font-mono text-[10px] text-[#8A8882] py-4 text-center">0 FILMS BLACKLISTED</p>
    {:else}
      <div class="max-h-60 overflow-y-auto divide-y divide-[#262629] border border-[#262629]">
        {#each seenList as item (item.id)}
          <div class="p-2 flex items-center justify-between gap-2">
            <span class="font-serif text-sm text-[#F2EFE9] truncate">{item.title}</span>
            <button
              type="button"
              onclick={() => onUndoSeen(item.id)}
              class="font-mono text-[9px] text-[#8A8882] hover:text-accent hover:border-accent border border-[#262629] px-1.5 py-0.5 uppercase transition-colors shrink-0"
            >
              [UNDO]
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Bottom Action & Accent Switcher Strip -->
    <div class="pt-3 border-t border-[#262629] mt-4 flex items-center justify-between flex-wrap gap-2">
      <AccentSwitcher />
      {#if section !== 'accent'}
        <a
          href="/archive"
          class="font-mono text-[9px] uppercase text-accent hover:text-[#F2EFE9] transition-colors ml-auto"
        >
          EXPANDED ARCHIVE →
        </a>
      {/if}
    </div>
  </div>
{/if}
