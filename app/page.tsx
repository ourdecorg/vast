'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';
import type { Project } from '@/types/domain';

const PROJECT_TYPES = ['film', 'software', 'art', 'community', 'research', 'education', 'other'];

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-200 text-gray-500',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'film', currency: 'USD' });
  const [saving, setSaving] = useState(false);

  async function loadProjects() {
    setLoading(true);
    const res = await apiFetch('/api/projects');
    const data = await res.json();
    setProjects(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadProjects(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: '', description: '', type: 'film', currency: 'USD' });
    await loadProjects();
    setSaving(false);
  }

  async function handleSeed() {
    setSeeding(true);
    const res = await apiFetch('/api/seed', { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    await loadProjects();
    setSeeding(false);
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">VAST</h1>
            <p className="text-xs text-gray-400">Value Attribution &amp; Sharing Toolkit</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {seeding ? 'Seeding…' : '▶ Demo'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors"
            >
              + New
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-gray-500 text-sm">
            Each project is a collaborative creation. VAST tracks who gives what and who receives what — transparently and fairly.
          </p>
        </div>

        {showForm && (
          <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">New Project</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="e.g. The Last Summer"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {PROJECT_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {['USD','EUR','GBP','JPY','CAD','AUD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No projects yet.</p>
            <p className="text-gray-400 text-sm mt-2">Click <strong>Load Demo</strong> to populate the film project example, or create a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{p.type}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{p.name}</h3>
                {p.description && (
                  <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{p.description}</p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{p.currency}</span>
                  <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
