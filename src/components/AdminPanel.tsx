import { useState, useEffect } from 'react';
import type { AdminUserView, AdminStats, DiscoveryLogItem, Role } from '../lib/types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: number;
}

export default function AdminPanel({ isOpen, onClose, currentUserId }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<DiscoveryLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
        setLogs(data.recentLogs || []);
      }
    } catch {
      setActionMessage('Failed to load administrative telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = async (user: AdminUserView) => {
    const newRole: Role = user.role === 'admin' ? 'member' : 'admin';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        setActionMessage(data.error || 'Failed to update user role');
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setActionMessage(`Role updated: ${user.username} is now ${newRole.toUpperCase()}.`);
    } catch {
      setActionMessage('Network error updating role.');
    }
  };

  const handleDeleteUser = async (user: AdminUserView) => {
    if (!window.confirm(`Permanently delete account "${user.username}" and all associated libraries?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setActionMessage(data.error || 'Failed to delete user');
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setActionMessage(`Account "${user.username}" deleted.`);
    } catch {
      setActionMessage('Network error deleting user.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-[850px] max-h-[85vh] bg-[#0A0A0B] border border-[#262629] flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="p-4 border-b border-[#262629] flex items-center justify-between bg-[#0A0A0B]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#E62E25] uppercase tracking-wider">
              [KURO RBAC]
            </span>
            <span className="font-serif text-lg text-[#F2EFE9]">
              Administrative Control Panel
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-[#8A8882] hover:text-[#E62E25] transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Tab Navigation & Status */}
        <div className="px-4 py-2 border-b border-[#262629] flex items-center justify-between font-mono text-[11px] bg-[#121214]">
          <div className="flex items-center gap-4">
            {(['users', 'logs', 'stats'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`uppercase tracking-wider transition-colors ${
                  activeTab === t
                    ? 'text-[#F2EFE9] font-bold border-b border-[#E62E25]'
                    : 'text-[#8A8882] hover:text-[#F2EFE9]'
                }`}
              >
                {t === 'users' ? `USERS (${users.length})` : t === 'logs' ? 'DISCOVERY AUDIT' : 'SYSTEM METRICS'}
              </button>
            ))}
          </div>
          {isLoading && <span className="text-[#8A8882] animate-pulse">SYNCING...</span>}
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div className="px-4 py-2 border-b border-[#262629] bg-[#121214] font-mono text-[10px] text-[#E62E25]">
            {actionMessage}
          </div>
        )}

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {/* TAB 1: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="border border-[#262629] overflow-x-auto">
              <table className="w-full text-left divide-y divide-[#262629]">
                <thead className="bg-[#121214] text-[10px] text-[#8A8882] uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">USERNAME</th>
                    <th className="p-2.5">ROLE</th>
                    <th className="p-2.5 text-center">PLAN</th>
                    <th className="p-2.5 text-center">SEEN</th>
                    <th className="p-2.5 text-center">QUERIES</th>
                    <th className="p-2.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262629] text-[11px]">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <tr key={user.id} className="hover:bg-[#121214] transition-colors">
                        <td className="p-2.5 text-[#8A8882]">#{user.id}</td>
                        <td className="p-2.5 text-[#F2EFE9] font-semibold">
                          {user.username} {isSelf && <span className="text-[9px] text-[#E62E25] ml-1">(YOU)</span>}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold ${
                              user.role === 'admin'
                                ? 'bg-[#E62E25]/20 text-[#E62E25] border border-[#E62E25]/50'
                                : 'bg-[#262629] text-[#8A8882]'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-[#8A8882]">{user.watchlistCount}</td>
                        <td className="p-2.5 text-center text-[#8A8882]">{user.seenCount}</td>
                        <td className="p-2.5 text-center text-[#8A8882]">{user.discoveryCount}</td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleRoleToggle(user)}
                            disabled={isSelf && user.role === 'admin'}
                            className="border border-[#262629] px-2 py-0.5 text-[9px] text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase disabled:opacity-30 transition-colors"
                          >
                            {user.role === 'admin' ? 'DEMOTE' : 'PROMOTE'}
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="border border-[#262629] px-2 py-0.5 text-[9px] text-[#8A8882] hover:text-[#E62E25] hover:border-[#E62E25] uppercase transition-colors"
                            >
                              DELETE
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: DISCOVERY AUDIT LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-[#8A8882] py-8">NO DISCOVERY QUERIES RECORDED</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border border-[#262629] p-2.5 bg-[#0A0A0B] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#8A8882]">
                      <span className="text-[#F2EFE9] font-bold">
                        USER: {log.username || 'ANONYMOUS'}
                      </span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[#F2EFE9]">
                      <span className="text-[#E62E25] mr-1">SEED:</span> {log.seedTitle} · [{log.preset.toUpperCase()}]
                    </p>
                    <p className="text-[#8A8882] text-[10px] italic">
                      "{log.sentence || 'No user sentence provided'}"
                    </p>
                    <div className="pt-1 text-[9px] text-[#8A8882] flex gap-3">
                      <span>CANDIDATES EVALUATED: {log.candidateCount}</span>
                      <span>MATCHES RETURNED: {log.resultCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM METRICS */}
          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-[#262629] p-4 bg-[#121214]">
                <p className="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL REGISTERED USERS</p>
                <p className="font-serif text-3xl text-[#F2EFE9] mt-2">{stats.totalUsers}</p>
              </div>
              <div className="border border-[#262629] p-4 bg-[#121214]">
                <p className="text-[10px] text-[#8A8882] uppercase tracking-wider">TOTAL DISCOVERIES RUN</p>
                <p className="font-serif text-3xl text-[#E62E25] mt-2">{stats.totalDiscoveries}</p>
              </div>
              <div className="border border-[#262629] p-4 bg-[#121214]">
                <p className="text-[10px] text-[#8A8882] uppercase tracking-wider">ACTIVE SESSIONS (30D)</p>
                <p className="font-serif text-3xl text-[#F2EFE9] mt-2">{stats.activeSessions}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
