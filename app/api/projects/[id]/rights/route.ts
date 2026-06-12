export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('rights_allocations')
    .select('*, participants ( id, name )')
    .eq('project_id', id)
    .order('priority', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { participant_id, right_type, percentage, priority, description } = body;

  if (!participant_id || !right_type) {
    return NextResponse.json({ error: 'participant_id and right_type are required' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from('rights_allocations')
    .insert({ project_id: projectId, participant_id, right_type, percentage, priority: priority ?? 0, description })
    .select('*, participants ( id, name )')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendLedgerEvent(projectId, 'rights_allocated', {
    rights_id: data.id,
    participant_id,
    right_type,
    percentage,
  });

  return NextResponse.json(data, { status: 201 });
}
