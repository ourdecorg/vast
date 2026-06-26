'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';

type Member = {
  id: string;
  user_id: string;
  email: string;
  role: 'PROJECT_ADMIN' | 'USER';
  created_at: string;
};

export default function MembersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'USER' as 'PROJECT_ADMIN' | 'USER' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    setError('');
    const res = await apiFetch(`/api/projects/${projectId}/members`);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to load members');
      setLoading(false);
      return;
    }
    setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadMembers(); }, [projectId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const res = await apiFetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? 'Failed to add member');
      setSaving(false);
      return;
    }
    setShowForm(false);
    setForm({ email: '', role: 'USER' });
    await loadMembers();
    setSaving(false);
  }

  async function handleRemove(member: Member) {
    setRemoving(member.user_id);
    await apiFetch(`/api/projects/${projectId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: member.user_id }),
    });
    await loadMembers();
    setRemoving(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Members</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage who has access to this project.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          + Add member
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'Forbidden' ? 'Access denied — PROJECT_ADMIN role required.' : error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Add member</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'PROJECT_ADMIN' | 'USER' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="USER">USER — can view and contribute</option>
                <option value="PROJECT_ADMIN">PROJECT ADMIN — can manage members</option>
              </select>
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No members yet. Add people to give them access to this project.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Added</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{m.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.role === 'PROJECT_ADMIN'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.role === 'PROJECT_ADMIN' ? 'Project Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(m)}
                      disabled={removing === m.user_id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {removing === m.user_id ? '…' : 'Remove'}
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
