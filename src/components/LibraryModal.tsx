import { useState, useMemo, useEffect } from 'react';
import type { WatchlistItem, SeenItem, RecentSeedItem, SeedMovie } from '../lib/types';
import PosterImage from './PosterImage';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchlistItem[];
  seenList: SeenItem[];
  recentSeeds: RecentSeedItem[];
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onSelectSeed: (movieId: number, fallbackInfo?: Partial<SeedMovie>) => void;
  onRemoveWatchlist: (id: number) => void;
  onWatchlistMarkSeen: (item: WatchlistItem) => void;
  onRateSeenMovie: (id: number, rating: number) => void;
  onUndoSeen: (id: number) => void;
  onClearSeen: () => void;
  onLoadRecentSeed: (seed: RecentSeedItem) => void;
  initialTab?: 'watchlist' | 'seen' | 'recent';
}

export default function LibraryModal({
  isOpen,
  onClose,
  watchlist,
  seenList,
  recentSeeds,
  isAuthenticated,
  onOpenAuth,
  onSelectSeed,
  onRemoveWatchlist,
  onWatchlistMarkSeen,
  onRateSeenMovie,
  onUndoSeen,
  onClearSeen,
  onLoadRecentSeed,
  initialTab = 'watchlist',
}: LibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'seen' | 'recent'>(initialTab);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFilterQuery('');
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredWatchlist = useMemo(() => {
    if (!filterQuery.trim()) return watchlist;
    const q = filterQuery.toLowerCase();
    return watchlist.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q))
    );
  }, [watchlist, filterQuery]);

  const filteredSeenList = useMemo(() => {
    if (!filterQuery.trim()) return seenList;
    const q = filterQuery.toLowerCase();
    return seenList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q))
    );
  }, [seenList, filterQuery]);

  const filteredRecentSeeds = useMemo(() => {
    if (!filterQuery.trim()) return recentSeeds;
    const q = filterQuery.toLowerCase();
    return recentSeeds.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.sentence && m.sentence.toLowerCase().includes(q))
    );
  }, [recentSeeds, filterQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/95 backdrop-blur-md flex flex-col select-none overflow-hidden animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <header className="h-16 px-6 lg:px-12 border-b border-[#262629] bg-[#0A0A0B] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-normal text-[#F2EFE9]">
              kuro<span className="text-[#E62E25]">.</span>
            </span>
            <span className="font-mono text-xs uppercase text-[#8A8882] tracking-widest hidden sm:inline">
              // DEDICATED ARCHIVE
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 font-mono text-[11px] uppercase">
            <button
              type="button"
              onClick={() => setActiveTab('watchlist')}
              className={`px-3 py-1.5 border transition-all ${
                activeTab === 'watchlist'
                  ? 'border-[#E62E25] bg-[#E62E25] text-[#0A0A0B] font-bold'
                  : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882]'
              }`}
            >
              PLAN TO WATCH ({watchlist.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seen')}
              className={`px-3 py-1.5 border transition-all ${
                activeTab === 'seen'
                  ? 'border-[#E62E25] bg-[#E62E25] text-[#0A0A0B] font-bold'
                  : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882]'
              }`}
            >
              ALREADY SEEN ({seenList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1.5 border transition-all hidden md:inline-block ${
                activeTab === 'recent'
                  ? 'border-[#E62E25] bg-[#E62E25] text-[#0A0A0B] font-bold'
                  : 'border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882]'
              }`}
            >
              RECENT SEARCHES ({recentSeeds.length})
            </button>
          </nav>
        </div>

        {/* Right Actions: Filter & Close */}
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="FILTER BY TITLE..."
              className="w-48 lg:w-64 h-8 bg-[#121214] border border-[#262629] px-2.5 font-mono text-[10px] uppercase text-[#F2EFE9] placeholder:text-[#8A8882] focus:border-[#F2EFE9] focus:outline-none transition-colors"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1.5 font-mono text-[10px] text-[#8A8882] hover:text-[#F2EFE9]"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase px-3 py-1.5 border border-[#262629] hover:border-[#E62E25] hover:text-[#E62E25] text-[#F2EFE9] transition-colors"
          >
            [CLOSE ✕]
          </button>
        </div>
      </header>

      {/* Main Unrestricted Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-20 p-8 border border-[#262629] bg-[#0A0A0B] text-center space-y-4">
            <span className="font-serif text-5xl text-[#E62E25]">黒</span>
            <h2 className="font-serif text-2xl text-[#F2EFE9]">SIGN IN REQUIRED</h2>
            <p className="font-mono text-xs text-[#8A8882] uppercase tracking-wider leading-relaxed">
              Authenticate to view, organize, and manage your full watchlist, custom star ratings, and discovery archive across devices.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full py-3 bg-[#E62E25] hover:bg-[#ff3b32] text-[#0A0A0B] font-mono font-bold text-xs uppercase tracking-widest transition-colors"
            >
              [SIGN IN / REGISTER]
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* 1. PLAN TO WATCH TAB */}
            {activeTab === 'watchlist' && (
              <div>
                <div className="flex items-baseline justify-between mb-6 pb-2 border-b border-[#262629]">
                  <span className="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
                    PLAN TO WATCH // {filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'FILM' : 'FILMS'} SAVED
                  </span>
                  <span className="font-mono text-[10px] uppercase text-[#8A8882]">
                    UNRESTRICTED POSTER GRID
                  </span>
                </div>

                {filteredWatchlist.length === 0 ? (
                  <div className="py-24 text-center border border-[#262629] bg-[#0A0A0B]">
                    <p className="font-serif text-2xl text-[#8A8882]">
                      {filterQuery ? 'NO MATCHING SAVED FILMS FOUND' : 'YOUR WATCHLIST IS EMPTY'}
                    </p>
                    <p className="font-mono text-xs text-[#8A8882]/60 uppercase tracking-widest mt-2">
                      {filterQuery ? 'TRY CLEARING YOUR SEARCH FILTER' : 'CLICK [+ PLAN] ON ANY DISCOVERY RESULT TO SAVE IT HERE'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredWatchlist.map((item) => (
                      <div
                        key={item.id}
                        className="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col group p-2.5"
                      >
                        <div className="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden relative">
                          <PosterImage
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackLabel="PLAN"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveWatchlist(item.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#0A0A0B]/80 hover:bg-[#E62E25] hover:text-[#0A0A0B] text-[#F2EFE9] border border-[#262629] flex items-center justify-center font-mono text-xs transition-colors"
                            title="Remove from watchlist"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="pt-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-serif text-base leading-tight text-[#F2EFE9] line-clamp-1" title={item.title}>
                              {item.title}
                            </h3>
                            <p className="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                              {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                              {item.director ? ` · ${item.director}` : ''}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-[#262629] font-mono text-[9px] uppercase">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSeed(item.id, item);
                                onClose();
                              }}
                              className="py-1 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] text-center transition-colors"
                            >
                              [SEED]
                            </button>
                            <button
                              type="button"
                              onClick={() => onWatchlistMarkSeen(item)}
                              className="py-1 border border-[#262629] hover:border-[#E62E25] hover:text-[#E62E25] text-[#8A8882] text-center transition-colors"
                            >
                              [SEEN]
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. ALREADY SEEN TAB */}
            {activeTab === 'seen' && (
              <div>
                <div className="flex items-baseline justify-between mb-6 pb-2 border-b border-[#262629]">
                  <span className="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
                    ALREADY SEEN // {filteredSeenList.length} {filteredSeenList.length === 1 ? 'FILM' : 'FILMS'} LOGGED
                  </span>
                  {seenList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear entire seen blacklist?')) {
                          onClearSeen();
                        }
                      }}
                      className="font-mono text-[10px] uppercase text-[#8A8882] hover:text-[#E62E25] transition-colors"
                    >
                      [CLEAR ALL SEEN]
                    </button>
                  )}
                </div>

                {filteredSeenList.length === 0 ? (
                  <div className="py-24 text-center border border-[#262629] bg-[#0A0A0B]">
                    <p className="font-serif text-2xl text-[#8A8882]">
                      {filterQuery ? 'NO MATCHING SEEN FILMS FOUND' : 'NO SEEN FILMS RECORDED'}
                    </p>
                    <p className="font-mono text-xs text-[#8A8882]/60 uppercase tracking-widest mt-2">
                      FILMS MARKED AS SEEN ARE AUTOMATICALLY BLACKLISTED FROM FUTURE RECOMMENDATIONS
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredSeenList.map((item) => (
                      <div
                        key={item.id}
                        className="border border-[#262629] bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col group p-2.5"
                      >
                        <div className="aspect-[2/3] w-full bg-[#121214] border border-[#262629] overflow-hidden relative">
                          <PosterImage
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackLabel="SEEN"
                          />
                          <button
                            type="button"
                            onClick={() => onUndoSeen(item.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#0A0A0B]/80 hover:bg-[#E62E25] hover:text-[#0A0A0B] text-[#F2EFE9] border border-[#262629] flex items-center justify-center font-mono text-xs transition-colors"
                            title="Remove from seen blacklist"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="pt-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-serif text-base leading-tight text-[#F2EFE9] line-clamp-1" title={item.title}>
                              {item.title}
                            </h3>
                            <p className="font-mono text-[9px] text-[#8A8882] uppercase mt-1 tracking-wider">
                              {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#262629]">
                            {/* Star Rating Strip */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[8px] text-[#8A8882] uppercase">RATING:</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => onRateSeenMovie(item.id, star)}
                                    className={`text-xs transition-colors hover:scale-125 ${
                                      (item.rating || 0) >= star
                                        ? 'text-[#E62E25]'
                                        : 'text-[#262629] hover:text-[#8A8882]'
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onSelectSeed(item.id, item);
                                onClose();
                              }}
                              className="w-full mt-2 py-1 border border-[#262629] hover:border-[#F2EFE9] hover:text-[#F2EFE9] text-[#8A8882] font-mono text-[9px] uppercase text-center transition-colors"
                            >
                              [USE AS SEED]
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. RECENT SEARCHES TAB */}
            {activeTab === 'recent' && (
              <div>
                <div className="flex items-baseline justify-between mb-6 pb-2 border-b border-[#262629]">
                  <span className="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
                    RECENT SEARCHES // {filteredRecentSeeds.length} ENTRIES RECORDED
                  </span>
                </div>

                {filteredRecentSeeds.length === 0 ? (
                  <div className="py-24 text-center border border-[#262629] bg-[#0A0A0B]">
                    <p className="font-serif text-2xl text-[#8A8882]">NO RECENT SEARCHES RECORDED</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredRecentSeeds.map((seed) => (
                      <div
                        key={seed.id}
                        className="border border-[#262629] p-4 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-lg leading-tight text-[#F2EFE9] line-clamp-1">
                              {seed.title}
                            </h3>
                            <span className="font-mono text-[9px] text-[#8A8882] uppercase border border-[#262629] px-1.5 py-0.5 shrink-0">
                              {seed.year || '----'}
                            </span>
                          </div>
                          {seed.sentence && (
                            <p className="font-serif italic text-xs text-[#8A8882] mt-2.5 border-l-2 border-[#E62E25] pl-2 line-clamp-2">
                              "{seed.sentence}"
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onLoadRecentSeed(seed);
                            onClose();
                          }}
                          className="w-full mt-4 py-1.5 border border-[#262629] hover:border-[#E62E25] hover:text-[#E62E25] text-[#F2EFE9] font-mono text-[10px] uppercase text-center transition-colors"
                        >
                          RESTORE QUERY →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
