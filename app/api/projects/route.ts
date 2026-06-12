export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, type, currency } = body;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const db = createAdminClient();
  const { data: project, error } = await db
    .from('projects')
    .insert({ name, description, type: type ?? 'film', currency: currency ?? 'USD' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Record creation in the ledger
  await appendLedgerEvent(project.id, 'project_created', {
    name: project.name,
    type: project.type,
  });

  return NextResponse.json(project, { status: 201 });
}
