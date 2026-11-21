<script lang="ts">
  import type { User } from '$lib/types';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    authError?: string | null;
    onAuthSuccess?: (user: User) => void;
  }

  let { isOpen, onClose, authError = null, onAuthSuccess }: Props = $props();

  const isDev = import.meta.env.DEV;

  let mode = $state<'login' | 'register'>('login');
  let username = $state('');
  let password = $state('');
  let localError = $state<string | null>(null);
  let isSubmitting = $state(false);

  $effect(() => {
    if (authError) {
      localError = authError;
    }
  });

  $effect(() => {
    if (!isOpen) {
      localError = null;
      username = '';
      password = '';
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    localError = null;
    isSubmitting = true;

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        localError = data.error || 'Authentication failed';
        return;
      }

      if (data.user) {
        onAuthSuccess?.(data.user);
        onClose();
      }
    } catch {
      localError = 'Connection error. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-[420px] bg-[#0A0A0B] border border-[#262629] p-6 shadow-none">
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
      <div class="text-center py-1 space-y-2">
        <span class="font-serif text-4xl text-accent leading-none select-none">黒</span>
        <h3 class="font-serif text-2xl text-[#F2EFE9]">AUTHENTICATE</h3>
        <p class="font-mono text-[10px] text-[#8A8882] uppercase tracking-wider leading-relaxed">
          Sign in to sync your Plan to Watch, Blacklist, ratings, and theme across devices.
        </p>
      </div>

      <!-- Error Alert -->
      {#if localError}
        <div class="my-3 p-3 border border-accent bg-accent/10 font-mono text-[11px] text-accent flex items-start justify-between gap-2">
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
      <div class="mt-4">
        <a
          href="/api/auth/google"
          rel="external"
          class="w-full h-11 bg-[#F2EFE9] hover:bg-white text-[#0A0A0B] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors"
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
          <span>CONTINUE WITH GOOGLE</span>
        </a>
      </div>

      {#if isDev}
        <!-- Divider (Dev Only) -->
        <div class="relative flex items-center justify-center my-4">
          <div class="border-t border-[#262629] w-full"></div>
          <span class="bg-[#0A0A0B] px-2 font-mono text-[9px] uppercase tracking-widest text-[#8A8882] shrink-0">
            LOCAL DEV ONLY
          </span>
        </div>

        <!-- Mode Toggle: Sign In / Register -->
        <div class="grid grid-cols-2 border border-[#262629] mb-3">
          <button
            type="button"
            onclick={() => { mode = 'login'; localError = null; }}
            class="py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors {mode === 'login' ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold' : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          >
            [SIGN IN]
          </button>
          <button
            type="button"
            onclick={() => { mode = 'register'; localError = null; }}
            class="py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors {mode === 'register' ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold' : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          >
            [REGISTER]
          </button>
        </div>

        <!-- Form -->
        <form onsubmit={handleSubmit} class="space-y-3">
          <div>
            <label for="auth-username" class="block font-mono text-[9px] uppercase tracking-wider text-[#8A8882] mb-1">
              USERNAME
            </label>
            <input
              id="auth-username"
              type="text"
              required
              autocomplete="username"
              bind:value={username}
              placeholder="Username"
              class="w-full h-10 bg-[#121214] border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label for="auth-password" class="block font-mono text-[9px] uppercase tracking-wider text-[#8A8882] mb-1">
              PASSWORD
            </label>
            <input
              id="auth-password"
              type="password"
              required
              autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
              bind:value={password}
              placeholder="••••••••"
              class="w-full h-10 bg-[#121214] border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full h-10 border border-[#262629] bg-[#121214] hover:bg-accent hover:border-accent hover:text-[#0A0A0B] text-[#F2EFE9] font-mono text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'VERIFYING...' : mode === 'login' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
          </button>
        </form>
      {/if}
    </div>
  </div>
{/if}
