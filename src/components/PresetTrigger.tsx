import type { Preset } from '../lib/types';

interface PresetTriggerProps {
  preset?: Preset;
  onPresetChange?: (preset: Preset) => void;
  canDiscover: boolean;
  isDiscovering: boolean;
  onDiscover: () => void;
}

export default function PresetTrigger({
  canDiscover,
  isDiscovering,
  onDiscover,
}: PresetTriggerProps) {
  return (
    <section className="bg-[#0A0A0B]">
      {/* Full-Bleed CTA Button */}
      <button
        type="button"
        disabled={!canDiscover || isDiscovering}
        onClick={onDiscover}
        className="w-full h-14 bg-[#F2EFE9] text-[#0A0A0B] font-mono text-sm font-bold tracking-wider uppercase hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all border-b border-[#262629]"
      >
        {isDiscovering ? (
          <span className="flex items-center justify-center gap-2 animate-pulse text-[#0A0A0B]">
            SEARCHING ARCHIVE...
          </span>
        ) : (
          'FIND 3 MATCHES →'
        )}
      </button>
    </section>
  );
}
