export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { calculateDistribution, calculateImmediateCompensation } from '@/lib/calculations';
import type { CompensationRule } from '@/types/domain';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = await req.json();
  const { revenue_amount } = body;

  const db = createAdminClient();

  const { data: rules, error } = await db
    .from('compensation_rules')
    .select('*, participants ( id, name )')
    .eq('project_id', projectId)
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: project } = await db
    .from('projects')
    .select('currency')
    .eq('id', projectId)
    .single();

  const currency = project?.currency ?? 'USD';
  const typedRules = (rules ?? []) as CompensationRule[];

  const immediate = calculateImmediateCompensation(typedRules);

  const distribution =
    revenue_amount != null
      ? calculateDistribution(Number(revenue_amount), typedRules, currency)
      : null;

  return NextResponse.json({ immediate, distribution });
}
