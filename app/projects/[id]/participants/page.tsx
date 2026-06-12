'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { Participant, Archetype } from '@/types/domain';

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', bio: '', archetype_ids: [] as string[] });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [partRes, archRes] = await Promise.all([
      fetch(`/api/projects/${id}/participants`),
      fetch('/api/archetypes'),
    ]);
    const [parts, archs] = await Promise.all([partRes.json(), archRes.json()]);
    setParticipants(Array.isArray(parts) ? parts : []);
    setArchetypes(Array.isArray(archs) ? archs : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function toggleArchetype(aid: string) {
    setForm(f => ({
      ...f,
      archetype_ids: f.archetype_ids.includes(aid)
        ? f.archetype_ids.filter(a => a !== aid)
        : [...f.archetype_ids, aid],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', email: '', bio: '', archetype_ids: [] });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Participants"
        description="Everyone who contributes value to this project."
        action={
          <button onClick={() => setShowForm(s => !s)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            + Add Participant
          </button>
        }
      />

      {showForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">New Participant</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bio / Role Description</label>
              <textarea
                rows={2} value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Archetypes (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {archetypes.map(a => (
                  <button
                    key={a.id} type="button"
                    onClick={() => toggleArchetype(a.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.archetype_ids.includes(a.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Participant'}
              </button>
            </div>
          </form>
        </div>
      )}

      {participants.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No participants yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
                </div>
              </div>
              {p.bio && <p className="mt-2 text-sm text-gray-500">{p.bio}</p>}
              {p.archetypes && p.archetypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.archetypes.map((a) => (
                    <Badge
                      key={a.id}
                      label={a.name}
                      colorKey={a.name.toLowerCase().split('/')[0].trim().replace(/ /g, '_')}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
