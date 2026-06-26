'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import SectionHeading from '@/components/SectionHeading';
import type { ContributionEvent, ContributionEventStatus, Participant, ContributionType } from '@/types/domain';

const STATUS_LABELS: Record<ContributionEventStatus, string> = {
  planned:   'Planned',
  occurred:  'Occurred',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<ContributionEventStatus, string> = {
  planned:   'bg-blue-100 text-blue-700',
  occurred:  'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500 line-through',
};

const EMPTY_FORM = {
  event_date: new Date().toISOString().split('T')[0],
  description: '',
  location: '',
  status: 'planned' as ContributionEventStatus,
  contribution_type_id: '',
  default_amount: '',
  participant_ids: [] as string[],
};

export default function ContributionEventsPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  async function load() {
    const [evRes, partRes, typeRes] = await Promise.all([
      apiFetch(`/api/projects/${id}/contribution-events`),
      apiFetch(`/api/projects/${id}/participants`),
      apiFetch('/api/contribution-types'),
    ]);
    const [evs, parts, typeList] = await Promise.all([evRes.json(), partRes.json(), typeRes.json()]);
    setEvents(Array.isArray(evs) ? evs : []);
    setParticipants(Array.isArray(parts) ? parts : []);
    setTypes(Array.isArray(typeList) ? typeList : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function handleDateChange(date: string) {
    setForm(f => {
      let status = f.status;
      if (date < today && status === 'planned') status = 'occurred';
      if (date > today && status === 'occurred') status = 'planned';
      return { ...f, event_date: date, status };
    });
  }

  function allowedStatuses(date: string): ContributionEventStatus[] {
    if (date < today) return ['occurred', 'cancelled'];
    if (date > today) return ['planned', 'cancelled'];
    return ['planned', 'occurred', 'cancelled'];
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(ev: ContributionEvent) {
    setEditingId(ev.id);
    setForm({
      event_date: ev.event_date,
      description: ev.description,
      location: ev.location ?? '',
      status: ev.status,
      contribution_type_id: ev.contribution_type_id ?? '',
      default_amount: ev.default_amount != null ? String(ev.default_amount) : '',
      participant_ids: (ev.contribution_event_participants ?? []).map(p => p.participant_id),
    });
    setError(null);
    setShowForm(true);
  }

  function toggleParticipant(pid: string) {
    setForm(f => ({
      ...f,
      participant_ids: f.participant_ids.includes(pid)
        ? f.participant_ids.filter(x => x !== pid)
        : [...f.participant_ids, pid],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      event_date: form.event_date,
      description: form.description,
      location: form.location || null,
      status: form.status,
      contribution_type_id: form.contribution_type_id || null,
      default_amount: form.default_amount ? Number(form.default_amount) : null,
      participant_ids: form.participant_ids,
    };

    const res = editingId
      ? await apiFetch(`/api/projects/${id}/contribution-events/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await apiFetch(`/api/projects/${id}/contribution-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save event.');
      setSaving(false);
      return;
    }

    setShowForm(false);
    setEditingId(null);
    await load();
    setSaving(false);
  }

  const selectedType = types.find(t => t.id === form.contribution_type_id);

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Contribution Events"
        description="Plan and track group sessions — shooting days, workshops, sprints — and auto-record contributions when they occur."
        action={
          <button onClick={openNew} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            + New Event
          </button>
        }
      />

      {showForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Event' : 'New Event'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Event Date *</label>
                <input
                  required type="date" value={form.event_date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                <select
                  required value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as ContributionEventStatus }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {allowedStatuses(form.event_date).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                {form.event_date < today && (
                  <p className="text-xs text-amber-600 mt-1">Past date — status must be Occurred or Cancelled.</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <input
                  required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Shooting Day — School Location"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Location (optional)</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Studio 4, Tel Aviv"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Default Contribution Type</label>
                <select
                  value={form.contribution_type_id}
                  onChange={e => setForm(f => ({ ...f, contribution_type_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">— none —</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Default Amount{selectedType?.unit ? ` (${selectedType.unit})` : ''}
                </label>
                <input
                  type="number" min={0} step="any"
                  value={form.default_amount}
                  onChange={e => setForm(f => ({ ...f, default_amount: e.target.value }))}
                  placeholder={selectedType?.unit ?? 'quantity'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Intended Participants</label>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => {
                  const selected = form.participant_ids.includes(p.id);
                  return (
                    <button
                      key={p.id} type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.status === 'occurred' && form.contribution_type_id && form.default_amount && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                On save, a <strong>{selectedType?.name}</strong> contribution of <strong>{form.default_amount} {selectedType?.unit ?? ''}</strong> will be recorded for each of the {form.participant_ids.length || 'selected'} participants.
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : editingId ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No events yet.</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const participantList = (ev.contribution_event_participants ?? []).map(p => p.participants?.name).filter(Boolean);
            const canTransitionToOccurred = ev.status === 'planned' && ev.event_date <= today;

            return (
              <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ev.status]}`}>
                        {STATUS_LABELS[ev.status]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{ev.description}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>📅 {ev.event_date}</span>
                      {ev.location && <span>📍 {ev.location}</span>}
                      {ev.contribution_types && (
                        <span>
                          🔧 {ev.contribution_types.name}
                          {ev.default_amount != null && ` × ${ev.default_amount} ${ev.contribution_types.unit ?? ''}`}
                        </span>
                      )}
                    </div>
                    {participantList.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {participantList.map((name, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canTransitionToOccurred && (
                      <MarkOccurredButton event={ev} projectId={id} onDone={load} />
                    )}
                    <button
                      onClick={() => openEdit(ev)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarkOccurredButton({
  event,
  projectId,
  onDone,
}: {
  event: ContributionEvent;
  projectId: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function markOccurred() {
    setSaving(true);
    await apiFetch(`/api/projects/${projectId}/contribution-events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'occurred' }),
    });
    await onDone();
    setSaving(false);
  }

  return (
    <button
      onClick={markOccurred}
      disabled={saving}
      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
    >
      {saving ? '…' : 'Mark as Occurred'}
    </button>
  );
}
