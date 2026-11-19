<script lang="ts">
  import type { PageData } from "./$types";
  import KuroApp from "../components/KuroApp.svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>kuro. — Horror Discovery</title>
  <meta
    name="description"
    content="One film. One sentence. Three nightmares."
  />
</svelte:head>

<KuroApp
  initialUser={data.user}
  initialWatchlist={data.watchlist}
  initialSeenList={data.seenList}
  initialRecentSeeds={data.recentSeeds}
  authError={data.authError}
  initialSeedId={data.initialSeedId}
  initialSentence={data.initialSentence}
/>
