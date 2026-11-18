<script lang="ts">
  import { onMount } from "svelte";
  import type {
    Preset,
    SeedMovie,
    HorrorMatch,
    SeenItem,
    RecentSeedItem,
    WatchlistItem,
    User,
    TMDBRawMovie,
  } from "$lib/types";
  import {
    isEmbeddingWorkerSupported,
    rankMoviesWithWorker,
    scheduleIdleWarmup,
  } from "$lib/embeddingClient";
  import { createPitch, createCatchWarning } from "$lib/matchFormatters";
  import { TMDB_IMAGE_BASE } from "$lib/constants";
  import LeftColumn from "./LeftColumn.svelte";
  import SeedFilmSection from "./SeedFilmSection.svelte";
  import SentenceCanvas from "./SentenceCanvas.svelte";
  import PresetTrigger from "./PresetTrigger.svelte";
  import ResultsStack from "./ResultsStack.svelte";
  import RightColumn from "./RightColumn.svelte";
  import MobileDrawer from "./MobileDrawer.svelte";
  import AuthModal from "./AuthModal.svelte";
  import LibraryModal from "./LibraryModal.svelte";

  interface Props {
    initialUser: User | null;
    initialWatchlist: WatchlistItem[];
    initialSeenList: SeenItem[];
    initialRecentSeeds: RecentSeedItem[];
  }

  let {
    initialUser,
    initialWatchlist,
    initialSeenList,
    initialRecentSeeds,
  }: Props = $props();

  function normalizeTitle(t?: string | null): string {
    if (!t) return "";
    return t
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * Calculates deterministic taste score between a watchlist film and user's rated watched films.
   */
  function computeAffinityScore(item: WatchlistItem, seen: SeenItem[]): number {
    let score = 50;

    const ratedMovies = seen.filter(
      (s) => typeof s.rating === "number" && (s.rating || 0) > 0,
    );
    if (ratedMovies.length === 0) {
      return (item.voteAverage || 7.0) * 10;
    }

    const highRated = ratedMovies.filter((s) => (s.rating || 0) >= 4);
    const lowRated = ratedMovies.filter((s) => (s.rating || 0) <= 2);

    // 1. Director affinity
    if (item.director) {
      const dirMatchHigh = highRated.find(
        (s) =>
          s.director &&
          s.director.toLowerCase() === item.director!.toLowerCase(),
      );
      if (dirMatchHigh) score += 30;

      const dirMatchLow = lowRated.find(
        (s) =>
          s.director &&
          s.director.toLowerCase() === item.director!.toLowerCase(),
      );
      if (dirMatchLow) score -= 25;
    }

    // 2. Language / Regional affinity
    if (item.originalLanguage) {
      const langMovies = ratedMovies.filter(
        (s) =>
          s.originalLanguage &&
          s.originalLanguage.toLowerCase() ===
            item.originalLanguage!.toLowerCase(),
      );
      if (langMovies.length > 0) {
        const avgLangRating =
          langMovies.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
          langMovies.length;
        if (avgLangRating >= 4.0) score += 20;
        else if (avgLangRating <= 2.5) score -= 15;
      }
    }

    return score;
  }

  const DEFAULT_SEED: SeedMovie = {
    id: 864370,
    title: "Incantation",
    originalTitle: "咒",
    year: 2022,
    originalLanguage: "ZH",
    runtime: 111,
    director: "Kevin Ko",
    overview:
      "Six years ago, Li Ronan was cursed after breaking a religious taboo. Now, she must protect her daughter from the consequences of her actions.",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/cWz28oGV3cSajWdziVQbqrYCmnX.jpg",
    voteAverage: 6.9,
    genres: ["Horror"],
    keywords: [
      "curse",
      "occult",
      "religious cult",
      "found footage",
      "supernatural horror",
    ],
    imdbId: "tt18968540",
  };

  // --- Auth & RBAC State (Hydrated from +page.server.ts) ---
  // svelte-ignore state_referenced_locally
  let currentUser = $state<User | null>(initialUser);
  let isAuthModalOpen = $state(false);
  let isAdminPanelOpen = $state(false);

  // --- Core States (Zero Cold Start: Pre-warmed with Default Seed & Prompt) ---
  let selectedSeed = $state<SeedMovie | null>(DEFAULT_SEED);
  let sentence = $state("The creeping isolation of cult and eerie vibes");
  let preset = $state<Preset>("all");
  let isDiscovering = $state(false);
  let discoveryResults = $state<{
    matches: HorrorMatch[];
    candidateCount: number;
    fallbackReason?: string;
  } | null>(null);

  // Archive Lists (Hydrated from +page.server.ts)
  // svelte-ignore state_referenced_locally
  let watchlist = $state<WatchlistItem[]>(initialWatchlist);
  // svelte-ignore state_referenced_locally
  let seenList = $state<SeenItem[]>(initialSeenList);
  // svelte-ignore state_referenced_locally
  let recentSeeds = $state<RecentSeedItem[]>(initialRecentSeeds);

  // Mobile Drawer & Library Modal State
  let mobileDrawerSection = $state<"plan" | "seen" | null>(null);
  let isLibraryOpen = $state(false);
  let libraryTab = $state<"watchlist" | "seen" | "recent">("watchlist");

  let sentenceCanvasRef: SentenceCanvas | undefined = $state();
  let resultsStackRef: ResultsStack | undefined = $state();

  // --- Schedule Web Worker Pre-Warming & Purge Legacy LocalStorage ---
  onMount(() => {
    scheduleIdleWarmup();

    try {
      localStorage.removeItem("kuro_seen_list");
      localStorage.removeItem("kuro_watchlist");
      localStorage.removeItem("kuro_recent_seeds");
    } catch {
      // LocalStorage unavailable
    }
  });

  async function loadUserLibrary() {
    try {
      const res = await fetch("/api/user/library");
      if (res.ok) {
        const data = await res.json();
        watchlist = data.watchlist || [];
        seenList = data.seenList || [];
        recentSeeds = data.recentSeeds || [];
      }
    } catch {
      // Network error loading user library
    }
  }

  async function handleAuthSuccess(user: User) {
    currentUser = user;
    await loadUserLibrary();
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    currentUser = null;
    isAdminPanelOpen = false;
    watchlist = [];
    seenList = [];
    recentSeeds = [];
  }

  function addMovieToSeen(movie: {
    id: number;
    title: string;
    year?: number;
    director?: string;
    originalLanguage?: string;
    posterUrl?: string;
  }) {
    if (!currentUser) return;

    const newItem: SeenItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      originalLanguage: movie.originalLanguage,
      posterUrl: movie.posterUrl,
    };

    if (
      !seenList.some(
        (s) =>
          s.id === movie.id ||
          normalizeTitle(s.title) === normalizeTitle(movie.title),
      )
    ) {
      seenList = [...seenList, newItem];
    }

    watchlist = watchlist.filter(
      (w) =>
        w.id !== movie.id &&
        normalizeTitle(w.title) !== normalizeTitle(movie.title),
    );

    if (discoveryResults) {
      discoveryResults = {
        ...discoveryResults,
        matches: discoveryResults.matches.filter(
          (m) =>
            m.id !== movie.id &&
            normalizeTitle(m.title) !== normalizeTitle(movie.title),
        ),
      };
    }

    fetch("/api/user/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  }

  function addRecentSeed(movie: SeedMovie, customSentence?: string) {
    if (!currentUser) return;

    const textToSave = customSentence !== undefined ? customSentence : sentence;
    const nextItem: RecentSeedItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      originalLanguage: movie.originalLanguage,
      posterUrl: movie.posterUrl,
      director: movie.director,
      sentence: textToSave.trim() || undefined,
    };

    recentSeeds = [
      nextItem,
      ...recentSeeds.filter((s) => s.id !== movie.id),
    ].slice(0, 5);

    fetch("/api/user/recent-seeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextItem),
    }).catch(() => {});
  }

  async function selectSeedMovie(
    movieId: number,
    fallbackInfo?: Partial<SeedMovie>,
  ) {
    if (fallbackInfo && fallbackInfo.title && fallbackInfo.posterUrl) {
      selectedSeed = fallbackInfo as SeedMovie;
    }
    try {
      const res = await fetch(`/api/search?id=${movieId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.movie) {
          selectedSeed = data.movie;
          if (currentUser) {
            addRecentSeed(data.movie);
          }
          return;
        }
      }
    } catch {
      // Fallback
    }

    const constructed: SeedMovie = {
      id: movieId,
      title: fallbackInfo?.title || "Selected Horror Film",
      year: fallbackInfo?.year || 0,
      originalLanguage: fallbackInfo?.originalLanguage || "EN",
      runtime: fallbackInfo?.runtime || 90,
      director: fallbackInfo?.director || "Unknown",
      overview: fallbackInfo?.overview || "",
      posterUrl: fallbackInfo?.posterUrl,
      voteAverage: fallbackInfo?.voteAverage || 7.0,
      keywords: fallbackInfo?.keywords || ["horror"],
    };
    selectedSeed = constructed;
    if (currentUser) {
      addRecentSeed(constructed);
    }
  }

  async function handleDiscover() {
    if (!selectedSeed || isDiscovering) return;

    if (currentUser) {
      addRecentSeed(selectedSeed, sentence.trim());
    }
    isDiscovering = true;
    discoveryResults = null;

    const blacklistIds = seenList.map((s) => s.id);
    const blacklistTitles = seenList.map((s) => s.title);

    try {
      // 1. Check if dedicated Web Worker is supported in this browser
      if (isEmbeddingWorkerSupported()) {
        try {
          const candidatesRes = await fetch("/api/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movieId: selectedSeed.id,
              sentence: sentence.trim(),
              preset,
              blacklist: blacklistIds,
              blacklistTitles,
              mode: "candidates",
            }),
          });

          if (candidatesRes.ok) {
            const data = await candidatesRes.json();
            const rawCandidates = (data.candidates || []) as TMDBRawMovie[];

            const blacklistSet = new Set<number>([
              selectedSeed.id,
              ...blacklistIds,
            ]);
            const blacklistTitleSet = new Set<string>(
              [
                normalizeTitle(selectedSeed.title),
                ...blacklistTitles.map(normalizeTitle),
              ].filter(Boolean),
            );

            const filteredCandidates = rawCandidates.filter((c) => {
              if (blacklistSet.has(c.id)) return false;
              const norm = normalizeTitle(c.title);
              if (norm && blacklistTitleSet.has(norm)) return false;
              if (c.original_title) {
                const origNorm = normalizeTitle(c.original_title);
                if (origNorm && blacklistTitleSet.has(origNorm)) return false;
              }
              const rating = c.vote_average ?? 0;
              if (rating < 4.8) return false;
              const count = c.vote_count ?? 0;
              if (count < 35) return false;
              return true;
            });

            if (filteredCandidates.length === 0) {
              discoveryResults = {
                matches: [],
                candidateCount: data.candidateCount || 0,
                fallbackReason:
                  data.fallbackReason ||
                  "No horror candidates matched the filter constraints.",
              };
              return;
            }

            const queryText =
              sentence.trim() ||
              `${selectedSeed.title}. ${selectedSeed.overview || ""}`;
            const rankResult = await rankMoviesWithWorker(
              queryText,
              filteredCandidates,
            );

            const MIN_THRESHOLD = 0.22;
            const passingIds = rankResult.rankedIds.filter(
              (id) => (rankResult.scores[id] ?? 0) >= MIN_THRESHOLD,
            );
            const winningIds = (
              passingIds.length > 0 ? passingIds : rankResult.rankedIds
            ).slice(0, 3);

            let hydrationMap: Record<number, any> = {};
            try {
              const hydrateRes = await fetch("/api/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  movieId: selectedSeed.id,
                  sentence: sentence.trim(),
                  preset,
                  mode: "hydrate",
                  winningIds,
                  candidateCount:
                    data.candidateCount || filteredCandidates.length,
                }),
              });
              if (hydrateRes.ok) {
                const hydrateData = await hydrateRes.json();
                hydrationMap = hydrateData.hydration || {};
              }
            } catch {
              // Graceful hydration fallback
            }

            const candidateMap = new Map(
              filteredCandidates.map((c) => [c.id, c]),
            );
            const matches: HorrorMatch[] = winningIds.map((id) => {
              const raw = candidateMap.get(id)!;
              const extra = hydrationMap[id];
              const year = raw.release_date
                ? parseInt(raw.release_date.split("-")[0], 10)
                : 0;
              const posterPath =
                extra?.posterPath !== undefined && extra?.posterPath !== null
                  ? extra.posterPath
                  : (raw.poster_path ?? null);
              const runtime = extra?.runtime || raw.runtime || 95;

              return {
                id: raw.id,
                title: raw.title,
                year,
                originalLanguage: raw.original_language?.toUpperCase() || "EN",
                runtime,
                voteAverage: Math.round((raw.vote_average ?? 7.0) * 10) / 10,
                posterPath,
                posterUrl: posterPath
                  ? `${TMDB_IMAGE_BASE}${posterPath}`
                  : undefined,
                director: extra?.director,
                pitch: createPitch(raw),
                catchWarning: createCatchWarning(raw, runtime),
                imdbId: extra?.imdbId,
                similarity: rankResult.scores[id] ?? 0.5,
                explanation: rankResult.explanations?.[id],
                topThemes: rankResult.topThemes?.[id],
              };
            });

            discoveryResults = {
              matches,
              candidateCount: data.candidateCount || filteredCandidates.length,
            };

            setTimeout(() => {
              resultsStackRef?.scrollIntoView();
            }, 100);
            return;
          }
        } catch (workerErr) {
          console.warn(
            "[KuroApp] Web Worker ranking failed, falling back to server pipeline:",
            workerErr,
          );
        }
      }

      // Server Fallback Pipeline
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: selectedSeed.id,
          sentence: sentence.trim(),
          preset,
          blacklist: blacklistIds,
          blacklistTitles,
          mode: "full",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        discoveryResults = data;
        setTimeout(() => {
          resultsStackRef?.scrollIntoView();
        }, 100);
      } else {
        discoveryResults = {
          matches: [],
          candidateCount: 0,
          fallbackReason: "Failed to query discovery engine.",
        };
      }
    } catch {
      discoveryResults = {
        matches: [],
        candidateCount: 0,
        fallbackReason:
          "Network error communicating with horror discovery engine.",
      };
    } finally {
      isDiscovering = false;
    }
  }

  function handleToggleWatchlist(movie: {
    id: number;
    title: string;
    year?: number;
    originalLanguage?: string;
    runtime?: number;
    posterUrl?: string;
    voteAverage?: number;
    pitch?: string;
    catchWarning?: string;
    director?: string;
    similarity?: number;
    explanation?: string;
  }) {
    if (!currentUser) {
      isAuthModalOpen = true;
      return;
    }

    const exists = watchlist.some(
      (w) =>
        w.id === movie.id ||
        normalizeTitle(w.title) === normalizeTitle(movie.title),
    );

    if (exists) {
      handleRemoveFromWatchlist(movie.id);
      return;
    }

    const newItem: WatchlistItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      originalLanguage: movie.originalLanguage,
      runtime: movie.runtime,
      posterUrl: movie.posterUrl,
      voteAverage: movie.voteAverage,
      pitch: movie.pitch,
      catchWarning: movie.catchWarning,
      director: movie.director,
      similarity: movie.similarity,
      explanation: movie.explanation,
      addedAt: Date.now(),
    };

    watchlist = [newItem, ...watchlist];

    fetch("/api/user/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  }

  function handleRemoveFromWatchlist(id: number) {
    if (!currentUser) return;
    watchlist = watchlist.filter((w) => w.id !== id);

    fetch(`/api/user/watchlist?id=${id}`, { method: "DELETE" }).catch(() => {});
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

  function handleRateSeenMovie(id: number, rating: number) {
    if (!currentUser) return;
    let newRating: number | undefined;
    seenList = seenList.map((item) => {
      if (item.id === id) {
        newRating = item.rating === rating ? undefined : rating;
        return { ...item, rating: newRating };
      }
      return item;
    });

    fetch("/api/user/seen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId: id, rating: newRating }),
    }).catch(() => {});
  }

  function handleUndoSeen(id: number) {
    if (!currentUser) return;
    seenList = seenList.filter((s) => s.id !== id);

    fetch(`/api/user/seen?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  function handleToggleSeen(movie: {
    id: number;
    title: string;
    year?: number;
    director?: string;
    originalLanguage?: string;
    posterUrl?: string;
  }) {
    if (!currentUser) {
      isAuthModalOpen = true;
      return;
    }

    const matched = seenList.find(
      (s) =>
        s.id === movie.id ||
        normalizeTitle(s.title) === normalizeTitle(movie.title),
    );

    if (matched) {
      handleUndoSeen(matched.id);
      return;
    }

    addMovieToSeen(movie);
  }

  function handleClearSeen() {
    if (!currentUser) return;
    seenList = [];
    fetch("/api/user/seen?all=true", { method: "DELETE" }).catch(() => {});
  }

  let sortedWatchlist = $derived.by(() =>
    [...watchlist].sort((a, b) => {
      const scoreA = computeAffinityScore(a, seenList);
      const scoreB = computeAffinityScore(b, seenList);
      return scoreB - scoreA;
    }),
  );

  function openLibrary(tab: "watchlist" | "seen" | "recent" = "watchlist") {
    libraryTab = tab;
    isLibraryOpen = true;
  }

  let isSeedInWatchlist = $derived(
    selectedSeed
      ? watchlist.some(
          (w) =>
            w.id === selectedSeed!.id ||
            normalizeTitle(w.title) === normalizeTitle(selectedSeed!.title),
        )
      : false,
  );

  let isSeedSeen = $derived(
    selectedSeed
      ? seenList.some(
          (s) =>
            s.id === selectedSeed!.id ||
            normalizeTitle(s.title) === normalizeTitle(selectedSeed!.title),
        )
      : false,
  );
</script>

<div class="w-full min-h-screen bg-[#0A0A0B] text-[#F2EFE9]">
  <!-- 3-Column Responsive Grid -->
  <div class="lg:grid lg:grid-cols-[1fr_430px_1fr] min-h-screen">
    <!-- 1. LEFT COLUMN: Oversized Branding & Dynamic Poster Stage -->
    <LeftColumn
      {selectedSeed}
      onSelectSeed={selectSeedMovie}
      onToggleWatchlist={handleToggleWatchlist}
      onMarkSeen={(movie) => handleToggleSeen(movie)}
      isInWatchlist={isSeedInWatchlist}
      isSeen={isSeedSeen}
    />

    <!-- 2. CENTER COLUMN: Core 430px Interactive Strip -->
    <main
      class="w-full max-w-[430px] mx-auto min-h-screen border-x border-[#262629] flex flex-col bg-[#0A0A0B]"
    >
      <!-- Header Bar with RBAC User Status & Unrestricted Library Trigger -->
      <header
        class="h-12 px-3 flex items-center justify-between border-b border-[#262629] bg-[#0A0A0B] sticky top-0 z-30"
      >
        <span
          class="font-serif text-2xl font-normal tracking-tight text-[#F2EFE9] lg:hidden"
        >
          kuro<span class="text-[#E62E25]">.</span>
        </span>

        <!-- User & RBAC Controls -->
        <div class="flex items-center gap-1.5 font-mono text-[10px] ml-auto">
          {#if currentUser}
            <div class="flex items-center gap-2">
              {#if currentUser.role === "admin"}
                <button
                  type="button"
                  onclick={() => (isAdminPanelOpen = true)}
                  class="border border-[#E62E25] px-1.5 py-0.5 text-[#E62E25] hover:bg-[#E62E25] hover:text-[#0A0A0B] uppercase font-bold transition-colors"
                  title="Open RBAC Admin Panel"
                >
                  [ADMIN]
                </button>
              {/if}
              <span class="text-[#F2EFE9] font-bold truncate max-w-[110px]">
                @{currentUser.username}
              </span>
              <button
                type="button"
                onclick={handleLogout}
                class="text-[#8A8882] hover:text-[#E62E25] transition-colors ml-1"
                title="Sign out"
              >
                [LOGOUT]
              </button>
            </div>
          {:else}
            <button
              type="button"
              onclick={() => (isAuthModalOpen = true)}
              class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase transition-colors"
            >
              [SIGN IN]
            </button>
          {/if}

          <!-- Mobile Drawer Triggers -->
          {#if watchlist.length > 0}
            <button
              type="button"
              onclick={() =>
                (mobileDrawerSection =
                  mobileDrawerSection === "plan" ? null : "plan")}
              class="lg:hidden border border-[#262629] px-1.5 py-0.5 text-[#E62E25] hover:border-[#E62E25] transition-colors ml-1"
            >
              PLAN [{watchlist.length}]
            </button>
          {/if}
          <button
            type="button"
            onclick={() =>
              (mobileDrawerSection =
                mobileDrawerSection === "seen" ? null : "seen")}
            class="lg:hidden border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] transition-colors"
          >
            SEEN [{seenList.length}]
          </button>
        </div>
      </header>

      <!-- Mobile Drawer (When toggled) -->
      <MobileDrawer
        section={mobileDrawerSection}
        onClose={() => (mobileDrawerSection = null)}
        {currentUser}
        onOpenAuth={() => (isAuthModalOpen = true)}
        watchlist={sortedWatchlist}
        {seenList}
        onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
        onRemoveWatchlist={handleRemoveFromWatchlist}
        onUndoSeen={handleUndoSeen}
      />

      <!-- Block 01 / SEED FILM -->
      <SeedFilmSection
        {selectedSeed}
        onSelectSeed={selectSeedMovie}
        onClearSeed={() => (selectedSeed = null)}
        onToggleWatchlist={handleToggleWatchlist}
        onMarkSeen={(movie) => handleToggleSeen(movie)}
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
        {watchlist}
        {seenList}
        onToggleWatchlist={handleToggleWatchlist}
        onUseAsSeed={(movie) => {
          selectSeedMovie(movie.id, movie);
          discoveryResults = null;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onMarkSeen={(movie) => handleToggleSeen(movie)}
      />
    </main>

    <!-- 3. RIGHT COLUMN: Watchlist, Recent Seeds & Watched Archive -->
    <RightColumn
      {currentUser}
      onOpenAuth={() => (isAuthModalOpen = true)}
      {sortedWatchlist}
      {recentSeeds}
      {seenList}
      onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
      onWatchlistMarkSeen={(item) => handleToggleSeen(item)}
      onRemoveWatchlist={handleRemoveFromWatchlist}
      onLoadRecentSeed={handleLoadRecentSeed}
      onRateSeenMovie={handleRateSeenMovie}
      onUndoSeen={handleUndoSeen}
      onClearSeen={handleClearSeen}
      onOpenLibrary={openLibrary}
    />
  </div>

  <!-- Dedicated Unrestricted Library & Archive Modal -->
  <LibraryModal
    isOpen={isLibraryOpen}
    onClose={() => (isLibraryOpen = false)}
    watchlist={sortedWatchlist}
    {seenList}
    {recentSeeds}
    isAuthenticated={!!currentUser}
    onOpenAuth={() => (isAuthModalOpen = true)}
    onSelectSeed={(movieId, fallbackInfo) => {
      selectSeedMovie(movieId, fallbackInfo);
      discoveryResults = null;
    }}
    onRemoveWatchlist={handleRemoveFromWatchlist}
    onWatchlistMarkSeen={(item) => handleToggleSeen(item)}
    onRateSeenMovie={handleRateSeenMovie}
    onUndoSeen={handleUndoSeen}
    onClearSeen={handleClearSeen}
    onLoadRecentSeed={handleLoadRecentSeed}
    initialTab={libraryTab}
  />

  <!-- Auth Modal (Sign In / Register) -->
  <AuthModal
    isOpen={isAuthModalOpen}
    onClose={() => (isAuthModalOpen = false)}
    onAuthSuccess={handleAuthSuccess}
  />

  <!-- Admin Panel (RBAC Protected: Lazy-loaded only when Admin opens it) -->
  {#if currentUser?.role === "admin" && isAdminPanelOpen}
    {#await import("./AdminPanel.svelte") then { default: AdminPanel }}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => (isAdminPanelOpen = false)}
        currentUserId={currentUser.id}
      />
    {/await}
  {/if}
</div>
