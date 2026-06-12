export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('contributions')
    .select(`
      *,
      participants ( id, name ),
      contribution_types ( id, name, category, unit, is_monetary )
    `)
    .eq('project_id', id)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { participant_id, contribution_type_id, amount, unit, description, date } = body;

  if (!participant_id || !contribution_type_id || amount == null) {
    return NextResponse.json(
      { error: 'participant_id, contribution_type_id, and amount are required' },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  // Write ledger entry first so we have its ID
  const ledgerEvent = await appendLedgerEvent(projectId, 'contribution_recorded', {
    participant_id,
    contribution_type_id,
    amount,
    unit,
    description,
    date,
  });

  const { data, error } = await db
    .from('contributions')
    .insert({
      project_id: projectId,
      participant_id,
      contribution_type_id,
      amount,
      unit,
      description,
      date: date ?? new Date().toISOString().split('T')[0],
      ledger_event_id: ledgerEvent.id,
    })
    .select(`
      *,
      participants ( id, name ),
      contribution_types ( id, name, category, unit, is_monetary )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
