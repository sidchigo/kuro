<script lang="ts">
  import type { WatchlistItem, SeenItem, User } from '$lib/types';

  interface Props {
    section: 'plan' | 'seen' | null;
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
          : `ALREADY SEEN ${currentUser ? `(${seenList.length})` : ''}`}
      </span>
      <button
        type="button"
        onclick={onClose}
        class="font-mono text-xs text-[#8A8882] hover:text-[#E62E25]"
      >
        ✕ CLOSE
      </button>
    </div>

    {#if !currentUser}
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
          class="border border-[#262629] hover:border-[#E62E25] text-[#E62E25] px-3 py-1 font-mono text-xs uppercase"
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
                  class="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#E62E25]"
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
              class="font-mono text-[9px] text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25] border border-[#262629] px-1.5 py-0.5 uppercase transition-colors shrink-0"
            >
              [UNDO]
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
