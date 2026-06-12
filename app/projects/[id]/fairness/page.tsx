'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { FairnessMapEntry } from '@/types/domain';

const RIGHT_TYPE_LABELS: Record<string, string> = {
  revenue_share:    'Revenue Share',
  profit_share:     'Profit Share',
  ownership:        'Ownership',
  credit:           'Screen Credit',
  decision_rights:  'Decision Rights',
  symbolic_ownership: 'Symbolic Ownership',
};

const CATEGORY_EMOJI: Record<string, string> = {
  time:             '⏱',
  money:            '💵',
  risk:             '⚠️',
  talent:           '🎭',
  creativity:       '✍️',
  reputation:       '⭐',
  network:          '🌐',
  logistics:        '📦',
  leadership:       '🎯',
  idea_ownership:   '💡',
  distribution:     '📡',
  community_trust:  '🤝',
  emotional_labor:  '❤️',
  other:            '•',
};

export default function FairnessPage() {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<FairnessMapEntry[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [fmRes, projRes] = await Promise.all([
        fetch(`/api/projects/${id}/fairness-map`),
        fetch(`/api/projects/${id}`),
      ]);
      const [fm, proj] = await Promise.all([fmRes.json(), projRes.json()]);
      setEntries(Array.isArray(fm) ? fm : []);
      setCurrency(proj?.currency ?? 'USD');
      setLoading(false);
    }
    load();
  }, [id]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Fairness Map"
        description="A transparent view of who gives what and who receives what in this project. No black boxes."
      />

      {/* Philosophy note */}
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
        <strong>VAST principle:</strong> Fairness is not just about money. This map shows monetary compensation, future rights, and non-monetary recognition — so every form of value is visible.
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No participants yet.</div>
      ) : (
        <div className="space-y-5">
          {entries.map(entry => (
            <div key={entry.participant_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{entry.participant_name}</h2>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {entry.archetypes.map(a => (
                      <Badge
                        key={a}
                        label={a}
                        colorKey={a.toLowerCase().split('/')[0].trim().replace(/ /g, '_')}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Paid to date</p>
                  <p className="text-xl font-bold text-indigo-700">{fmt(entry.total_immediate_compensation)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Contributions column */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What they give</h3>
                  {entry.contributions.length === 0 ? (
                    <p className="text-xs text-gray-400">No contributions recorded.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entry.contributions.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-base shrink-0">{CATEGORY_EMOJI[c.category] ?? '•'}</span>
                          <div>
                            <p className="text-gray-800 font-medium">{c.type_name}</p>
                            <p className="text-xs text-gray-500">
                              {Number(c.amount).toLocaleString()} {c.unit} — {c.description}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Immediate compensation column */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Immediate compensation</h3>
                  {entry.immediate_rules.length === 0 ? (
                    <p className="text-xs text-gray-400">No immediate compensation rules.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entry.immediate_rules.map((r, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge label={r.rule_type.replace(/_/g, ' ')} colorKey={r.rule_type} />
                            <span className="text-gray-700">{r.label}</span>
                          </div>
                          {r.amount != null && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {fmt(r.amount)} {r.currency ?? currency}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Future rights column */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Future rights &amp; claims</h3>
                  {entry.future_rights.length === 0 ? (
                    <p className="text-xs text-gray-400">No future rights allocated.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entry.future_rights.map((r, i) => (
                        <li key={i} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge label={RIGHT_TYPE_LABELS[r.right_type] ?? r.right_type} colorKey={r.right_type} />
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {r.percentage != null ? `${(r.percentage * 100).toFixed(1)}%` : ''}
                            {r.description ? ` — ${r.description}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
