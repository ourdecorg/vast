'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { Contribution, Participant, ContributionType } from '@/types/domain';

export default function ContributionsPage() {
  const { id } = useParams<{ id: string }>();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    participant_id: '', contribution_type_id: '', amount: '', unit: '', description: '', date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [contribRes, partRes, typeRes] = await Promise.all([
      fetch(`/api/projects/${id}/contributions`),
      fetch(`/api/projects/${id}/participants`),
      fetch('/api/contribution-types'),
    ]);
    const [contribs, parts, typeList] = await Promise.all([contribRes.json(), partRes.json(), typeRes.json()]);
    setContributions(Array.isArray(contribs) ? contribs : []);
    setParticipants(Array.isArray(parts) ? parts : []);
    setTypes(Array.isArray(typeList) ? typeList : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${id}/contributions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setForm({ participant_id: '', contribution_type_id: '', amount: '', unit: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  const selectedType = types.find(t => t.id === form.contribution_type_id);

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Contributions"
        description="Record every act of value that participants bring to the project."
        action={
          <button onClick={() => setShowForm(s => !s)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            + Record Contribution
          </button>
        }
      />

      {showForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">New Contribution</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Participant *</label>
              <select
                required value={form.participant_id}
                onChange={e => setForm(f => ({ ...f, participant_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— select —</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contribution Type *</label>
              <select
                required value={form.contribution_type_id}
                onChange={e => {
                  const t = types.find(x => x.id === e.target.value);
                  setForm(f => ({ ...f, contribution_type_id: e.target.value, unit: t?.unit ?? '' }));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— select —</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
              <input
                required type="number" min={0} step="any"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={selectedType?.unit ? `in ${selectedType.unit}` : 'quantity'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={selectedType?.unit ?? 'hours, days, USD…'}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex items-end justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Recording…' : 'Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {contributions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No contributions recorded yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Participant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contribution</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contributions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.participants?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.contribution_types?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={c.contribution_types?.category ?? ''}
                      colorKey={c.contribution_types?.category}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {Number(c.amount).toLocaleString()} {c.unit ?? ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.description}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
