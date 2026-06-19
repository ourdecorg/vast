export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db.from('budgets').select('*').eq('project_id', id).single();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const body = await req.json();
  const { total_amount, currency, allocated_amount, spent_amount, notes } = body;

  const db = createAdminClient();

  // Check if budget exists to decide created_by vs updated_by
  const { data: existing } = await db.from('budgets').select('id, created_by').eq('project_id', projectId).single();

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
        created_by: existing?.created_by ?? user.email,
        updated_by: user.email,
      },
      { onConflict: 'project_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendLedgerEvent(projectId, 'budget_set', { total_amount, currency, notes }, user.email);

  return NextResponse.json(data);
}
