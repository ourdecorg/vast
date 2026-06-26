'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

// Handles the redirect after the user clicks the magic link in their email.
// Supabase appends the session tokens as a URL hash fragment (#access_token=...).
// The client SDK automatically parses the hash when detectSessionInUrl is true (default).
export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = getSupabaseClient();

    // getSession() triggers hash parsing and session storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
      } else {
        // Fallback: listen for the auth state change event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
          if (event === 'SIGNED_IN' && s) {
            subscription.unsubscribe();
            router.replace('/');
          }
        });
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-3xl mb-3 animate-pulse">✨</div>
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  );
}
