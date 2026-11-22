<script lang="ts">
  import type { Preset } from '$lib/types';

  interface Props {
    preset: Preset;
    onPresetChange: (preset: Preset) => void;
    canDiscover: boolean;
    isDiscovering: boolean;
    onDiscover: () => void;
  }

  let { preset, onPresetChange, canDiscover, isDiscovering, onDiscover }: Props = $props();

  const PRESET_OPTIONS: { id: Preset; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'cult', label: 'CULT GEMS' },
    { id: 'foreign', label: 'FOREIGN' },
  ];
</script>

<section class="bg-[#0A0A0B]">
  <!-- 3 Equal-Width Preset Filter Buttons -->
  <div class="grid grid-cols-3 border-b border-[#262629] divide-x divide-[#262629]">
    {#each PRESET_OPTIONS as p (p.id)}
      {@const isActive = preset === p.id}
      <button
        type="button"
        onclick={() => onPresetChange(p.id)}
        class="h-10 sm:h-11 font-mono text-[11px] tracking-wider uppercase transition-colors {isActive
          ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
          : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
      >
        {p.label}
      </button>
    {/each}
  </div>

  <!-- Full-Bleed CTA Button -->
  <button
    type="button"
    disabled={!canDiscover || isDiscovering}
    onclick={onDiscover}
    class="w-full h-12 sm:h-14 bg-[#F2EFE9] text-[#0A0A0B] font-mono text-sm font-bold tracking-wider uppercase hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all border-b border-[#262629]"
  >
    {#if isDiscovering}
      <span class="flex items-center justify-center gap-2 animate-pulse text-[#0A0A0B]">
        SEARCHING ARCHIVE...
      </span>
    {:else}
      FIND 3 MATCHES →
    {/if}
  </button>
</section>
