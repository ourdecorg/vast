'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import StatCard from '@/components/StatCard';
import SectionHeading from '@/components/SectionHeading';
import type { Budget } from '@/types/domain';

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ total_amount: 0, allocated_amount: 0, spent_amount: 0, notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [budRes, projRes] = await Promise.all([
        fetch(`/api/projects/${id}/budget`),
        fetch(`/api/projects/${id}`),
      ]);
      const [bud, proj] = await Promise.all([budRes.json(), projRes.json()]);
      setBudget(bud);
      setCurrency(proj?.currency ?? 'USD');
      if (bud) {
        setForm({
          total_amount: Number(bud.total_amount),
          allocated_amount: Number(bud.allocated_amount),
          spent_amount: Number(bud.spent_amount),
          notes: bud.notes ?? '',
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects/${id}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, currency }),
    });
    const updated = await res.json();
    setBudget(updated);
    setEditing(false);
    setSaving(false);
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const total = Number(budget?.total_amount ?? 0);
  const allocated = Number(budget?.allocated_amount ?? 0);
  const spent = Number(budget?.spent_amount ?? 0);
  const unallocated = total - allocated;
  const remaining = allocated - spent;
  const spentPct = total > 0 ? Math.round((spent / total) * 100) : 0;

  if (loading) return <div className="text-gray-400 py-20 text-center">Loading…</div>;

  return (
    <div>
      <SectionHeading
        title="Budget"
        description="Track total budget, allocations, and actual spend."
        action={
          <button
            onClick={() => setEditing(e => !e)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:border-indigo-400 text-gray-700 hover:text-indigo-700 transition-colors"
          >
            {editing ? 'Cancel' : '✏️ Edit Budget'}
          </button>
        }
      />

      {/* Edit form */}
      {editing && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Total Budget</label>
              <input
                type="number" min={0} step={1000}
                value={form.total_amount}
                onChange={e => setForm(f => ({ ...f, total_amount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Allocated Amount</label>
              <input
                type="number" min={0} step={1000}
                value={form.allocated_amount}
                onChange={e => setForm(f => ({ ...f, allocated_amount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Spent to Date</label>
              <input
                type="number" min={0} step={100}
                value={form.spent_amount}
                onChange={e => setForm(f => ({ ...f, spent_amount: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Budget'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      {budget ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Budget" value={fmt(total)} accent />
            <StatCard label="Allocated" value={fmt(allocated)} sub={`${Math.round((allocated/total)*100)||0}% of total`} />
            <StatCard label="Spent" value={fmt(spent)} sub={`${spentPct}% of total`} />
            <StatCard label="Remaining" value={fmt(remaining)} sub="allocated − spent" />
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Spend Progress</h3>
              <span className="text-sm text-gray-500">{spentPct}% spent</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${spentPct > 90 ? 'bg-red-500' : spentPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(spentPct, 100)}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <div><span className="font-medium">{fmt(unallocated)}</span> <span className="text-gray-400">unallocated</span></div>
              <div><span className="font-medium">{fmt(remaining)}</span> <span className="text-gray-400">unspent (of allocated)</span></div>
            </div>
          </div>

          {budget.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <span className="font-semibold">Notes: </span>{budget.notes}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p>No budget set yet.</p>
          <button onClick={() => setEditing(true)} className="mt-3 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">
            Set Budget
          </button>
        </div>
      )}
    </div>
  );
}
