export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('compensation_rules')
    .select('*, participants ( id, name )')
    .eq('project_id', id)
    .order('priority', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const {
    participant_id, rule_type, label, amount, percentage,
    currency, priority, conditions, description,
  } = body;

  if (!participant_id || !rule_type || !label) {
    return NextResponse.json(
      { error: 'participant_id, rule_type, and label are required' },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from('compensation_rules')
    .insert({
      project_id: projectId,
      participant_id,
      rule_type,
      label,
      amount: amount ?? null,
      percentage: percentage ?? null,
      currency: currency ?? 'USD',
      priority: priority ?? 0,
      conditions: conditions ?? {},
      description,
      is_active: true,
    })
    .select('*, participants ( id, name )')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendLedgerEvent(projectId, 'compensation_rule_defined', {
    rule_id: data.id,
    participant_id,
    rule_type,
    label,
    amount,
    percentage,
  });

  return NextResponse.json(data, { status: 201 });
}
