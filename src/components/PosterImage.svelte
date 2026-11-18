<script lang="ts">
  interface Props {
    src?: string;
    alt: string;
    className?: string;
    fallbackLabel?: string;
  }

  let { src, alt, className = '', fallbackLabel = 'NO POSTER' }: Props = $props();

  let hasError = $state(false);

  $effect(() => {
    // Reset error state whenever src changes
    src;
    hasError = false;
  });
</script>

{#if !src || hasError}
  <div
    class="w-full h-full flex flex-col items-center justify-center bg-[#121214] border border-[#262629] p-1 text-center select-none {className}"
  >
    <span class="font-mono text-[8px] text-[#8A8882] uppercase tracking-wider">
      [{fallbackLabel}]
    </span>
  </div>
{:else}
  <img
    {src}
    {alt}
    loading="lazy"
    onerror={() => (hasError = true)}
    class={className}
  />
{/if}
