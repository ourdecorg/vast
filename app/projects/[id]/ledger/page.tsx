'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import type { LedgerEvent } from '@/types/domain';

const EVENT_COLORS: Record<string, string> = {
  project_created:          'bg-indigo-500',
  participant_added:        'bg-blue-500',
  contribution_recorded:    'bg-green-500',
  compensation_rule_defined:'bg-purple-500',
  rights_allocated:         'bg-violet-500',
  payment_made:             'bg-amber-500',
  revenue_recorded:         'bg-teal-500',
  budget_set:               'bg-rose-500',
};

const EVENT_LABELS: Record<string, string> = {
  project_created:          'Project Created',
  participant_added:        'Participant Added',
  contribution_recorded:    'Contribution Recorded',
  compensation_rule_defined:'Compensation Rule Defined',
  rights_allocated:         'Rights Allocated',
  payment_made:             'Payment Made',
  revenue_recorded:         'Revenue Recorded',
  budget_set:               'Budget Set',
};

export default function LedgerPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [integrity, setIntegrity] = useState<{ valid: boolean; eventCount: number; brokenAt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${id}/ledger?limit=100`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  async function verify() {
    setVerifying(true);
    const res = await fetch(`/api/projects/${id}/ledger?verify=true&limit=1`);
    const data = await res.json();
    setIntegrity(data.integrity);
    setVerifying(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Contribution Ledger"
        description={`${total} events — append-only, SHA-256 hash-chained. Every event links to the previous one.`}
        action={
          <button
            onClick={verify} disabled={verifying}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:border-indigo-400 text-gray-700 hover:text-indigo-700 transition-colors disabled:opacity-50"
          >
            {verifying ? 'Verifying…' : '🔒 Verify Integrity'}
          </button>
        }
      />

      {/* Integrity result */}
      {integrity && (
        <div className={`mb-6 rounded-xl px-5 py-4 border text-sm font-medium ${
          integrity.valid
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {integrity.valid ? (
            <>✓ Ledger integrity verified — all {integrity.eventCount} events have valid hash chains.</>
          ) : (
            <>✗ Ledger integrity BROKEN at event {integrity.brokenAt}. This indicates tampering.</>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(EVENT_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`w-2 h-2 rounded-full ${EVENT_COLORS[k] ?? 'bg-gray-400'}`} />
            {v}
          </div>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No ledger events yet.</div>
      ) : (
        <div className="space-y-2">
          {events.map((ev, idx) => (
            <div key={ev.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${EVENT_COLORS[ev.event_type] ?? 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium text-sm text-gray-900">
                        {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">#{total - idx}</span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Payload preview */}
                  <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 font-mono overflow-x-auto">
                    {JSON.stringify(ev.payload, null, 0)}
                  </div>

                  {/* Hash chain */}
                  <div className="mt-2 flex gap-4 text-xs font-mono">
                    <div>
                      <span className="text-gray-400">prev: </span>
                      <span className="text-gray-600">{ev.previous_hash === 'GENESIS' ? 'GENESIS' : ev.previous_hash.slice(0, 16) + '…'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">hash: </span>
                      <span className="text-indigo-600">{ev.hash.slice(0, 16)}…</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-800 mb-2">How the ledger works</h3>
        <p>Each event is hashed using SHA-256 over its <code className="text-xs bg-white px-1 rounded border">event_type + payload + created_at + previous_hash</code>. The first event uses <code className="text-xs bg-white px-1 rounded border">GENESIS</code> as the previous hash. This creates a tamper-evident chain: modifying any event invalidates all subsequent hashes.</p>
      </div>
    </div>
  );
}
