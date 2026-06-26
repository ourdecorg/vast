export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';
import { getUserFromRequest, getSystemRole, getUserProjectIds } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();
  let query = db.from('projects').select('*').order('created_at', { ascending: false });

  // Non-OWNER users only see projects they're members of
  const projectIds = await getUserProjectIds(user.id);
  if (projectIds !== null) {
    if (projectIds.length === 0) return NextResponse.json([]);
    query = query.in('id', projectIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only OWNERs can create new projects
  const role = await getSystemRole(user.id);
  if (role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden: only OWNER can create projects' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, type, currency } = body;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const db = createAdminClient();
  const { data: project, error } = await db
    .from('projects')
    .insert({ name, description, type: type ?? 'film', currency: currency ?? 'USD', created_by: user.email })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendLedgerEvent(project.id, 'project_created', { name: project.name, type: project.type }, user.email);

  return NextResponse.json(project, { status: 201 });
}
