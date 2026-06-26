export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

const EVENT_SELECT = `
  *,
  contribution_types ( id, name, unit ),
  contribution_event_participants (
    participant_id,
    participants ( id, name )
  )
`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('contribution_events')
    .select(EVENT_SELECT)
    .eq('project_id', id)
    .order('event_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const body = await req.json();
  const { event_date, description, location, status, contribution_type_id, default_amount, participant_ids } = body;

  if (!event_date || !description || !status) {
    return NextResponse.json({ error: 'event_date, description, and status are required' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  if (event_date < today && status !== 'occurred') {
    return NextResponse.json({ error: 'Past events must have status "occurred"' }, { status: 422 });
  }
  if (event_date > today && status === 'occurred') {
    return NextResponse.json({ error: 'Future events cannot have status "occurred"' }, { status: 422 });
  }

  const db = createAdminClient();

  const { data: event, error } = await db
    .from('contribution_events')
    .insert({
      project_id: projectId,
      event_date,
      description,
      location: location ?? null,
      status,
      contribution_type_id: contribution_type_id ?? null,
      default_amount: default_amount ?? null,
      created_by: user.email,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(participant_ids) && participant_ids.length > 0) {
    await db.from('contribution_event_participants').insert(
      participant_ids.map((pid: string) => ({ contribution_event_id: event.id, participant_id: pid })),
    );
  }

  // If created as occurred, auto-record contributions for all participants
  if (status === 'occurred' && contribution_type_id && default_amount != null && Array.isArray(participant_ids)) {
    await recordContributions(db, projectId, event.id, participant_ids, contribution_type_id, default_amount, event_date, description, user.email);
  }

  const { data: full } = await db.from('contribution_events').select(EVENT_SELECT).eq('id', event.id).single();
  return NextResponse.json(full, { status: 201 });
}

export async function recordContributions(
  db: ReturnType<typeof import('@/lib/supabase').createAdminClient>,
  projectId: string,
  _eventId: string,
  participantIds: string[],
  contributionTypeId: string,
  amount: number,
  date: string,
  description: string,
  createdBy: string,
) {
  if (!participantIds.length) return;
  await db.from('contributions').insert(
    participantIds.map(pid => ({
      project_id: projectId,
      participant_id: pid,
      contribution_type_id: contributionTypeId,
      amount,
      description,
      date,
      created_by: createdBy,
    })),
  );
}
