<script lang="ts">
  import type { WatchlistItem, SeenItem, User } from '$lib/types';
  import { themeStore, STOCK_THEMES } from '$lib/stores/theme.svelte';

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
        class="font-mono text-xs text-[#8A8882] hover:text-accent"
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

    <!-- Bottom Accent Color Toggle: Crimson + Amber + Acid + Custom -->
    <div
      class="pt-3 border-t border-[#262629] font-mono text-[10px] uppercase tracking-wider mt-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-1.5 text-[#8A8882]">
        <span class="w-2 h-2 inline-block shrink-0" style="background-color: var(--accent);"></span>
        <span>ACCENT</span>
      </div>
      <div class="flex items-center gap-1.5">
        {#each STOCK_THEMES as theme (theme.id)}
          <button
            type="button"
            onclick={() => themeStore.setTheme(theme.id)}
            class="w-4 h-4 transition-all flex items-center justify-center border {themeStore.currentTheme === theme.id ? 'border-[#F2EFE9] scale-110' : 'border-[#262629] hover:border-[#8A8882]'}"
            style="background-color: {theme.color};"
            title="{theme.label}"
            aria-label="Set accent color to {theme.label}"
          >
            {#if themeStore.currentTheme === theme.id}
              <span class="w-1 h-1 bg-[#0A0A0B]"></span>
            {/if}
          </button>
        {/each}

        <!-- Custom Color Picker Swatch -->
        <label
          class="relative w-4 h-4 cursor-pointer transition-all flex items-center justify-center border {themeStore.currentTheme === 'custom' ? 'border-[#F2EFE9] scale-110' : 'border-[#262629] hover:border-[#8A8882]'}"
          style="background-color: {themeStore.customColor};"
          title="CUSTOM ({themeStore.customColor.toUpperCase()})"
          aria-label="Set custom accent color"
        >
          <input
            type="color"
            value={themeStore.customColor}
            oninput={(e) => themeStore.setCustomColor(e.currentTarget.value)}
            onchange={(e) => themeStore.setCustomColor(e.currentTarget.value)}
            onclick={() => themeStore.setTheme('custom')}
            class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            aria-label="Custom accent color input"
          />
          {#if themeStore.currentTheme === 'custom'}
            <span class="w-1 h-1 bg-[#0A0A0B] pointer-events-none z-10"></span>
          {:else}
            <span class="font-mono text-[8px] leading-none text-[#F2EFE9] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-bold pointer-events-none z-10 select-none">+</span>
          {/if}
        </label>
      </div>
    </div>
  </div>
{/if}
