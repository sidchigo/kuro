<script lang="ts">
  import type { AdminUserView, AdminStats, DiscoveryLogItem, Role } from '$lib/types';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: number;
  }

  let { isOpen, onClose, currentUserId }: Props = $props();

  let activeTab = $state<'users' | 'logs' | 'stats'>('users');
  let users = $state<AdminUserView[]>([]);
  let stats = $state<AdminStats | null>(null);
  let logs = $state<DiscoveryLogItem[]>([]);
  let isLoading = $state(false);
  let actionMessage = $state<string | null>(null);

  $effect(() => {
    if (isOpen) {
      loadData();
    }
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
        const data = await usersRes.json();
        users = data.users || [];
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        stats = data.stats || null;
        logs = data.recentLogs || [];
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
        const data = await res.json();
        actionMessage = data.error || 'Failed to update user role';
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
        const data = await res.json();
        actionMessage = data.error || 'Failed to delete user';
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

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-[850px] max-h-[85vh] bg-[#0A0A0B] border border-[#262629] flex flex-col overflow-hidden select-none"
    >
      <!-- Header -->
      <div class="p-4 border-b border-[#262629] flex items-center justify-between bg-[#0A0A0B]">
        <div class="flex items-center gap-3">
          <span class="font-mono text-xs font-bold text-[#E62E25] uppercase tracking-wider">
            [KURO RBAC]
          </span>
          <span class="font-serif text-lg text-[#F2EFE9]">
            Administrative Control Panel
          </span>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="font-mono text-xs text-[#8A8882] hover:text-[#E62E25] transition-colors"
        >
          ✕ CLOSE
        </button>
      </div>

      <!-- Tab Navigation & Status -->
      <div
        class="px-4 py-2 border-b border-[#262629] flex items-center justify-between font-mono text-[11px] bg-[#121214]"
      >
        <div class="flex items-center gap-4">
          {#each tabs as t (t)}
            <button
              type="button"
              onclick={() => (activeTab = t)}
              class="uppercase tracking-wider transition-colors {activeTab === t
                ? 'text-[#F2EFE9] font-bold border-b border-[#E62E25]'
                : 'text-[#8A8882] hover:text-[#F2EFE9]'}"
            >
              {t === 'users' ? `USERS (${users.length})` : t === 'logs' ? 'DISCOVERY AUDIT' : 'SYSTEM METRICS'}
            </button>
          {/each}
        </div>
        {#if isLoading}
          <span class="text-[#8A8882] animate-pulse">SYNCING...</span>
        {/if}
      </div>

      <!-- Action Message Alert -->
      {#if actionMessage}
        <div class="px-4 py-2 border-b border-[#262629] bg-[#121214] font-mono text-[10px] text-[#E62E25]">
          {actionMessage}
        </div>
      {/if}

      <!-- Body Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        <!-- TAB 1: USERS DIRECTORY -->
        {#if activeTab === 'users'}
          <div class="border border-[#262629] overflow-x-auto">
            <table class="w-full text-left divide-y divide-[#262629]">
              <thead class="bg-[#121214] text-[10px] text-[#8A8882] uppercase tracking-wider">
                <tr>
                  <th class="p-2.5">ID</th>
                  <th class="p-2.5">USERNAME</th>
                  <th class="p-2.5">ROLE</th>
                  <th class="p-2.5 text-center">PLAN</th>
                  <th class="p-2.5 text-center">SEEN</th>
                  <th class="p-2.5 text-center">QUERIES</th>
                  <th class="p-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#262629] text-[11px]">
                {#each users as user (user.id)}
                  {@const isSelf = user.id === currentUserId}
                  <tr class="hover:bg-[#121214] transition-colors">
                    <td class="p-2.5 text-[#8A8882]">#{user.id}</td>
                    <td class="p-2.5 text-[#F2EFE9] font-semibold">
                      {user.username}
                      {#if isSelf}
                        <span class="text-[9px] text-[#E62E25] ml-1">(YOU)</span>
                      {/if}
                    </td>
                    <td class="p-2.5">
                      <span
                        class="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold {user.role === 'admin'
                          ? 'bg-[#E62E25]/20 text-[#E62E25] border border-[#E62E25]/50'
                          : 'bg-[#262629] text-[#8A8882]'}"
                      >
                        {user.role}
                      </span>
                    </td>
                    <td class="p-2.5 text-center text-[#8A8882]">{user.watchlistCount}</td>
                    <td class="p-2.5 text-center text-[#8A8882]">{user.seenCount}</td>
                    <td class="p-2.5 text-center text-[#8A8882]">{user.discoveryCount}</td>
                    <td class="p-2.5 text-right space-x-2">
                      <button
                        type="button"
                        onclick={() => handleRoleToggle(user)}
                        disabled={isSelf && user.role === 'admin'}
                        class="border border-[#262629] px-2 py-0.5 text-[9px] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase disabled:opacity-30 transition-colors"
                      >
                        {user.role === 'admin' ? 'DEMOTE' : 'PROMOTE'}
                      </button>
                      {#if !isSelf}
                        <button
                          type="button"
                          onclick={() => handleDeleteUser(user)}
                          class="border border-[#262629] px-2 py-0.5 text-[9px] text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25] uppercase transition-colors"
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
        {/if}

        <!-- TAB 2: DISCOVERY AUDIT LOG -->
        {#if activeTab === 'logs'}
          <div class="space-y-2">
            {#if logs.length === 0}
              <p class="text-center text-[#8A8882] py-8">NO DISCOVERY QUERIES RECORDED</p>
            {:else}
              {#each logs as log (log.id)}
                <div class="border border-[#262629] p-2.5 bg-[#0A0A0B] space-y-1">
                  <div class="flex items-center justify-between text-[10px] text-[#8A8882]">
                    <span class="text-[#F2EFE9] font-bold">
                      USER: {log.username || 'ANONYMOUS'}
                    </span>
                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p class="text-[#F2EFE9]">
                    <span class="text-[#E62E25] mr-1">SEED:</span> {log.seedTitle} · [{log.preset.toUpperCase()}]
                  </p>
                  <p class="text-[#8A8882] text-[10px] italic">
                    "{log.sentence || 'No user sentence provided'}"
                  </p>
                  <div class="pt-1 text-[9px] text-[#8A8882] flex gap-3">
                    <span>CANDIDATES EVALUATED: {log.candidateCount}</span>
                    <span>MATCHES RETURNED: {log.resultCount}</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}

        <!-- TAB 3: SYSTEM METRICS -->
        {#if activeTab === 'stats' && stats}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="border border-[#262629] p-4 bg-[#121214]">
              <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL REGISTERED USERS</p>
              <p class="font-serif text-3xl text-[#F2EFE9] mt-2">{stats.totalUsers}</p>
            </div>
            <div class="border border-[#262629] p-4 bg-[#121214]">
              <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL DISCOVERIES RUN</p>
              <p class="font-serif text-3xl text-[#E62E25] mt-2">{stats.totalDiscoveries}</p>
            </div>
            <div class="border border-[#262629] p-4 bg-[#121214]">
              <p class="text-[10px] text-[#8A8882] uppercase tracking-wider">ACTIVE SESSIONS (30D)</p>
              <p class="font-serif text-3xl text-[#F2EFE9] mt-2">{stats.activeSessions}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
