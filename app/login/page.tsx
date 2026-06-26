'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a magic link to <strong className="text-gray-700">{email}</strong>.
            <br />Click the link in the email to sign in.
          </p>
          <button
            onClick={() => { setSent(false); setError(''); }}
            className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold mb-1">VAST</p>
          <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-400 mt-1">Value Attribution &amp; Sharing Toolkit</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-gray-400">
          No password needed — we&apos;ll email you a sign-in link.
        </p>
      </div>
    </div>
  );
}
