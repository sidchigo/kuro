import type { WatchlistItem, SeenItem, User } from '../lib/types';

interface MobileDrawerProps {
  section: 'plan' | 'seen' | null;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  watchlist: WatchlistItem[];
  seenList: SeenItem[];
  onSelectWatchlistSeed: (item: WatchlistItem) => void;
  onRemoveWatchlist: (id: number) => void;
  onUndoSeen: (id: number) => void;
}

export default function MobileDrawer({
  section,
  onClose,
  currentUser,
  onOpenAuth,
  watchlist,
  seenList,
  onSelectWatchlistSeed,
  onRemoveWatchlist,
  onUndoSeen,
}: MobileDrawerProps) {
  if (!section) return null;

  return (
    <div className="lg:hidden border-b border-[#262629] bg-[#0A0A0B] p-4">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#262629]">
        <span className="font-mono text-xs uppercase text-[#F2EFE9] font-bold">
          {section === 'plan'
            ? `PLAN TO WATCH ${currentUser ? `(${watchlist.length})` : ''}`
            : `ALREADY SEEN ${currentUser ? `(${seenList.length})` : ''}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-xs text-[#8A8882] hover:text-[#E62E25]"
        >
          ✕ CLOSE
        </button>
      </div>

      {!currentUser ? (
        <div className="py-6 text-center border border-[#262629] p-4 bg-[#0A0A0B]">
          <p className="font-mono text-xs text-[#8A8882] uppercase mb-3">
            SIGN IN REQUIRED TO ACCESS {section === 'plan' ? 'PLAN TO WATCH' : 'SEEN ARCHIVE'}
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="border border-[#262629] hover:border-[#E62E25] text-[#E62E25] px-3 py-1 font-mono text-xs uppercase"
          >
            [SIGN IN / REGISTER]
          </button>
        </div>
      ) : section === 'plan' ? (
        watchlist.length === 0 ? (
          <p className="font-mono text-[10px] text-[#8A8882] py-4 text-center">0 FILMS IN WATCHLIST</p>
        ) : (
          <div className="space-y-2">
            {watchlist.map((item) => (
              <div key={item.id} className="border border-[#262629] p-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-sm text-[#F2EFE9] truncate">{item.title}</p>
                  <p className="font-mono text-[9px] text-[#8A8882]">
                    {item.year || '----'} · [{item.originalLanguage || 'EN'}]
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-[9px]">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectWatchlistSeed(item);
                      onClose();
                    }}
                    className="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#F2EFE9]"
                  >
                    [SEED]
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveWatchlist(item.id)}
                    className="border border-[#262629] px-1.5 py-0.5 text-[#8A8882] hover:text-[#E62E25]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        seenList.length === 0 ? (
          <p className="font-mono text-[10px] text-[#8A8882] py-4 text-center">0 FILMS BLACKLISTED</p>
        ) : (
          <div className="max-h-60 overflow-y-auto divide-y divide-[#262629] border border-[#262629]">
            {seenList.map((item) => (
              <div key={item.id} className="p-2 flex items-center justify-between gap-2">
                <span className="font-serif text-sm text-[#F2EFE9] truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => onUndoSeen(item.id)}
                  className="font-mono text-[9px] text-[#8A8882] hover:text-[#E62E25]"
                >
                  [UNDO]
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
