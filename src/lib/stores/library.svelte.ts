import type {
  WatchlistItem,
  SeenItem,
  RecentSeedItem,
  SeedMovie,
} from '$lib/types';
import { normalizeTitle } from '$lib/textUtils';
import { computeAffinityScore } from '$lib/client/affinity';

export interface WatchlistCandidate {
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
}

export interface SeenCandidate {
  id: number;
  title: string;
  year?: number;
  director?: string;
  originalLanguage?: string;
  posterUrl?: string;
}

export interface InitialLibraryState {
  watchlist: WatchlistItem[];
  seenList: SeenItem[];
  recentSeeds: RecentSeedItem[];
}

export function createLibraryStore(initial: InitialLibraryState) {
  let watchlist = $state<WatchlistItem[]>(initial.watchlist);
  let seenList = $state<SeenItem[]>(initial.seenList);
  let recentSeeds = $state<RecentSeedItem[]>(initial.recentSeeds);

  const sortedWatchlist = $derived.by(() =>
    [...watchlist].sort((a, b) => {
      const scoreA = computeAffinityScore(a, seenList);
      const scoreB = computeAffinityScore(b, seenList);
      return scoreB - scoreA;
    })
  );

  function matchesMovie(
    a: { id: number; title: string },
    b: { id: number; title: string }
  ): boolean {
    return a.id === b.id || normalizeTitle(a.title) === normalizeTitle(b.title);
  }

  async function load(): Promise<void> {
    try {
      const res = await fetch('/api/user/library');
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

  function reset(): void {
    watchlist = [];
    seenList = [];
    recentSeeds = [];
  }

  function sync(initial: InitialLibraryState): void {
    watchlist = initial.watchlist;
    seenList = initial.seenList;
    recentSeeds = initial.recentSeeds;
  }

  function removeFromWatchlist(id: number): void {
    watchlist = watchlist.filter((w) => w.id !== id);
    fetch(`/api/user/watchlist?id=${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function toggleWatchlist(movie: WatchlistCandidate): void {
    const exists = watchlist.some((w) => matchesMovie(w, movie));
    if (exists) {
      removeFromWatchlist(movie.id);
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
    fetch('/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  }

  function undoSeen(id: number): void {
    seenList = seenList.filter((s) => s.id !== id);
    fetch(`/api/user/seen?id=${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function addSeen(movie: SeenCandidate): void {
    const newItem: SeenItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      originalLanguage: movie.originalLanguage,
      posterUrl: movie.posterUrl,
    };

    if (!seenList.some((s) => matchesMovie(s, movie))) {
      seenList = [...seenList, newItem];
    }

    watchlist = watchlist.filter((w) => !matchesMovie(w, movie));

    fetch('/api/user/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  }

  /**
   * Toggles seen status. Returns true if the movie was added to seen, false if undone.
   */
  function toggleSeen(movie: SeenCandidate): boolean {
    const matched = seenList.find((s) => matchesMovie(s, movie));
    if (matched) {
      undoSeen(matched.id);
      return false;
    }
    addSeen(movie);
    return true;
  }

  function rateSeen(id: number, rating: number): void {
    let newRating: number | undefined;
    seenList = seenList.map((item) => {
      if (item.id === id) {
        newRating = item.rating === rating ? undefined : rating;
        return { ...item, rating: newRating };
      }
      return item;
    });

    fetch('/api/user/seen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: id, rating: newRating }),
    }).catch(() => {});
  }

  function clearSeen(): void {
    seenList = [];
    fetch('/api/user/seen?all=true', { method: 'DELETE' }).catch(() => {});
  }

  function addRecentSeed(movie: SeedMovie, sentenceText: string): void {
    const nextItem: RecentSeedItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      originalLanguage: movie.originalLanguage,
      posterUrl: movie.posterUrl,
      director: movie.director,
      sentence: sentenceText.trim() || undefined,
    };

    recentSeeds = [
      nextItem,
      ...recentSeeds.filter((s) => s.id !== movie.id),
    ].slice(0, 5);

    fetch('/api/user/recent-seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextItem),
    }).catch(() => {});
  }

  function isInWatchlist(movie: { id: number; title: string } | null): boolean {
    if (!movie) return false;
    return watchlist.some((w) => matchesMovie(w, movie));
  }

  function isSeen(movie: { id: number; title: string } | null): boolean {
    if (!movie) return false;
    return seenList.some((s) => matchesMovie(s, movie));
  }

  return {
    get watchlist() {
      return watchlist;
    },
    get seenList() {
      return seenList;
    },
    get recentSeeds() {
      return recentSeeds;
    },
    get sortedWatchlist() {
      return sortedWatchlist;
    },
    load,
    reset,
    sync,
    toggleWatchlist,
    removeFromWatchlist,
    toggleSeen,
    undoSeen,
    rateSeen,
    clearSeen,
    addRecentSeed,
    isInWatchlist,
    isSeen,
  };
}
