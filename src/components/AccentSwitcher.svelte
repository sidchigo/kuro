<script lang="ts">
  import { themeStore, STOCK_THEMES } from '$lib/stores/theme.svelte';

  interface Props {
    showLabel?: boolean;
    compact?: boolean;
  }

  let { showLabel = true, compact = false }: Props = $props();
</script>

<div class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
  {#if showLabel}
    <div class="flex items-center gap-1.5 text-[#8A8882]">
      <span class="w-2 h-2 inline-block shrink-0" style="background-color: var(--accent);"></span>
      <span>ACCENT</span>
    </div>
  {/if}
  <div class="flex items-center gap-1.5">
    {#each STOCK_THEMES as theme (theme.id)}
      <button
        type="button"
        onclick={() => themeStore.setTheme(theme.id)}
        class="{compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-all flex items-center justify-center border {themeStore.currentTheme === theme.id ? 'border-[#F2EFE9] scale-110' : 'border-[#262629] hover:border-[#8A8882]'}"
        style="background-color: {theme.color};"
        title={theme.label}
        aria-label="Set accent color to {theme.label}"
      >
        {#if themeStore.currentTheme === theme.id}
          <span class="w-1 h-1 bg-[#0A0A0B]"></span>
        {/if}
      </button>
    {/each}

    <!-- Custom Color Picker Swatch -->
    <label
      class="relative {compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} cursor-pointer transition-all flex items-center justify-center border {themeStore.currentTheme === 'custom' ? 'border-[#F2EFE9] scale-110' : 'border-[#262629] hover:border-[#8A8882]'}"
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
