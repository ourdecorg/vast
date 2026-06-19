export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('participants')
    .select(`
      *,
      participant_archetypes (
        id, notes,
        archetypes ( id, name, description, typical_contributions, typical_compensation_types )
      )
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten archetype join
  const shaped = (data ?? []).map((p) => ({
    ...p,
    archetypes: (p.participant_archetypes ?? []).map(
      (pa: { archetypes: unknown; notes: string }) => ({
        ...(pa.archetypes as object),
        notes: pa.notes,
      }),
    ),
    participant_archetypes: undefined,
  }));

  return NextResponse.json(shaped);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { name, email, phone, bio, archetype_ids } = body;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const db = createAdminClient();

  const { data: participant, error } = await db
    .from('participants')
    .insert({ project_id: projectId, name, email, phone, bio })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Link archetypes if provided
  if (archetype_ids?.length) {
    const links = archetype_ids.map((aid: string) => ({
      participant_id: participant.id,
      archetype_id: aid,
    }));
    await db.from('participant_archetypes').insert(links);
  }

  await appendLedgerEvent(projectId, 'participant_added', {
    participant_id: participant.id,
    name: participant.name,
    archetype_ids: archetype_ids ?? [],
  });

  return NextResponse.json(participant, { status: 201 });
}
