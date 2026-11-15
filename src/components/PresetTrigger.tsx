import type { Preset } from '../lib/types';

interface PresetTriggerProps {
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  canDiscover: boolean;
  isDiscovering: boolean;
  onDiscover: () => void;
}

export default function PresetTrigger({
  preset,
  onPresetChange,
  canDiscover,
  isDiscovering,
  onDiscover,
}: PresetTriggerProps) {
  const PRESET_OPTIONS: { id: Preset; label: string }[] = [
    { id: 'all', label: 'ALL' },
    { id: 'cult', label: 'CULT GEMS' },
    { id: 'foreign', label: 'FOREIGN' },
  ];

  return (
    <section className="bg-[#0A0A0B]">
      {/* 3 Equal-Width Preset Cells */}
      <div className="grid grid-cols-3 border-b border-[#262629] divide-x divide-[#262629]">
        {PRESET_OPTIONS.map((p) => {
          const isActive = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`h-11 font-mono text-[11px] tracking-wider uppercase transition-colors ${
                isActive
                  ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
                  : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Full-Bleed CTA Button */}
      <button
        type="button"
        disabled={!canDiscover || isDiscovering}
        onClick={onDiscover}
        className="w-full h-14 bg-[#F2EFE9] text-[#0A0A0B] font-mono text-sm font-bold tracking-wider uppercase hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all border-b border-[#262629]"
      >
        {isDiscovering ? (
          <span className="flex items-center justify-center gap-2 animate-pulse">
            CURATING CANDIDATES...
          </span>
        ) : (
          'FIND 3 MATCHES →'
        )}
      </button>
    </section>
  );
}
