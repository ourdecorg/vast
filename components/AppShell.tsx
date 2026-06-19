'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthCtx = { user: User | null; signOut: () => Promise<void> };
const AuthContext = createContext<AuthCtx>({ user: null, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
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

  // Redirect to /login when not authenticated
  useEffect(() => {
    if (!loading && !session && pathname !== '/login') {
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

  // Render login page without the top bar
  if (pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user: session?.user ?? null, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Unauthenticated — blank while redirect happens
  if (!session) return null;

  return (
    <AuthContext.Provider value={{ user: session.user, signOut }}>
      {/* Top bar */}
      <header className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-bold tracking-widest text-indigo-600">VAST</span>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-400 truncate max-w-[140px] sm:max-w-none">{session.user.email}</span>
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
