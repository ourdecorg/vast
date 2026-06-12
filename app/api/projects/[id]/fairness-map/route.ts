export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import type { FairnessMapEntry, CompensationRuleType, RightType } from '@/types/domain';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const db = createAdminClient();

  // Load all data in parallel
  const [participantsRes, contributionsRes, rulesRes, rightsRes, paymentsRes] = await Promise.all([
    db.from('participants').select(`
      *,
      participant_archetypes ( archetypes ( name ) )
    `).eq('project_id', projectId),

    db.from('contributions').select(`
      *,
      contribution_types ( id, name, category, unit )
    `).eq('project_id', projectId),

    db.from('compensation_rules').select('*').eq('project_id', projectId).eq('is_active', true),

    db.from('rights_allocations').select('*').eq('project_id', projectId),

    db.from('payments').select('*').eq('project_id', projectId),
  ]);

  const participants = participantsRes.data ?? [];
  const contributions = contributionsRes.data ?? [];
  const rules = rulesRes.data ?? [];
  const rights = rightsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const immediateTypes = new Set([
    'fixed_payment', 'hourly_payment', 'daily_payment', 'reimbursement',
  ]);

  const map: FairnessMapEntry[] = participants.map((p) => {
    const archetypeNames = (p.participant_archetypes ?? []).map(
      (pa: { archetypes: { name: string } | null }) => pa.archetypes?.name ?? '',
    ).filter(Boolean);

    const myContribs = contributions
      .filter((c) => c.participant_id === p.id)
      .map((c) => ({
        type_name: c.contribution_types?.name ?? '',
        category: c.contribution_types?.category ?? '',
        amount: Number(c.amount),
        unit: c.unit ?? c.contribution_types?.unit,
        description: c.description ?? '',
      }));

    const myRules = rules
      .filter((r) => r.participant_id === p.id)
      .filter((r) => immediateTypes.has(r.rule_type))
      .map((r) => ({
        label: r.label,
        rule_type: r.rule_type as CompensationRuleType,
        amount: r.amount ? Number(r.amount) : undefined,
        percentage: r.percentage ? Number(r.percentage) : undefined,
        currency: r.currency,
      }));

    const myRights = rights
      .filter((r) => r.participant_id === p.id)
      .map((r) => ({
        right_type: r.right_type as RightType,
        percentage: r.percentage ? Number(r.percentage) : undefined,
        priority: r.priority,
        description: r.description,
      }));

    const totalImmediate = payments
      .filter((pay) => pay.participant_id === p.id)
      .reduce((s, pay) => s + Number(pay.amount), 0);

    return {
      participant_id: p.id,
      participant_name: p.name,
      archetypes: archetypeNames,
      contributions: myContribs,
      immediate_rules: myRules,
      future_rights: myRights,
      total_immediate_compensation: totalImmediate,
    };
  });

  return NextResponse.json(map);
}
