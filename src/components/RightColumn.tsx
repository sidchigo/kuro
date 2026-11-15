import type { WatchlistItem, RecentSeedItem, SeenItem, User } from '../lib/types';
import PosterImage from './PosterImage';

interface RightColumnProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  sortedWatchlist: WatchlistItem[];
  recentSeeds: RecentSeedItem[];
  seenList: SeenItem[];
  onSelectWatchlistSeed: (item: WatchlistItem) => void;
  onWatchlistMarkSeen: (item: WatchlistItem) => void;
  onRemoveWatchlist: (id: number) => void;
  onLoadRecentSeed: (seed: RecentSeedItem) => void;
  onRateSeenMovie: (id: number, rating: number) => void;
  onUndoSeen: (id: number) => void;
  onClearSeen: () => void;
}

export default function RightColumn({
  currentUser,
  onOpenAuth,
  sortedWatchlist,
  recentSeeds,
  seenList,
  onSelectWatchlistSeed,
  onWatchlistMarkSeen,
  onRemoveWatchlist,
  onLoadRecentSeed,
  onRateSeenMovie,
  onUndoSeen,
  onClearSeen,
}: RightColumnProps) {
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen p-8 flex-col justify-between border-l border-[#262629] overflow-y-auto select-none">
      <div className="space-y-6">
        
        {/* 1. Plan to Watch (Watchlist) */}
        <div>
          <div className="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
            <span className="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
              PLAN TO WATCH {currentUser ? `(${sortedWatchlist.length})` : ''}
            </span>
          </div>

          {!currentUser ? (
            <div className="border border-[#262629] p-3 bg-[#0A0A0B]">
              <p className="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
                SIGN IN TO ACCESS YOUR SAVED WATCHLIST
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="font-mono text-[9px] text-[#E62E25] hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-[#E62E25] px-2 py-1 transition-colors"
              >
                [SIGN IN / REGISTER]
              </button>
            </div>
          ) : sortedWatchlist.length === 0 ? (
            <p className="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
              NO FILMS SAVED
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {sortedWatchlist.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#262629] p-2 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors flex gap-2.5"
                >
                  <div className="w-9 h-12 shrink-0 bg-[#121214] border border-[#262629] overflow-hidden">
                    <PosterImage
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      fallbackLabel="PLAN"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="font-serif text-sm leading-tight text-[#F2EFE9] truncate">
                        {item.title}
                      </p>
                      <p className="font-mono text-[9px] text-[#8A8882] uppercase mt-0.5 tracking-wider">
                        {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-[#262629] font-mono text-[9px]">
                      <button
                        type="button"
                        onClick={() => onSelectWatchlistSeed(item)}
                        className="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] transition-colors uppercase"
                      >
                        [SEED]
                      </button>
                      <button
                        type="button"
                        onClick={() => onWatchlistMarkSeen(item)}
                        className="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25] transition-colors uppercase"
                      >
                        [SEEN]
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveWatchlist(item.id)}
                        className="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#E62E25] transition-colors uppercase ml-auto"
                        title="Remove from watchlist"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Recent Seeds (With Saved Sentence Quote & 1-Click Restore) */}
        <div>
          <div className="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
            <span className="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
              RECENT SEEDS {currentUser ? `(${recentSeeds.length})` : ''}
            </span>
          </div>

          {!currentUser ? (
            <div className="border border-[#262629] p-3 bg-[#0A0A0B]">
              <p className="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
                SIGN IN TO RECORD YOUR SEED PROMPT HISTORY
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="font-mono text-[9px] text-[#E62E25] hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-[#E62E25] px-2 py-1 transition-colors"
              >
                [SIGN IN / REGISTER]
              </button>
            </div>
          ) : recentSeeds.length === 0 ? (
            <p className="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
              NO RECENT SEEDS RECORDED
            </p>
          ) : (
            <div className="space-y-2">
              {recentSeeds.map((seed) => (
                <div
                  key={seed.id}
                  className="border border-[#262629] p-2 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-sm leading-tight text-[#F2EFE9] truncate">
                        {seed.title}
                      </p>
                      <p className="font-mono text-[9px] text-[#8A8882] uppercase mt-0.5 tracking-wider">
                        {seed.year || '----'} · [{seed.originalLanguage || 'EN'}]
                      </p>
                      {seed.sentence && (
                        <p className="font-serif italic text-[11px] text-[#8A8882] mt-1.5 line-clamp-1 border-l border-[#E62E25] pl-1.5">
                          "{seed.sentence}"
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadRecentSeed(seed)}
                      className="font-mono text-[9px] text-[#8A8882] hover:text-[#E62E25] border border-[#262629] hover:border-[#E62E25] px-1.5 py-0.5 shrink-0 transition-colors uppercase mt-0.5"
                    >
                      LOAD →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Already Seen Archive (With Interactive Star Ratings) */}
        <div>
          <div className="flex items-center justify-between border-b border-[#262629] pb-2 mb-3">
            <span className="font-mono text-xs tracking-widest text-[#8A8882] uppercase">
              ALREADY SEEN {currentUser ? `(${seenList.length})` : ''}
            </span>
            {currentUser && seenList.length > 0 && (
              <button
                type="button"
                onClick={onClearSeen}
                className="font-mono text-[9px] text-[#8A8882] hover:text-[#E62E25] transition-colors uppercase"
              >
                CLEAR
              </button>
            )}
          </div>

          {!currentUser ? (
            <div className="border border-[#262629] p-3 bg-[#0A0A0B]">
              <p className="font-mono text-[9px] text-[#8A8882] uppercase tracking-wider leading-relaxed mb-2">
                SIGN IN TO MAINTAIN YOUR SEEN BLACKLIST & STAR RATINGS
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="font-mono text-[9px] text-[#E62E25] hover:text-[#F2EFE9] uppercase border border-[#262629] hover:border-[#E62E25] px-2 py-1 transition-colors"
              >
                [SIGN IN / REGISTER]
              </button>
            </div>
          ) : seenList.length === 0 ? (
            <p className="font-mono text-[10px] text-[#8A8882]/60 uppercase tracking-wider py-1">
              0 FILMS BLACKLISTED
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-[#262629] border border-[#262629]">
              {seenList.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-[#0A0A0B] hover:bg-[#121214] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-sm text-[#F2EFE9] truncate pr-2">
                      {item.title} {item.year ? `(${item.year})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUndoSeen(item.id)}
                      className="font-mono text-[9px] text-[#8A8882] hover:text-[#E62E25] uppercase transition-colors shrink-0"
                    >
                      [UNDO]
                    </button>
                  </div>
                  {/* Interactive 5-Star Rating Control */}
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-[#262629]/60">
                    <span className="font-mono text-[8px] text-[#8A8882] uppercase tracking-wider mr-1">
                      RATING:
                    </span>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (item.rating || 0) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => onRateSeenMovie(item.id, star)}
                          className={`font-mono text-xs transition-colors px-0.5 hover:scale-125 ${
                            isFilled ? 'text-[#E62E25]' : 'text-[#262629] hover:text-[#8A8882]'
                          }`}
                          title={`Rate ${star}/5 stars`}
                        >
                          ★
                        </button>
                      );
                    })}
                    {item.rating ? (
                      <span className="font-mono text-[9px] text-[#E62E25] font-bold ml-1.5">
                        {item.rating}/5
                      </span>
                    ) : (
                      <span className="font-mono text-[8px] text-[#8A8882]/40 ml-1.5 uppercase">
                        UNRATED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="pt-4 border-t border-[#262629] font-mono text-[10px] text-[#8A8882] flex justify-between uppercase tracking-wider mt-6">
        <span>DETERMINISTIC PIPELINE</span>
        <span>NO ALGORITHM SLOP</span>
      </div>
    </aside>
  );
}
