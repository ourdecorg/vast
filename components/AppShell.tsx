'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { apiFetch } from '@/lib/apiFetch';
import type { Session, User } from '@supabase/supabase-js';

type SystemRole = 'OWNER' | 'USER';
type AuthCtx = { user: User | null; systemRole: SystemRole; signOut: () => Promise<void> };
const AuthContext = createContext<AuthCtx>({
  user: null,
  systemRole: 'USER',
  signOut: async () => {},
});
export const useAuth = () => useContext(AuthContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [systemRole, setSystemRole] = useState<SystemRole>('USER');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch system role once session is established
  useEffect(() => {
    if (!session) { setSystemRole('USER'); return; }
    apiFetch('/api/admin/users')
      .then(res => res.ok ? res.json() : null)
      .then(users => {
        if (!Array.isArray(users)) { setSystemRole('USER'); return; }
        const me = users.find((u: { id: string }) => u.id === session.user.id);
        setSystemRole(me?.system_role === 'OWNER' ? 'OWNER' : 'USER');
      })
      .catch(() => setSystemRole('USER'));
  }, [session]);

  // Redirect to /login when not authenticated
  useEffect(() => {
    if (!loading && !session && pathname !== '/login' && !pathname.startsWith('/auth/')) {
      router.replace('/login');
    }
    if (!loading && session && pathname === '/login') {
      router.replace('/');
    }
  }, [loading, session, pathname]);

  async function signOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  // Render login/callback pages without the top bar
  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    return (
      <AuthContext.Provider value={{ user: session?.user ?? null, systemRole, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Unauthenticated — blank while redirect happens
  if (!session) return null;

  return (
    <AuthContext.Provider value={{ user: session.user, systemRole, signOut }}>
      {/* Top bar */}
      <header className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-bold tracking-widest text-indigo-600">VAST</span>
        <div className="flex items-center gap-3 min-w-0">
          {systemRole === 'OWNER' && (
            <Link
              href="/admin"
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors shrink-0"
            >
              Admin
            </Link>
          )}
          <span className="text-xs text-gray-400 truncate max-w-[140px] sm:max-w-none">
            {session.user.email}
          </span>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>

      {children}
    </AuthContext.Provider>
  );
}
