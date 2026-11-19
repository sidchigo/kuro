<script lang="ts">
  import '../styles/global.css';
  import { onMount, type Snippet } from 'svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  $effect(() => {
    themeStore.syncUser(data.user);
  });

  onMount(() => {
    themeStore.init(data.user);
  });
</script>

{@render children()}
