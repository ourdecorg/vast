export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('budgets')
    .select('*')
    .eq('project_id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { total_amount, currency, allocated_amount, spent_amount, notes } = body;

  const db = createAdminClient();

  const { data, error } = await db
    .from('budgets')
    .upsert(
      {
        project_id: projectId,
        total_amount: total_amount ?? 0,
        currency: currency ?? 'USD',
        allocated_amount: allocated_amount ?? 0,
        spent_amount: spent_amount ?? 0,
        notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendLedgerEvent(projectId, 'budget_set', {
    total_amount,
    currency,
    notes,
  });

  return NextResponse.json(data);
}
