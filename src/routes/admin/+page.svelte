<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { AdminUserView, AdminStats, DiscoveryLogItem, Role } from '$lib/types';
  import AccentSwitcher from '$lib/../components/AccentSwitcher.svelte';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'users' | 'logs' | 'stats'>('users');
  let users = $state<AdminUserView[]>([]);
  let stats = $state<AdminStats | null>(null);
  let logs = $state<DiscoveryLogItem[]>([]);
  let isLoading = $state(false);
  let actionMessage = $state<string | null>(null);

  const currentUserId = $derived(data.user.id);

  onMount(() => {
    loadData();
  });

  async function loadData() {
    isLoading = true;
    actionMessage = null;
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        users = uData.users || [];
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        stats = sData.stats || null;
        logs = sData.recentLogs || [];
      }
    } catch {
      actionMessage = 'Failed to load administrative telemetry.';
    } finally {
      isLoading = false;
    }
  }

  async function handleRoleToggle(user: AdminUserView) {
    const newRole: Role = user.role === 'admin' ? 'member' : 'admin';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });

      if (!res.ok) {
        const resData = await res.json();
        actionMessage = resData.error || 'Failed to update user role';
        return;
      }

      users = users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u));
      actionMessage = `Role updated: ${user.username} is now ${newRole.toUpperCase()}.`;
    } catch {
      actionMessage = 'Network error updating role.';
    }
  }

  async function handleDeleteUser(user: AdminUserView) {
    if (!window.confirm(`Permanently delete account "${user.username}" and all associated libraries?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const resData = await res.json();
        actionMessage = resData.error || 'Failed to delete user';
        return;
      }

      users = users.filter((u) => u.id !== user.id);
      actionMessage = `Account "${user.username}" deleted.`;
    } catch {
      actionMessage = 'Network error deleting user.';
    }
  }

  const tabs: readonly ('users' | 'logs' | 'stats')[] = ['users', 'logs', 'stats'];
</script>

<svelte:head>
  <title>kuro. // Admin Telemetry</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-[#0A0A0B] flex flex-col select-none text-[#F2EFE9]">
  <!-- Top Header Bar -->
  <header
    class="h-16 px-6 lg:px-12 border-b border-[#262629] bg-[#0A0A0B] sticky top-0 z-30 flex items-center justify-between gap-4 shrink-0"
  >
    <div class="flex items-center gap-6 min-w-0">
      <div class="flex items-baseline gap-2 shrink-0">
        <a href="/" class="font-serif text-2xl font-normal text-[#F2EFE9] hover:opacity-80 transition-opacity">
          kuro<span class="text-accent" style="color: var(--accent);">.</span>
        </a>
        <span class="font-mono text-xs uppercase text-[#8A8882] tracking-widest hidden sm:inline">
          // ADMIN PANEL
        </span>
      </div>

      <!-- Segmented Navigation Toggle -->
      <nav
        class="hidden md:inline-flex items-stretch border border-[#262629] divide-x divide-[#262629] font-mono text-[11px] tracking-wider uppercase"
      >
        {#each tabs as t (t)}
          {@const isActive = activeTab === t}
          <button
            type="button"
            onclick={() => (activeTab = t)}
            class="h-9 px-4 whitespace-nowrap transition-colors {isActive
              ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
              : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
          >
            {t === 'users'
              ? `USERS (${users.length})`
              : t === 'logs'
                ? 'DISCOVERY AUDIT'
                : 'SYSTEM METRICS'}
          </button>
        {/each}
      </nav>
    </div>

    <!-- Right Actions: Refresh, Archive & Return to Discovery Engine -->
    <div class="flex items-center gap-3 shrink-0">
      {#if isLoading}
        <span class="font-mono text-[10px] uppercase tracking-widest text-[#8A8882] animate-pulse">
          SYNCING...
        </span>
      {/if}
      <button
        type="button"
        onclick={loadData}
        disabled={isLoading}
        class="hidden sm:inline-flex items-center h-9 font-mono text-[10px] uppercase tracking-wider px-3 border border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] disabled:opacity-40 transition-colors"
      >
        [REFRESH]
      </button>
      <div class="hidden md:block">
        <AccentSwitcher />
      </div>
      <a
        href="/archive"
        class="h-9 inline-flex items-center font-mono text-xs uppercase px-3 border border-[#262629] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] transition-colors gap-1.5"
      >
        <span>[ARCHIVE]</span>
      </a>
      <a
        href="/"
        class="h-9 inline-flex items-center font-mono text-xs uppercase px-3 border border-[#262629] hover:border-accent hover:text-accent text-[#F2EFE9] transition-colors gap-1.5"
      >
        <span>[← ENGINE]</span>
      </a>
    </div>
  </header>

  <!-- Mobile Segmented Navigation Strip -->
  <nav
    class="md:hidden grid grid-cols-3 border-b border-[#262629] divide-x divide-[#262629] bg-[#0A0A0B] font-mono text-[10px] tracking-wider uppercase shrink-0 sticky top-16 z-20"
  >
    {#each tabs as t (t)}
      {@const isActive = activeTab === t}
      <button
        type="button"
        onclick={() => (activeTab = t)}
        class="h-10 transition-colors {isActive
          ? 'bg-[#F2EFE9] text-[#0A0A0B] font-bold'
          : 'bg-transparent text-[#8A8882] hover:text-[#F2EFE9]'}"
      >
        {t === 'users' ? `USERS (${users.length})` : t === 'logs' ? 'AUDIT' : 'METRICS'}
      </button>
    {/each}
  </nav>

  <!-- Action Message Alert -->
  {#if actionMessage}
    <div
      class="px-6 lg:px-12 py-2.5 border-b border-[#262629] bg-[#121214] font-mono text-[11px] text-accent flex items-center justify-between shrink-0"
    >
      <span>{actionMessage}</span>
      <button
        type="button"
        onclick={() => (actionMessage = null)}
        class="text-[#8A8882] hover:text-[#F2EFE9] text-xs leading-none"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  {/if}

  <!-- Main Content Area -->
  <main class="flex-1 p-6 lg:p-12 font-mono text-xs">
    <div class="max-w-7xl mx-auto">
      <!-- TAB 1: USERS DIRECTORY -->
      {#if activeTab === 'users'}
        <div>
          <div class="flex items-baseline justify-between mb-6 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              USERS // {users.length} {users.length === 1 ? 'ACCOUNT' : 'ACCOUNTS'}
            </span>
            <span class="font-mono text-[10px] uppercase text-[#8A8882]">
              RBAC ACCESS CONTROL
            </span>
          </div>

          <div class="border border-[#262629] overflow-x-auto bg-[#0A0A0B]">
            <table class="w-full text-left divide-y divide-[#262629]">
              <thead class="bg-[#121214] text-[10px] text-[#8A8882] uppercase tracking-wider">
                <tr>
                  <th class="p-3">ID</th>
                  <th class="p-3">USERNAME</th>
                  <th class="p-3">ROLE</th>
                  <th class="p-3 text-center">PLAN</th>
                  <th class="p-3 text-center">SEEN</th>
                  <th class="p-3 text-center">QUERIES</th>
                  <th class="p-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#262629] text-[11px]">
                {#each users as user (user.id)}
                  {@const isSelf = user.id === currentUserId}
                  <tr class="hover:bg-[#121214] transition-colors">
                    <td class="p-3 text-[#8A8882]">#{user.id}</td>
                    <td class="p-3 text-[#F2EFE9] font-semibold">
                      <div>
                        <div class="flex items-center gap-1">
                          <span>{user.username}</span>
                          {#if isSelf}
                            <span class="text-[9px] text-accent ml-1">(YOU)</span>
                          {/if}
                        </div>
                        {#if user.email}
                          <p class="text-[9px] text-[#8A8882] font-normal font-mono">{user.email}</p>
                        {/if}
                      </div>
                    </td>
                    <td class="p-3">
                      <span
                        class="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold {user.role === 'admin'
                          ? 'bg-accent/20 text-accent border border-accent/50'
                          : 'bg-[#262629] text-[#8A8882]'}"
                      >
                        {user.role}
                      </span>
                    </td>
                    <td class="p-3 text-center text-[#8A8882]">{user.watchlistCount}</td>
                    <td class="p-3 text-center text-[#8A8882]">{user.seenCount}</td>
                    <td class="p-3 text-center text-[#8A8882]">{user.discoveryCount}</td>
                    <td class="p-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onclick={() => handleRoleToggle(user)}
                        disabled={isSelf && user.role === 'admin'}
                        class="border border-[#262629] px-2.5 py-1 text-[9px] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase disabled:opacity-30 transition-colors"
                      >
                        {user.role === 'admin' ? 'DEMOTE' : 'PROMOTE'}
                      </button>
                      {#if !isSelf}
                        <button
                          type="button"
                          onclick={() => handleDeleteUser(user)}
                          class="border border-[#262629] px-2.5 py-1 text-[9px] text-[#8A8882] hover:text-accent hover:border-accent uppercase transition-colors"
                        >
                          DELETE
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- TAB 2: DISCOVERY AUDIT LOG -->
      {#if activeTab === 'logs'}
        <div>
          <div class="flex items-baseline justify-between mb-2 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              DISCOVERY AUDIT // {logs.length} {logs.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
            <span class="font-mono text-[10px] uppercase text-[#8A8882]">
              TELEMETRY STREAM
            </span>
          </div>
          <p class="font-mono text-[10px] text-[#8A8882]/80 uppercase tracking-wider mb-6">
            Real-time audit log of user prompts and recommendation matches generated by the discovery engine.
          </p>

          {#if logs.length === 0}
            <div class="py-24 text-center border border-[#262629] bg-[#0A0A0B]">
              <p class="font-serif text-2xl text-[#8A8882]">NO DISCOVERY QUERIES RECORDED</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each logs as log (log.id)}
                <div class="border border-[#262629] p-4 bg-[#0A0A0B] hover:border-[#8A8882] transition-colors space-y-2">
                  <div class="flex items-center justify-between text-[10px] text-[#8A8882]">
                    <span class="text-[#F2EFE9] font-bold">
                      USER: {log.username || 'ANONYMOUS'}
                    </span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p class="text-[#F2EFE9]">
                    <span class="text-accent mr-1">SEED:</span> {log.seedTitle} · [{log.preset.toUpperCase()}]
                  </p>
                  <p class="font-serif italic text-xs text-[#8A8882] border-l-2 border-accent pl-2">
                    "{log.sentence || 'No user sentence provided'}"
                  </p>
                  <div class="pt-2 border-t border-[#262629] text-[9px] text-[#8A8882] flex gap-4 uppercase">
                    <span>CANDIDATES: {log.candidateCount}</span>
                    <span>MATCHES: {log.resultCount}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- TAB 3: SYSTEM METRICS -->
      {#if activeTab === 'stats'}
        <div>
          <div class="flex items-baseline justify-between mb-6 pb-2 border-b border-[#262629]">
            <span class="font-mono text-xs uppercase tracking-widest text-[#8A8882]">
              SYSTEM METRICS // LIVE OVERVIEW
            </span>
          </div>

          {#if stats}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="border border-[#262629] p-6 bg-[#121214]">
                <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL REGISTERED USERS</p>
                <p class="font-serif text-4xl text-[#F2EFE9] mt-3">{stats.totalUsers}</p>
              </div>
              <div class="border border-[#262629] p-6 bg-[#121214]">
                <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL DISCOVERIES RUN</p>
                <p class="font-serif text-4xl text-accent mt-3">{stats.totalDiscoveries}</p>
              </div>
              <div class="border border-[#262629] p-6 bg-[#121214]">
                <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">ACTIVE SESSIONS (30D)</p>
                <p class="font-serif text-4xl text-[#F2EFE9] mt-3">{stats.activeSessions}</p>
              </div>
            </div>
          {:else}
            <div class="py-24 text-center border border-[#262629] bg-[#0A0A0B]">
              <p class="font-serif text-2xl text-[#8A8882]">LOADING TELEMETRY...</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </main>
</div>
