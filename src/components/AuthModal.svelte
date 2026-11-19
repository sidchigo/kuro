<script lang="ts">
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    authError?: string | null;
  }

  let { isOpen, onClose, authError = null }: Props = $props();

  let localError = $state<string | null>(null);

  $effect(() => {
    if (authError) {
      localError = authError;
    }
  });

  $effect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-[400px] bg-[#0A0A0B] border border-[#262629] p-6 shadow-none">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-[#262629] mb-5">
        <span class="font-mono text-xs uppercase tracking-wider text-[#F2EFE9] font-bold">
          [KURO ACCESS]
        </span>
        <button
          type="button"
          onclick={onClose}
          class="font-mono text-xs text-[#8A8882] hover:text-accent transition-colors"
        >
          ✕ CLOSE
        </button>
      </div>

      <!-- Icon & Information -->
      <div class="text-center py-2 space-y-3">
        <span class="font-serif text-5xl text-accent leading-none select-none">黒</span>
        <h3 class="font-serif text-2xl text-[#F2EFE9]">AUTHENTICATE</h3>
        <p class="font-mono text-[11px] text-[#8A8882] uppercase tracking-wider leading-relaxed">
          Sign in to preserve your persistent Plan to Watch list, Already Seen blacklist, and 5-star ratings across devices.
        </p>
      </div>

      <!-- Error Alert -->
      {#if localError}
        <div class="my-4 p-3 border border-accent bg-accent/10 font-mono text-[11px] text-accent flex items-start justify-between gap-2">
          <span>{localError}</span>
          <button
            type="button"
            onclick={() => (localError = null)}
            class="text-[#8A8882] hover:text-[#F2EFE9] text-xs leading-none shrink-0"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      {/if}

      <!-- 1-Click Google OAuth Action -->
      <div class="mt-6 space-y-3">
        <a
          href="/api/auth/google"
          rel="external"
          class="w-full h-12 bg-[#F2EFE9] hover:bg-white text-[#0A0A0B] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors"
        >
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>CONTINUE WITH GOOGLE →</span>
        </a>

        <p class="font-mono text-[9px] text-center text-[#8A8882]/70 uppercase tracking-widest">
          Instant 1-Click Access // No Passwords Required
        </p>
      </div>
    </div>
  </div>
{/if}
