'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SectionHeading from '@/components/SectionHeading';
import Badge from '@/components/Badge';
import type { CompensationRule, Participant } from '@/types/domain';

const RULE_TYPES = [
  { value: 'fixed_payment',        label: 'Fixed Payment',          needsAmount: true,  needsPct: false },
  { value: 'hourly_payment',       label: 'Hourly Rate',            needsAmount: true,  needsPct: false },
  { value: 'daily_payment',        label: 'Daily Rate',             needsAmount: true,  needsPct: false },
  { value: 'reimbursement',        label: 'Reimbursement',          needsAmount: true,  needsPct: false },
  { value: 'revenue_percentage',   label: 'Revenue %',              needsAmount: false, needsPct: true  },
  { value: 'profit_percentage',    label: 'Profit %',               needsAmount: false, needsPct: true  },
  { value: 'investment_repayment', label: 'Investment Repayment',   needsAmount: true,  needsPct: false },
  { value: 'success_bonus',        label: 'Success Bonus',          needsAmount: true,  needsPct: false },
  { value: 'symbolic_credit',      label: 'Symbolic Credit (non-monetary)', needsAmount: false, needsPct: false },
];

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

export default function CompensationPage() {
  const { id } = useParams<{ id: string }>();
  const [rules, setRules] = useState<CompensationRule[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    participant_id: '', rule_type: 'fixed_payment', label: '', amount: '', percentage: '', priority: '0', description: '', min_revenue: '',
  });
  const [saving, setSaving] = useState(false);

  // Revenue simulation
  const [simRevenue, setSimRevenue] = useState('');
  const [simResult, setSimResult] = useState<{ breakdowns: { participant_name: string; rule_label: string; rule_type: string; amount: number; currency: string; explanation: string }[]; total_distributed: number; remaining_after_distribution: number } | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  async function load() {
    const [ruleRes, partRes, projRes] = await Promise.all([
      fetch(`/api/projects/${id}/compensation-rules`),
      fetch(`/api/projects/${id}/participants`),
      fetch(`/api/projects/${id}`),
    ]);
    const [ruleData, partData, projData] = await Promise.all([ruleRes.json(), partRes.json(), projRes.json()]);
    setRules(Array.isArray(ruleData) ? ruleData : []);
    setParticipants(Array.isArray(partData) ? partData : []);
    setCurrency(projData?.currency ?? 'USD');
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const rt = RULE_TYPES.find(r => r.value === form.rule_type);
    const payload = {
      participant_id: form.participant_id,
      rule_type: form.rule_type,
      label: form.label,
      amount: rt?.needsAmount && form.amount ? Number(form.amount) : null,
      percentage: rt?.needsPct && form.percentage ? Number(form.percentage) / 100 : null,
      priority: Number(form.priority),
      description: form.description,
      conditions: form.min_revenue ? { min_revenue: Number(form.min_revenue) } : {},
    };
    await fetch(`/api/projects/${id}/compensation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    setForm({ participant_id: '', rule_type: 'fixed_payment', label: '', amount: '', percentage: '', priority: '0', description: '', min_revenue: '' });
    await load();
    setSaving(false);
  }

  async function handleSimulate() {
    if (!simRevenue) return;
    setSimLoading(true);
    const res = await fetch(`/api/projects/${id}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revenue_amount: Number(simRevenue) }),
    });
    const data = await res.json();
    setSimResult(data.distribution);
    setSimLoading(false);
  }

  const selectedRuleType = RULE_TYPES.find(r => r.value === form.rule_type);

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  const immediate = rules.filter(r => ['fixed_payment','hourly_payment','daily_payment','reimbursement'].includes(r.rule_type));
  const future = rules.filter(r => ['revenue_percentage','profit_percentage','investment_repayment','success_bonus','symbolic_credit'].includes(r.rule_type));

  return (
    <div>
      <SectionHeading
        title="Compensation Rules"
        description="Define how each participant gets paid — immediately and from future revenue."
        action={
          <button onClick={() => setShowForm(s => !s)} className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            + Add Rule
          </button>
        }
      />

      {showForm && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">New Compensation Rule</h3>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Rule Type *</label>
              <select
                required value={form.rule_type}
                onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {RULE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
              <input
                required value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Director Fee, Revenue Share 15%"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {selectedRuleType?.needsAmount && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount ({currency})</label>
                <input
                  type="number" min={0} step="any" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            {selectedRuleType?.needsPct && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Percentage (%)</label>
                <input
                  type="number" min={0} max={100} step={0.1} value={form.percentage}
                  onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))}
                  placeholder="e.g. 15 for 15%"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            {form.rule_type === 'success_bonus' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min Revenue Trigger ({currency})</label>
                <input
                  type="number" min={0} value={form.min_revenue}
                  onChange={e => setForm(f => ({ ...f, min_revenue: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority (lower = applied first)</label>
              <input
                type="number" value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revenue Simulator */}
      <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Revenue Distribution Simulator</h2>
        <p className="text-xs text-gray-500 mb-4">Enter a hypothetical gross revenue amount to see how it would be distributed across all rules.</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Hypothetical Revenue ({currency})</label>
            <input
              type="number" min={0} value={simRevenue}
              onChange={e => setSimRevenue(e.target.value)}
              placeholder="e.g. 1000000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={handleSimulate} disabled={simLoading || !simRevenue}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {simLoading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>

        {simResult && (
          <div className="mt-5 space-y-2">
            {simResult.breakdowns.map((b, i) => (
              <div key={i} className="bg-white rounded-lg px-4 py-3 flex items-start gap-3 border border-white shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{b.participant_name}</span>
                    <Badge label={b.rule_type} colorKey={b.rule_type} />
                    <span className="text-xs text-gray-500">{b.rule_label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{b.explanation}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${b.amount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                  {fmt(b.amount, b.currency)}
                </span>
              </div>
            ))}
            <div className="bg-indigo-600 text-white rounded-lg px-4 py-3 flex justify-between text-sm font-medium">
              <span>Total Distributed</span>
              <span>{fmt(simResult.total_distributed, currency)}</span>
            </div>
            {simResult.remaining_after_distribution !== 0 && (
              <div className="bg-gray-100 rounded-lg px-4 py-2 flex justify-between text-xs text-gray-600">
                <span>Remaining (undistributed)</span>
                <span>{fmt(simResult.remaining_after_distribution, currency)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules tables */}
      <div className="grid gap-6">
        {[
          { title: 'Immediate Compensation', sub: 'Fixed fees, hourly/daily rates, reimbursements', items: immediate },
          { title: 'Future Compensation & Rights', sub: 'Revenue/profit shares, investment repayment, bonuses', items: future },
        ].map(({ title, sub, items }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
            {items.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No rules defined.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Participant</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Label</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.participants?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.label}</td>
                      <td className="px-4 py-3">
                        <Badge label={r.rule_type.replace(/_/g, ' ')} colorKey={r.rule_type} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {r.amount != null ? fmt(Number(r.amount), r.currency ?? currency) : ''}
                        {r.percentage != null ? `${(Number(r.percentage) * 100).toFixed(1)}%` : ''}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{r.priority ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
