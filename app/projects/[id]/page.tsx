'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import type { Project, LedgerEvent } from '@/types/domain';

const EVENT_LABELS: Record<string, string> = {
  project_created:          'Project created',
  participant_added:        'Participant added',
  contribution_recorded:    'Contribution recorded',
  compensation_rule_defined:'Compensation rule defined',
  rights_allocated:         'Rights allocated',
  payment_made:             'Payment made',
  revenue_recorded:         'Revenue recorded',
  budget_set:               'Budget set',
};

const PROJECT_TYPES = ['film', 'software', 'art', 'community', 'research', 'education', 'other'];
const PROJECT_STATUSES = ['draft', 'active', 'completed', 'archived'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'CAD', 'AUD'];

type EditForm = { name: string; description: string; type: string; status: string; currency: string };

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState({ participants: 0, contributions: 0, ledgerEvents: 0, paymentsTotal: 0 });
  const [recent, setRecent] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', description: '', type: '', status: '', currency: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [projRes, partRes, contribRes, ledgerRes, payRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/projects/${id}/participants`),
        fetch(`/api/projects/${id}/contributions`),
        fetch(`/api/projects/${id}/ledger?limit=8`),
        fetch(`/api/projects/${id}/payments`),
      ]);
      const [proj, parts, contribs, ledger, pays] = await Promise.all([
        projRes.json(), partRes.json(), contribRes.json(), ledgerRes.json(), payRes.json(),
      ]);
      setProject(proj);
      setStats({
        participants: Array.isArray(parts) ? parts.length : 0,
        contributions: Array.isArray(contribs) ? contribs.length : 0,
        ledgerEvents: ledger.total ?? 0,
        paymentsTotal: Array.isArray(pays)
          ? pays.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)
          : 0,
      });
      setRecent(ledger.events ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function startEdit() {
    if (!project) return;
    setEditForm({
      name: project.name,
      description: project.description ?? '',
      type: project.type,
      status: project.status,
      currency: project.currency,
    });
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;
  if (!project) return <div className="text-red-500">Project not found.</div>;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      {/* Project header */}
      <div className="mb-8">
        {editing ? (
          <form onSubmit={saveEdit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Edit Project</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                required value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2} value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">{project.type}</span>
                <Badge label={project.status} colorKey={project.status} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-gray-500 text-sm max-w-2xl">{project.description}</p>
              )}
            </div>
            <button
              onClick={startEdit}
              className="ml-4 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Participants" value={stats.participants} />
        <StatCard label="Contributions" value={stats.contributions} />
        <StatCard label="Paid Out" value={fmtCurrency(stats.paymentsTotal)} accent />
        <StatCard label="Ledger Events" value={stats.ledgerEvents} sub="hash-chained" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { href: `/projects/${id}/budget`,        label: 'Budget Overview',   icon: '💰' },
          { href: `/projects/${id}/participants`,   label: 'Participants',       icon: '👥' },
          { href: `/projects/${id}/compensation`,   label: 'Compensation Rules', icon: '📋' },
          { href: `/projects/${id}/fairness`,       label: 'Fairness Map',       icon: '⚖️' },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            <span>{icon}</span> {label}
          </Link>
        ))}
      </div>

      {/* Recent ledger activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Ledger Events</h2>
          <Link href={`/projects/${id}/ledger`} className="text-xs text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No ledger events yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map(ev => (
              <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{ev.hash.slice(0, 12)}…</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(ev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
