'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { Participant, Archetype } from '@/types/domain';

type ParticipantForm = { name: string; email: string; phone: string; bio: string; archetype_ids: string[] };

const EMPTY_FORM: ParticipantForm = { name: '', email: '', phone: '', bio: '', archetype_ids: [] };

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState<ParticipantForm>(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ParticipantForm>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

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

  function toggleArchetype(form: ParticipantForm, aid: string): ParticipantForm {
    return {
      ...form,
      archetype_ids: form.archetype_ids.includes(aid)
        ? form.archetype_ids.filter(a => a !== aid)
        : [...form.archetype_ids, aid],
    };
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    await fetch(`/api/projects/${id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    setAddForm(EMPTY_FORM);
    setShowForm(false);
    await load();
    setAddSaving(false);
  }

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      email: p.email ?? '',
      phone: p.phone ?? '',
      bio: p.bio ?? '',
      archetype_ids: (p.archetypes ?? []).map(a => a.id),
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    await fetch(`/api/projects/${id}/participants/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    await load();
    setEditSaving(false);
  }

  async function handleDelete(participantId: string) {
    if (!confirm('Remove this participant? This cannot be undone.')) return;
    await fetch(`/api/projects/${id}/participants/${participantId}`, { method: 'DELETE' });
    await load();
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
          <form onSubmit={handleAdd} className="space-y-4">
            <ParticipantFields
              form={addForm}
              archetypes={archetypes}
              onChange={f => setAddForm(f)}
              onToggleArchetype={aid => setAddForm(f => toggleArchetype(f, aid))}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={addSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {addSaving ? 'Adding…' : 'Add Participant'}
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
              {editingId === p.id ? (
                <form onSubmit={handleEdit} className="space-y-4">
                  <ParticipantFields
                    form={editForm}
                    archetypes={archetypes}
                    onChange={f => setEditForm(f)}
                    onToggleArchetype={aid => setEditForm(f => toggleArchetype(f, aid))}
                  />
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-gray-600">
                      Cancel
                    </button>
                    <button type="submit" disabled={editSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
                      {p.phone && <p className="text-xs text-gray-400 mt-0.5">{p.phone}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantFields({
  form,
  archetypes,
  onChange,
  onToggleArchetype,
}: {
  form: ParticipantForm;
  archetypes: Archetype[];
  onChange: (f: ParticipantForm) => void;
  onToggleArchetype: (aid: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
          <input
            required value={form.name}
            onChange={e => onChange({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email" value={form.email}
            onChange={e => onChange({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel" value={form.phone}
            onChange={e => onChange({ ...form, phone: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Bio / Role Description</label>
        <textarea
          rows={2} value={form.bio}
          onChange={e => onChange({ ...form, bio: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Archetypes</label>
        <div className="flex flex-wrap gap-2">
          {archetypes.map(a => (
            <button
              key={a.id} type="button"
              onClick={() => onToggleArchetype(a.id)}
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
    </>
  );
}
