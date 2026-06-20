'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { Contribution, Participant, ContributionType, ContributionReaction } from '@/types/domain';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '🙏', '💪', '🔥'];

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

  // Reactions state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ContributionReaction[]>>({});
  const [reactionsLoading, setReactionsLoading] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  async function load() {
    const [contribRes, partRes, typeRes] = await Promise.all([
      apiFetch(`/api/projects/${id}/contributions`),
      apiFetch(`/api/projects/${id}/participants`),
      apiFetch('/api/contribution-types'),
    ]);
    const [contribs, parts, typeList] = await Promise.all([contribRes.json(), partRes.json(), typeRes.json()]);
    setContributions(Array.isArray(contribs) ? contribs : []);
    setParticipants(Array.isArray(parts) ? parts : []);
    setTypes(Array.isArray(typeList) ? typeList : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  // Auto-open reaction panel when URL contains #c-{contributionId}
  useEffect(() => {
    if (!contributions.length) return;
    const match = window.location.hash.match(/^#c-(.+)$/);
    if (!match) return;
    const targetId = match[1];
    if (!contributions.find(c => c.id === targetId)) return;
    setExpandedId(targetId);
    loadReactions(targetId);
    setTimeout(() => {
      document.getElementById(`c-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(`comment-input-${targetId}`)?.focus();
    }, 150);
  }, [contributions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await apiFetch(`/api/projects/${id}/contributions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setForm({ participant_id: '', contribution_type_id: '', amount: '', unit: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function loadReactions(contributionId: string) {
    setReactionsLoading(r => ({ ...r, [contributionId]: true }));
    const res = await apiFetch(`/api/projects/${id}/contributions/${contributionId}/reactions`);
    const data = await res.json();
    setReactions(r => ({ ...r, [contributionId]: Array.isArray(data) ? data : [] }));
    setReactionsLoading(r => ({ ...r, [contributionId]: false }));
  }

  async function toggleReactions(contributionId: string) {
    if (expandedId === contributionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(contributionId);
    setCommentText('');
    if (!reactions[contributionId]) {
      await loadReactions(contributionId);
    }
  }

  async function handleEmojiReact(contributionId: string, emoji: string) {
    await apiFetch(`/api/projects/${id}/contributions/${contributionId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: 'emoji', emoji }),
    });
    await loadReactions(contributionId);
  }

  async function handleComment(contributionId: string) {
    if (!commentText.trim() || commentSaving) return;
    setCommentSaving(true);
    await apiFetch(`/api/projects/${id}/contributions/${contributionId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: 'reply', reply_text: commentText }),
    });
    setCommentText('');
    await loadReactions(contributionId);
    setCommentSaving(false);
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
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
            <div className="flex items-center justify-end gap-3 sm:items-end">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Participant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contribution</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">💬</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <>
                    <tr key={c.id} id={`c-${c.id}`} className={`border-t border-gray-50 hover:bg-gray-50/50 ${expandedId === c.id ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.participants?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{c.contribution_types?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge label={c.contribution_types?.category ?? ''} colorKey={c.contribution_types?.category} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {Number(c.amount).toLocaleString()} {c.unit ?? ''}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.description}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{c.date}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleReactions(c.id)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            expandedId === c.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          {reactions[c.id]?.length
                            ? `💬 ${reactions[c.id].length}`
                            : '💬'}
                        </button>
                      </td>
                    </tr>

                    {expandedId === c.id && (
                      <tr key={`${c.id}-reactions`} className="border-t border-indigo-100">
                        <td colSpan={7} className="px-5 py-4 bg-indigo-50/40">
                          {reactionsLoading[c.id] ? (
                            <p className="text-xs text-gray-400">Loading…</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Existing reactions */}
                              {(reactions[c.id]?.length ?? 0) > 0 && (
                                <div className="space-y-2">
                                  {/* Grouped emoji reactions */}
                                  {(() => {
                                    const emojiReactions = reactions[c.id].filter(r => r.reaction_type === 'emoji');
                                    const grouped = emojiReactions.reduce<Record<string, number>>((acc, r) => {
                                      if (r.emoji) acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                                      return acc;
                                    }, {});
                                    return Object.keys(grouped).length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(grouped).map(([emoji, count]) => (
                                          <span key={emoji} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-sm shadow-sm">
                                            {emoji} <span className="text-xs text-gray-500 font-medium">{count}</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Text comments */}
                                  {reactions[c.id].filter(r => r.reaction_type === 'reply').map(r => (
                                    <div key={r.id} className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                                        {(r.web_user_email ?? r.telegram_username ?? '?')[0].toUpperCase()}
                                      </div>
                                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                                        <p className="text-[10px] text-gray-400 mb-0.5">
                                          {r.web_user_email ?? r.telegram_username ?? 'Telegram user'}
                                        </p>
                                        <p className="text-sm text-gray-800">{r.reply_text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add reaction */}
                              <div className="flex flex-col gap-2 pt-1">
                                <div className="flex items-center gap-1">
                                  {QUICK_EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleEmojiReact(c.id, emoji)}
                                      className="text-xl hover:scale-125 transition-transform leading-none"
                                      title={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    id={`comment-input-${c.id}`}
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleComment(c.id); }}
                                    placeholder="Add a comment…"
                                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                  />
                                  <button
                                    onClick={() => handleComment(c.id)}
                                    disabled={commentSaving || !commentText.trim()}
                                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {commentSaving ? '…' : 'Send'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
