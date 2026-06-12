'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import type { Project, LedgerEvent } from '@/types/domain';

const EVENT_LABELS: Record<string, string> = {
  project_created:         'Project created',
  participant_added:       'Participant added',
  contribution_recorded:   'Contribution recorded',
  compensation_rule_defined:'Compensation rule defined',
  rights_allocated:        'Rights allocated',
  payment_made:            'Payment made',
  revenue_recorded:        'Revenue recorded',
  budget_set:              'Budget set',
};

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState({ participants: 0, contributions: 0, ledgerEvents: 0, paymentsTotal: 0 });
  const [recent, setRecent] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;
  if (!project) return <div className="text-red-500">Project not found.</div>;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      {/* Project header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-medium">{project.type}</span>
          <Badge label={project.status} colorKey={project.status} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && (
          <p className="mt-2 text-gray-500 text-sm max-w-2xl">{project.description}</p>
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
          { href: `/projects/${id}/budget`,        label: 'Budget Overview',     icon: '💰' },
          { href: `/projects/${id}/participants`,   label: 'Participants',         icon: '👥' },
          { href: `/projects/${id}/compensation`,   label: 'Compensation Rules',   icon: '📋' },
          { href: `/projects/${id}/fairness`,       label: 'Fairness Map',         icon: '⚖️' },
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
