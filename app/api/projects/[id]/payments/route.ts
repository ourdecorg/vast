export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('payments')
    .select('*, participants ( id, name ), compensation_rules ( id, label, rule_type )')
    .eq('project_id', id)
    .order('payment_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { participant_id, compensation_rule_id, amount, currency, payment_date, description } = body;

  if (!participant_id || !amount) {
    return NextResponse.json({ error: 'participant_id and amount are required' }, { status: 400 });
  }

  const db = createAdminClient();

  const ledgerEvent = await appendLedgerEvent(projectId, 'payment_made', {
    participant_id,
    amount,
    currency,
    description,
  });

  const { data, error } = await db
    .from('payments')
    .insert({
      project_id: projectId,
      participant_id,
      compensation_rule_id: compensation_rule_id ?? null,
      amount,
      currency: currency ?? 'USD',
      payment_date: payment_date ?? new Date().toISOString().split('T')[0],
      description,
      ledger_event_id: ledgerEvent.id,
    })
    .select('*, participants ( id, name )')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
