import { useState, type SyntheticEvent } from 'react';
import type { User } from '../lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      onAuthSuccess(data.user);
      onClose();
    } catch {
      setError('Network communication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] bg-[#0A0A0B] border border-[#262629] p-6 shadow-none animate-in fade-in zoom-in-95 duration-100">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262629] mb-4">
          <div className="flex items-center gap-4 font-mono text-xs uppercase">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`pb-1 transition-colors ${
                tab === 'login'
                  ? 'text-[#F2EFE9] border-b border-[#E62E25] font-bold'
                  : 'text-[#8A8882] hover:text-[#F2EFE9]'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`pb-1 transition-colors ${
                tab === 'register'
                  ? 'text-[#F2EFE9] border-b border-[#E62E25] font-bold'
                  : 'text-[#8A8882] hover:text-[#F2EFE9]'
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-sm text-[#8A8882] hover:text-[#E62E25] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 border border-[#E62E25] bg-[#E62E25]/10 font-mono text-[11px] text-[#E62E25]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mb-1">
              USERNAME
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. kuro_member"
              className="w-full h-10 bg-transparent border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-[#F2EFE9] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] text-[#8A8882] uppercase tracking-wider mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 bg-transparent border border-[#262629] px-3 font-mono text-xs text-[#F2EFE9] placeholder:text-[#8A8882]/50 focus:border-[#F2EFE9] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#F2EFE9] text-[#0A0A0B] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-40 transition-colors mt-2"
          >
            {isLoading ? 'AUTHENTICATING...' : tab === 'login' ? 'SIGN IN →' : 'REGISTER ACCOUNT →'}
          </button>
        </form>
      </div>
    </div>
  );
}
