export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifyLedger } from '@/lib/ledger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const url = new URL(req.url);
  const verify = url.searchParams.get('verify') === 'true';
  const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const { data, error, count } = await db
    .from('ledger_events')
    .select('*', { count: 'exact' })
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: Record<string, unknown> = { events: data ?? [], total: count ?? 0 };

  if (verify) {
    result.integrity = await verifyLedger(id);
  }

  return NextResponse.json(result);
}
