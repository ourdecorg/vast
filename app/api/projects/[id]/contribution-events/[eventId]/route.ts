export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { recordContributions } from '../route';

const EVENT_SELECT = `
  *,
  contribution_types ( id, name, unit ),
  contribution_event_participants (
    participant_id,
    participants ( id, name )
  )
`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventId } = await params;
  const db = createAdminClient();

  const { data, error } = await db.from('contribution_events').select(EVENT_SELECT).eq('id', eventId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId, eventId } = await params;
  const body = await req.json();
  const { event_date, description, location, status, contribution_type_id, default_amount, participant_ids } = body;

  const db = createAdminClient();

  // Fetch current event to validate transitions
  const { data: current, error: fetchErr } = await db
    .from('contribution_events')
    .select('*, contribution_event_participants(participant_id)')
    .eq('id', eventId)
    .single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  const resolvedDate = event_date ?? current.event_date;
  const resolvedStatus = status ?? current.status;
  const today = new Date().toISOString().split('T')[0];

  if (resolvedDate < today && resolvedStatus === 'planned') {
    return NextResponse.json({ error: 'Past events cannot have status "planned"' }, { status: 422 });
  }
  if (resolvedDate > today && resolvedStatus === 'occurred') {
    return NextResponse.json({ error: 'Future events cannot have status "occurred"' }, { status: 422 });
  }

  // Build update payload — only include defined fields
  const patch: Record<string, unknown> = {};
  if (event_date !== undefined)          patch.event_date = event_date;
  if (description !== undefined)         patch.description = description;
  if (location !== undefined)            patch.location = location;
  if (status !== undefined)              patch.status = status;
  if (contribution_type_id !== undefined) patch.contribution_type_id = contribution_type_id ?? null;
  if (default_amount !== undefined)      patch.default_amount = default_amount ?? null;

  const { error: updateErr } = await db.from('contribution_events').update(patch).eq('id', eventId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Replace participant list if provided
  if (Array.isArray(participant_ids)) {
    await db.from('contribution_event_participants').delete().eq('contribution_event_id', eventId);
    if (participant_ids.length > 0) {
      await db.from('contribution_event_participants').insert(
        participant_ids.map((pid: string) => ({ contribution_event_id: eventId, participant_id: pid })),
      );
    }
  }

  // Transition planned → occurred: auto-record contributions for participants
  const wasPlanned = current.status === 'planned';
  const nowOccurred = resolvedStatus === 'occurred';
  const resolvedTypeId = contribution_type_id !== undefined ? contribution_type_id : current.contribution_type_id;
  const resolvedAmount = default_amount !== undefined ? default_amount : current.default_amount;

  if (wasPlanned && nowOccurred && resolvedTypeId && resolvedAmount != null) {
    const ids: string[] = Array.isArray(participant_ids)
      ? participant_ids
      : (current.contribution_event_participants ?? []).map((p: { participant_id: string }) => p.participant_id);

    await recordContributions(
      db,
      projectId,
      eventId,
      ids,
      resolvedTypeId,
      resolvedAmount,
      resolvedDate,
      description ?? current.description,
      user.email,
    );
  }

  const { data: full } = await db.from('contribution_events').select(EVENT_SELECT).eq('id', eventId).single();
  return NextResponse.json(full);
}
