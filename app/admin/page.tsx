'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

type UserRow = {
  id: string;
  email: string;
  system_role: 'OWNER' | 'USER';
  created_at: string;
  last_sign_in_at: string | null;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError('');
    const res = await apiFetch('/api/admin/users');
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to load users');
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleOwner(u: UserRow) {
    setActing(u.id);
    const action = u.system_role === 'OWNER' ? 'revoke_owner' : 'grant_owner';
    await apiFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, action }),
    });
    await loadUsers();
    setActing(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage user roles. Only OWNERs can access this page.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'Forbidden' ? 'Access denied — OWNER role required.' : error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.system_role === 'OWNER'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.system_role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleOwner(u)}
                      disabled={acting === u.id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        u.system_role === 'OWNER'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {acting === u.id
                        ? '…'
                        : u.system_role === 'OWNER'
                        ? 'Revoke OWNER'
                        : 'Grant OWNER'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
