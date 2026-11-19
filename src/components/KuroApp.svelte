<script lang="ts">
  import { onMount } from "svelte";
  import { invalidate, invalidateAll, replaceState } from "$app/navigation";
  import type {
    Preset,
    SeedMovie,
    SeenItem,
    RecentSeedItem,
    WatchlistItem,
    User,
  } from "$lib/types";
  import { scheduleIdleWarmup } from "$lib/embeddingClient";
  import { DEFAULT_SEED, DEFAULT_SENTENCE } from "$lib/client/defaults";
  import {
    runDiscovery,
    fetchSeedById,
    type DiscoveryResult,
  } from "$lib/client/discoveryClient";
  import {
    createLibraryStore,
    type WatchlistCandidate,
    type SeenCandidate,
  } from "$lib/stores/library.svelte";
  import { normalizeTitle } from "$lib/textUtils";
  import LeftColumn from "./LeftColumn.svelte";
  import TopBar from "./TopBar.svelte";
  import SeedFilmSection from "./SeedFilmSection.svelte";
  import SentenceCanvas from "./SentenceCanvas.svelte";
  import PresetTrigger from "./PresetTrigger.svelte";
  import ResultsStack from "./ResultsStack.svelte";
  import RightColumn from "./RightColumn.svelte";
  import MobileDrawer from "./MobileDrawer.svelte";
  import AuthModal from "./AuthModal.svelte";

  interface Props {
    initialUser: User | null;
    initialWatchlist: WatchlistItem[];
    initialSeenList: SeenItem[];
    initialRecentSeeds: RecentSeedItem[];
    authError?: string | null;
    initialSeedId?: number | null;
    initialSentence?: string | null;
  }

  let {
    initialUser,
    initialWatchlist,
    initialSeenList,
    initialRecentSeeds,
    authError = null,
    initialSeedId = null,
    initialSentence = null,
  }: Props = $props();

  // Auth & RBAC State (hydrated from +page.server.ts)
  // svelte-ignore state_referenced_locally
  let currentUser = $state<User | null>(initialUser);
  // svelte-ignore state_referenced_locally
  let isAuthModalOpen = $state(Boolean(authError));
  let isLoggingOut = $state(false);

  $effect(() => {
    if (isLoggingOut) return;
    currentUser = initialUser;
    library.sync({
      watchlist: initialWatchlist,
      seenList: initialSeenList,
      recentSeeds: initialRecentSeeds,
    });
  });

  // Archive Lists Store
  // svelte-ignore state_referenced_locally
  const library = createLibraryStore({
    watchlist: initialWatchlist,
    seenList: initialSeenList,
    recentSeeds: initialRecentSeeds,
  });

  // Core Discovery State (zero cold start)
  let selectedSeed = $state<SeedMovie | null>(DEFAULT_SEED);
  // svelte-ignore state_referenced_locally
  let sentence = $state(initialSentence || DEFAULT_SENTENCE);
  let preset = $state<Preset>("all");
  let isDiscovering = $state(false);
  let discoveryResults = $state<DiscoveryResult | null>(null);

  // Mobile Drawer
  let mobileDrawerSection = $state<"plan" | "seen" | null>(null);

  let sentenceCanvasRef: SentenceCanvas | undefined = $state();
  let resultsStackRef: ResultsStack | undefined = $state();

  let isSeedInWatchlist = $derived(library.isInWatchlist(selectedSeed));
  let isSeedSeen = $derived(library.isSeen(selectedSeed));

  onMount(async () => {
    scheduleIdleWarmup();
    try {
      localStorage.removeItem("kuro_seen_list");
      localStorage.removeItem("kuro_watchlist");
      localStorage.removeItem("kuro_recent_seeds");
    } catch {
      // LocalStorage unavailable
    }

    // Authoritative session verification on mount:
    // Query /api/auth/me to guarantee the active session matches server state,
    // protecting against stale SSR snapshots or client-side router caching.
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const serverUser: User | null = data.user || null;
        if (
          (!currentUser && serverUser) ||
          (currentUser && !serverUser) ||
          currentUser?.id !== serverUser?.id ||
          currentUser?.role !== serverUser?.role
        ) {
          currentUser = serverUser;
          if (currentUser) {
            await library.load();
          } else {
            library.reset();
          }
        }
      }
    } catch {
      // Unauthenticated or offline
    }

    // Clean transient query parameters from URL bar if present
    if (typeof window !== "undefined" && window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth_success") || url.searchParams.has("logout")) {
        url.searchParams.delete("auth_success");
        url.searchParams.delete("logout");
        const cleanPath =
          url.pathname +
          (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
          url.hash;
        replaceState(cleanPath, {});
      }
    }

    // Hydrate seed movie from URL query param if restored from Archive
    if (initialSeedId) {
      selectSeedMovie(initialSeedId);
    }
  });

  async function handleAuthSuccess(user: User) {
    currentUser = user;
    await library.load();
  }

  async function handleLogout() {
    isLoggingOut = true;
    currentUser = null;
    library.reset();

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }

    try {
      await invalidate("app:auth");
      await invalidateAll();
    } catch {
      // Ignore invalidation errors
    } finally {
      isLoggingOut = false;
      if (typeof window !== "undefined") {
        if (window.location.pathname === "/") {
          window.location.reload();
        } else {
          window.location.href = "/";
        }
      }
    }
  }

  async function selectSeedMovie(
    movieId: number,
    fallbackInfo?: Partial<SeedMovie>,
  ) {
    if (fallbackInfo?.title && fallbackInfo.posterUrl) {
      selectedSeed = fallbackInfo as SeedMovie;
    }

    const hydrated = await fetchSeedById(movieId, fallbackInfo);
    selectedSeed = hydrated;
    if (currentUser) {
      library.addRecentSeed(hydrated, sentence);
    }
  }

  async function handleDiscover() {
    if (!selectedSeed || isDiscovering) return;

    if (currentUser) {
      library.addRecentSeed(selectedSeed, sentence);
    }

    isDiscovering = true;
    discoveryResults = null;

    try {
      const result = await runDiscovery({
        seed: selectedSeed,
        sentence,
        preset,
        seenList: library.seenList,
      });
      discoveryResults = result;

      if (result.matches.length > 0) {
        setTimeout(() => {
          resultsStackRef?.scrollIntoView();
        }, 100);
      }
    } finally {
      isDiscovering = false;
    }
  }

  function handleToggleWatchlist(movie: WatchlistCandidate) {
    if (!currentUser) {
      isAuthModalOpen = true;
      return;
    }
    library.toggleWatchlist(movie);
  }

  function handleToggleSeen(movie: SeenCandidate) {
    if (!currentUser) {
      isAuthModalOpen = true;
      return;
    }

    const addedToSeen = library.toggleSeen(movie);
    if (addedToSeen && discoveryResults) {
      discoveryResults = {
        ...discoveryResults,
        matches: discoveryResults.matches.filter(
          (m) =>
            m.id !== movie.id &&
            normalizeTitle(m.title) !== normalizeTitle(movie.title),
        ),
      };
    }
  }

  function handleLoadRecentSeed(recent: RecentSeedItem) {
    selectSeedMovie(recent.id, recent);
    if (recent.sentence) {
      sentence = recent.sentence;
      setTimeout(() => {
        sentenceCanvasRef?.adjustHeight();
      }, 20);
    }
  }
</script>

<div class="w-full min-h-screen bg-[#0A0A0B] text-[#F2EFE9]">
  <!-- 3-Column Responsive Grid -->
  <div class="lg:grid lg:grid-cols-[1fr_430px_1fr] min-h-screen">
    <!-- 1. LEFT COLUMN: Oversized Branding & Dynamic Poster Stage -->
    <LeftColumn
      {selectedSeed}
      onSelectSeed={selectSeedMovie}
      onToggleWatchlist={handleToggleWatchlist}
      onMarkSeen={handleToggleSeen}
      isInWatchlist={isSeedInWatchlist}
      isSeen={isSeedSeen}
    />

    <!-- 2. CENTER COLUMN: Core 430px Interactive Strip -->
    <main
      class="w-full max-w-[430px] mx-auto min-h-screen border-x border-[#262629] flex flex-col bg-[#0A0A0B]"
    >
      <TopBar
        {currentUser}
        watchlistCount={library.watchlist.length}
        seenCount={library.seenList.length}
        onOpenAuth={() => (isAuthModalOpen = true)}
        onLogout={handleLogout}
        onToggleMobileDrawer={(section) =>
          (mobileDrawerSection =
            mobileDrawerSection === section ? null : section)}
      />

      <MobileDrawer
        section={mobileDrawerSection}
        onClose={() => (mobileDrawerSection = null)}
        {currentUser}
        onOpenAuth={() => (isAuthModalOpen = true)}
        watchlist={library.sortedWatchlist}
        seenList={library.seenList}
        onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
        onRemoveWatchlist={(id) => currentUser && library.removeFromWatchlist(id)}
        onUndoSeen={(id) => currentUser && library.undoSeen(id)}
      />

      <!-- Block 01 / SEED FILM -->
      <SeedFilmSection
        {selectedSeed}
        onSelectSeed={selectSeedMovie}
        onClearSeed={() => (selectedSeed = null)}
        onToggleWatchlist={handleToggleWatchlist}
        onMarkSeen={handleToggleSeen}
        isInWatchlist={isSeedInWatchlist}
        isSeen={isSeedSeen}
      />

      <!-- Block 02 / THE SENTENCE CANVAS -->
      <SentenceCanvas
        bind:this={sentenceCanvasRef}
        {sentence}
        onSentenceChange={(val) => (sentence = val)}
      />

      <!-- Block 03 / POOL & TRIGGER -->
      <PresetTrigger
        {preset}
        onPresetChange={(p) => (preset = p)}
        canDiscover={!!selectedSeed}
        {isDiscovering}
        onDiscover={handleDiscover}
      />

      <!-- Block 04 / RESULTS STACK -->
      <ResultsStack
        bind:this={resultsStackRef}
        {discoveryResults}
        watchlist={library.watchlist}
        seenList={library.seenList}
        onToggleWatchlist={handleToggleWatchlist}
        onUseAsSeed={(movie) => {
          selectSeedMovie(movie.id, movie);
          discoveryResults = null;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onMarkSeen={handleToggleSeen}
      />
    </main>

    <!-- 3. RIGHT COLUMN: Watchlist, Recent Seeds & Watched Archive -->
    <RightColumn
      {currentUser}
      onOpenAuth={() => (isAuthModalOpen = true)}
      sortedWatchlist={library.sortedWatchlist}
      recentSeeds={library.recentSeeds}
      seenList={library.seenList}
      onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
      onWatchlistMarkSeen={handleToggleSeen}
      onRemoveWatchlist={(id) => currentUser && library.removeFromWatchlist(id)}
      onLoadRecentSeed={handleLoadRecentSeed}
      onRateSeenMovie={(id, rating) => currentUser && library.rateSeen(id, rating)}
      onUndoSeen={(id) => currentUser && library.undoSeen(id)}
      onClearSeen={() => currentUser && library.clearSeen()}
    />
  </div>

  <!-- Auth Modal (Google 1-Click Access) -->
  <AuthModal
    isOpen={isAuthModalOpen}
    onClose={() => (isAuthModalOpen = false)}
    {authError}
  />
</div>
