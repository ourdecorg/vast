export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id: projectId, participantId } = await params;
  const { name, email, phone, bio, archetype_ids } = await req.json();

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const db = createAdminClient();

  const { data, error } = await db
    .from('participants')
    .update({ name, email: email || null, phone: phone || null, bio: bio || null })
    .eq('id', participantId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (archetype_ids !== undefined) {
    await db.from('participant_archetypes').delete().eq('participant_id', participantId);
    if (archetype_ids.length) {
      await db.from('participant_archetypes').insert(
        archetype_ids.map((aid: string) => ({ participant_id: participantId, archetype_id: aid })),
      );
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id: projectId, participantId } = await params;
  const db = createAdminClient();

  const { error } = await db
    .from('participants')
    .delete()
    .eq('id', participantId)
    .eq('project_id', projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
