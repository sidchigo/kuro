<script lang="ts">
  import type { User } from '$lib/types';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: (user: User) => void;
  }

  let { isOpen, onClose, onAuthSuccess }: Props = $props();

  let tab = $state<'login' | 'register'>('login');
  let username = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let isLoading = $state(false);
  let usernameInput: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (isOpen) {
      error = null;
      setTimeout(() => usernameInput?.focus(), 0);
    }
  });

  async function hashClientPassword(pwd: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return pwd;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = null;
    isLoading = true;

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const securePassword = await hashClientPassword(password);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: securePassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        error = data.error || 'Authentication failed';
        return;
      }

      password = '';
      onAuthSuccess(data.user);
      onClose();
    } catch {
      error = 'Network communication failed';
    } finally {
      isLoading = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div class="w-full max-w-[380px] bg-[#0A0A0B] border border-[#262629] p-6 shadow-none">
      <!-- Header & Tabs -->
      <div class="flex items-center justify-between pb-3 border-b border-[#262629] mb-4">
        <div class="flex items-center gap-4 font-mono text-xs uppercase">
          <button
            type="button"
            onclick={() => {
              tab = 'login';
              error = null;
            }}
            class="pb-1 transition-colors {tab === 'login'
              ? 'text-[#F2EFE9] border-b border-[#E62E25] font-bold'
              : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          >
            SIGN IN
          </button>
          <button
            type="button"
            onclick={() => {
              tab = 'register';
              error = null;
            }}
            class="pb-1 transition-colors {tab === 'register'
              ? 'text-[#F2EFE9] border-b border-[#E62E25] font-bold'
              : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
          >
            CREATE ACCOUNT
          </button>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="font-mono text-sm text-[#8A8882] hover:text-[#E62E25] transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Error message -->
      {#if error}
        <div class="mb-4 p-2.5 border border-[#E62E25] bg-[#E62E25]/10 font-mono text-[11px] text-[#E62E25]">
          {error}
        </div>
      {/if}

      <!-- Form -->
      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label
            for="kuro-auth-username"
            class="block font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mb-1"
          >
            USERNAME
          </label>
          <input
            id="kuro-auth-username"
            bind:this={usernameInput}
            type="text"
            required
            bind:value={username}
            placeholder="e.g. kuro_member"
            class="w-full h-10 bg-transparent border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-[#F2EFE9] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label
            for="kuro-auth-password"
            class="block font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mb-1"
          >
            PASSWORD
          </label>
          <input
            id="kuro-auth-password"
            type="password"
            required
            bind:value={password}
            placeholder="••••••••"
            class="w-full h-10 bg-transparent border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-[#F2EFE9] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          class="w-full h-11 bg-[#F2EFE9] text-[#0A0A0B] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-40 transition-colors mt-2"
        >
          {isLoading ? 'AUTHENTICATING...' : tab === 'login' ? 'SIGN IN →' : 'REGISTER ACCOUNT →'}
        </button>
      </form>
    </div>
  </div>
{/if}
