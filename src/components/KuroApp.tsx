import { useState, useEffect, useRef, useMemo } from 'react';
import type { Preset, SeedMovie, HorrorMatch, SeenItem, RecentSeedItem, WatchlistItem, User } from '../lib/types';
import LeftColumn from './LeftColumn';
import SeedFilmSection from './SeedFilmSection';
import SentenceCanvas, { type SentenceCanvasHandle } from './SentenceCanvas';
import PresetTrigger from './PresetTrigger';
import ResultsStack from './ResultsStack';
import RightColumn from './RightColumn';
import MobileDrawer from './MobileDrawer';
import AuthModal from './AuthModal';
import AdminPanel from './AdminPanel';

function normalizeTitle(t?: string | null): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates deterministic taste score between a watchlist film and user's rated watched films.
 */
function computeAffinityScore(item: WatchlistItem, seenList: SeenItem[]): number {
  let score = 50;

  const ratedMovies = seenList.filter((s) => typeof s.rating === 'number' && (s.rating || 0) > 0);
  if (ratedMovies.length === 0) {
    return (item.voteAverage || 7.0) * 10;
  }

  const highRated = ratedMovies.filter((s) => (s.rating || 0) >= 4);
  const lowRated = ratedMovies.filter((s) => (s.rating || 0) <= 2);

  // 1. Director affinity
  if (item.director) {
    const dirMatchHigh = highRated.find(
      (s) => s.director && s.director.toLowerCase() === item.director!.toLowerCase()
    );
    if (dirMatchHigh) score += 30;

    const dirMatchLow = lowRated.find(
      (s) => s.director && s.director.toLowerCase() === item.director!.toLowerCase()
    );
    if (dirMatchLow) score -= 25;
  }

  // 2. Language / Regional affinity
  if (item.originalLanguage) {
    const langMovies = ratedMovies.filter(
      (s) => s.originalLanguage && s.originalLanguage.toLowerCase() === item.originalLanguage!.toLowerCase()
    );
    if (langMovies.length > 0) {
      const avgLangRating =
        langMovies.reduce((acc, curr) => acc + (curr.rating || 0), 0) / langMovies.length;
      if (avgLangRating >= 4.0) score += 20;
      else if (avgLangRating <= 2.5) score -= 15;
    }
  }

  return score;
}

export default function KuroApp() {
  // --- Auth & RBAC State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // --- Core States ---
  const [selectedSeed, setSelectedSeed] = useState<SeedMovie | null>(null);
  const [sentence, setSentence] = useState('');
  const [preset, setPreset] = useState<Preset>('all');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<{
    matches: HorrorMatch[];
    candidateCount: number;
    fallbackReason?: string;
  } | null>(null);

  // Archive Lists
  const [seenList, setSeenList] = useState<SeenItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [recentSeeds, setRecentSeeds] = useState<RecentSeedItem[]>([]);

  // Mobile Drawer State
  const [mobileDrawerSection, setMobileDrawerSection] = useState<'plan' | 'seen' | null>(null);

  const sentenceCanvasRef = useRef<SentenceCanvasHandle>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Check Auth Status on Mount ---
  useEffect(() => {
    // Purge legacy client-side localStorage keys so stale device data never leaks across users
    try {
      localStorage.removeItem('kuro_seen_list');
      localStorage.removeItem('kuro_watchlist');
      localStorage.removeItem('kuro_recent_seeds');
    } catch {
      // LocalStorage unavailable
    }

    const checkAuthAndLoad = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            await loadUserLibrary();
            return;
          }
        }
      } catch {
        // Unauthenticated or network error
      }
      // Unauthenticated visitor: personal archives strictly empty
      setCurrentUser(null);
      setWatchlist([]);
      setSeenList([]);
      setRecentSeeds([]);
    };

    checkAuthAndLoad();
  }, []);

  const loadUserLibrary = async () => {
    try {
      const res = await fetch('/api/user/library');
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist || []);
        setSeenList(data.seenList || []);
        setRecentSeeds(data.recentSeeds || []);
      }
    } catch {
      // Network error loading user library
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadUserLibrary();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setIsAdminPanelOpen(false);
    setWatchlist([]);
    setSeenList([]);
    setRecentSeeds([]);
  };

  const updateSeenList = (updater: (prev: SeenItem[]) => SeenItem[]) => {
    setSeenList(updater);
  };

  const updateWatchlist = (updater: (prev: WatchlistItem[]) => WatchlistItem[]) => {
    setWatchlist(updater);
  };

  const addMovieToSeen = (movie: {
    id: number;
    title: string;
    year?: number;
    director?: string;
    originalLanguage?: string;
    posterUrl?: string;
  }) => {
    if (!currentUser) return;

    const newItem: SeenItem = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      director: movie.director,
      originalLanguage: movie.originalLanguage,
      posterUrl: movie.posterUrl,
    };

    updateSeenList((prev) => {
      if (prev.some((s) => s.id === movie.id || normalizeTitle(s.title) === normalizeTitle(movie.title))) {
        return prev;
      }
      return [...prev, newItem];
    });

    updateWatchlist((prev) =>
      prev.filter((w) => w.id !== movie.id && normalizeTitle(w.title) !== normalizeTitle(movie.title))
    );

    setDiscoveryResults((current) => {
      if (!current) return null;
      return {
        ...current,
        matches: current.matches.filter(
          (m) => m.id !== movie.id && normalizeTitle(m.title) !== normalizeTitle(movie.title)
        ),
      };
    });

    fetch('/api/user/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  };

  const handleMarkSeenWithAuth = (movie: {
    id: number;
    title: string;
    year?: number;
    director?: string;
    originalLanguage?: string;
    posterUrl?: string;
  }) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    addMovieToSeen(movie);
  };

  const addRecentSeed = (movie: SeedMovie, customSentence?: string) => {
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

    setRecentSeeds((prev) => {
      const filtered = prev.filter((s) => s.id !== movie.id);
      return [nextItem, ...filtered].slice(0, 5);
    });

    fetch('/api/user/recent-seeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextItem),
    }).catch(() => {});
  };

  const selectSeedMovie = async (movieId: number, fallbackInfo?: Partial<SeedMovie>) => {
    try {
      const res = await fetch(`/api/search?id=${movieId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.movie) {
          setSelectedSeed(data.movie);
          if (currentUser) {
            addRecentSeed(data.movie);
            addMovieToSeen(data.movie);
          }
          return;
        }
      }
    } catch {
      // Fallback
    }

    const constructed: SeedMovie = {
      id: movieId,
      title: fallbackInfo?.title || 'Selected Horror Film',
      year: fallbackInfo?.year || 0,
      originalLanguage: fallbackInfo?.originalLanguage || 'EN',
      runtime: fallbackInfo?.runtime || 90,
      director: fallbackInfo?.director || 'Unknown',
      overview: fallbackInfo?.overview || '',
      posterUrl: fallbackInfo?.posterUrl,
      voteAverage: fallbackInfo?.voteAverage || 7.0,
      keywords: fallbackInfo?.keywords || ['horror'],
    };
    setSelectedSeed(constructed);
    if (currentUser) {
      addRecentSeed(constructed);
      addMovieToSeen(constructed);
    }
  };

  const handleDiscover = async () => {
    if (!selectedSeed || isDiscovering) return;

    if (currentUser) {
      addRecentSeed(selectedSeed, sentence.trim());
    }
    setIsDiscovering(true);
    setDiscoveryResults(null);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: selectedSeed.id,
          sentence: sentence.trim(),
          preset,
          blacklist: seenList.map((s) => s.id),
          blacklistTitles: seenList.map((s) => s.title),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiscoveryResults(data);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setDiscoveryResults({
          matches: [],
          candidateCount: 0,
          fallbackReason: 'Failed to query discovery engine.',
        });
      }
    } catch {
      setDiscoveryResults({
        matches: [],
        candidateCount: 0,
        fallbackReason: 'Network error communicating with horror discovery engine.',
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleToggleWatchlist = (movie: HorrorMatch) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const exists = watchlist.some(
      (w) => w.id === movie.id || normalizeTitle(w.title) === normalizeTitle(movie.title)
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
      addedAt: Date.now(),
    };

    updateWatchlist((prev) => [newItem, ...prev]);

    fetch('/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch(() => {});
  };

  const handleRemoveFromWatchlist = (id: number) => {
    if (!currentUser) return;
    updateWatchlist((prev) => prev.filter((w) => w.id !== id));

    fetch(`/api/user/watchlist?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleLoadRecentSeed = (recent: RecentSeedItem) => {
    selectSeedMovie(recent.id, recent);
    if (recent.sentence) {
      setSentence(recent.sentence);
      setTimeout(() => {
        sentenceCanvasRef.current?.adjustHeight();
      }, 20);
    }
  };

  const handleRateSeenMovie = (id: number, rating: number) => {
    if (!currentUser) return;
    let newRating: number | undefined;
    updateSeenList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          newRating = item.rating === rating ? undefined : rating;
          return { ...item, rating: newRating };
        }
        return item;
      })
    );

    fetch('/api/user/seen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: id, rating: newRating }),
    }).catch(() => {});
  };

  const handleUndoSeen = (id: number) => {
    if (!currentUser) return;
    updateSeenList((prev) => prev.filter((s) => s.id !== id));

    fetch(`/api/user/seen?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleClearSeen = () => {
    if (!currentUser) return;
    updateSeenList(() => []);
  };

  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      const scoreA = computeAffinityScore(a, seenList);
      const scoreB = computeAffinityScore(b, seenList);
      return scoreB - scoreA;
    });
  }, [watchlist, seenList]);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0B] text-[#F2EFE9] selection:bg-[#E62E25] selection:text-[#0A0A0B]">
      {/* 3-Column Responsive Grid */}
      <div className="lg:grid lg:grid-cols-[1fr_430px_1fr] min-h-screen">
        
        {/* 1. LEFT COLUMN: Oversized Branding & Dynamic Poster Stage */}
        <LeftColumn selectedSeed={selectedSeed} />

        {/* 2. CENTER COLUMN: Core 430px Interactive Strip */}
        <main className="w-full max-w-[430px] mx-auto min-h-screen border-x border-[#262629] flex flex-col bg-[#0A0A0B]">
          
          {/* Header Bar with RBAC User Status */}
          <header className="h-12 px-3 flex items-center justify-between border-b border-[#262629] bg-[#0A0A0B] sticky top-0 z-30">
            <span className="font-serif text-2xl font-normal tracking-tight text-[#F2EFE9]">
              kuro<span className="text-[#E62E25]">.</span>
            </span>

            {/* User & RBAC Controls */}
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setIsAdminPanelOpen(true)}
                      className="border border-[#E62E25] px-1.5 py-0.5 text-[#E62E25] hover:bg-[#E62E25] hover:text-[#0A0A0B] uppercase font-bold transition-colors"
                      title="Open RBAC Admin Panel"
                    >
                      [ADMIN]
                    </button>
                  )}
                  <span className="text-[#8A8882] truncate max-w-[90px]">
                    {currentUser.username}
                  </span>
                  <span
                    className={`px-1 py-0.2 text-[8px] uppercase tracking-wider font-semibold ${
                      currentUser.role === 'admin' ? 'text-[#E62E25]' : 'text-[#8A8882]'
                    }`}
                  >
                    [{currentUser.role}]
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-[#8A8882] hover:text-[#E62E25] transition-colors ml-1"
                    title="Sign out"
                  >
                    [OUT]
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase transition-colors"
                >
                  [SIGN IN]
                </button>
              )}

              {/* Mobile Drawer Triggers */}
              {watchlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileDrawerSection(mobileDrawerSection === 'plan' ? null : 'plan')}
                  className="lg:hidden border border-[#262629] px-1.5 py-0.5 text-[#E62E25] hover:border-[#E62E25] transition-colors ml-1"
                >
                  PLAN [{watchlist.length}]
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileDrawerSection(mobileDrawerSection === 'seen' ? null : 'seen')}
                className="lg:hidden border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] transition-colors"
              >
                SEEN [{seenList.length}]
              </button>
            </div>
          </header>

          {/* Mobile Drawer (When toggled) */}
          <MobileDrawer
            section={mobileDrawerSection}
            onClose={() => setMobileDrawerSection(null)}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            watchlist={sortedWatchlist}
            seenList={seenList}
            onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
            onRemoveWatchlist={handleRemoveFromWatchlist}
            onUndoSeen={handleUndoSeen}
          />

          {/* Block 01 / SEED FILM */}
          <SeedFilmSection
            selectedSeed={selectedSeed}
            onSelectSeed={selectSeedMovie}
            onClearSeed={() => setSelectedSeed(null)}
          />

          {/* Block 02 / THE SENTENCE CANVAS */}
          <SentenceCanvas
            ref={sentenceCanvasRef}
            sentence={sentence}
            onSentenceChange={setSentence}
          />

          {/* Block 03 / POOL & TRIGGER */}
          <PresetTrigger
            preset={preset}
            onPresetChange={setPreset}
            canDiscover={!!selectedSeed}
            isDiscovering={isDiscovering}
            onDiscover={handleDiscover}
          />

          {/* Block 04 / RESULTS STACK */}
          <ResultsStack
            discoveryResults={discoveryResults}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onUseAsSeed={(movie) => {
              selectSeedMovie(movie.id, movie);
              setDiscoveryResults(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onMarkSeen={(movie) => handleMarkSeenWithAuth(movie)}
            resultsRef={resultsRef}
          />
        </main>

        {/* 3. RIGHT COLUMN: Watchlist, Recent Seeds & Watched Archive */}
        <RightColumn
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          sortedWatchlist={sortedWatchlist}
          recentSeeds={recentSeeds}
          seenList={seenList}
          onSelectWatchlistSeed={(item) => selectSeedMovie(item.id, item)}
          onWatchlistMarkSeen={(item) => handleMarkSeenWithAuth(item)}
          onRemoveWatchlist={handleRemoveFromWatchlist}
          onLoadRecentSeed={handleLoadRecentSeed}
          onRateSeenMovie={handleRateSeenMovie}
          onUndoSeen={handleUndoSeen}
          onClearSeen={handleClearSeen}
        />

      </div>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Admin Panel (RBAC Protected: Admin Only) */}
      {currentUser?.role === 'admin' && (
        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUserId={currentUser.id}
        />
      )}
    </div>
  );
}
