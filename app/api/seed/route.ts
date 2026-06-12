export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';

// POST /api/seed — inserts the demo "The Last Summer" film project.
// Safe to call multiple times — checks for the project by name before inserting.
// Uses DB-generated UUIDs throughout so no hardcoded ID strings are passed
// into UUID columns.
export async function POST() {
  const db = createAdminClient();

  // ── Contribution Types (upsert by name, then fetch IDs) ────────────────────
  const ctDefs = [
    { name: 'Time (Hours)',          category: 'time',           description: 'General time contribution measured in hours',            unit: 'hours',  is_monetary: false },
    { name: 'Time (Days)',           category: 'time',           description: 'General time contribution measured in days',             unit: 'days',   is_monetary: false },
    { name: 'Financial Investment',  category: 'money',          description: 'Direct monetary investment in the project',              unit: 'USD',    is_monetary: true  },
    { name: 'Risk Capital',          category: 'risk',           description: 'Taking on financial or reputational risk',               unit: 'USD',    is_monetary: true  },
    { name: 'Writing / Script',      category: 'creativity',     description: 'Screenwriting, scriptwriting, copywriting',              unit: 'pages',  is_monetary: false },
    { name: 'Original Idea',         category: 'idea_ownership', description: 'The founding concept or intellectual property',          unit: 'units',  is_monetary: false },
    { name: 'Performance / Talent',  category: 'talent',         description: 'Acting, performing, creative execution',                 unit: 'days',   is_monetary: false },
    { name: 'Reputation Stake',      category: 'reputation',     description: 'Lending personal or brand reputation to the project',   unit: 'units',  is_monetary: false },
    { name: 'Network / Connections', category: 'network',        description: 'Introducing key contacts, partners, or distributors',   unit: 'units',  is_monetary: false },
    { name: 'Distribution Access',   category: 'distribution',   description: 'Access to distribution channels, platforms, or markets', unit: 'units', is_monetary: false },
    { name: 'Logistics / Ops',       category: 'logistics',      description: 'Production management, coordination, operations',        unit: 'days',   is_monetary: false },
    { name: 'Artistic Leadership',   category: 'leadership',     description: 'Creative direction, vision setting, project leadership', unit: 'days',   is_monetary: false },
    { name: 'Community Trust',       category: 'community_trust',description: 'Bringing community credibility or audience trust',      unit: 'units',  is_monetary: false },
    { name: 'Emotional Labor',       category: 'emotional_labor',description: 'Supporting team morale, mediation, pastoral care',      unit: 'hours',  is_monetary: false },
  ];
  await db.from('contribution_types').upsert(ctDefs, { onConflict: 'name', ignoreDuplicates: true });
  const { data: ctRows } = await db.from('contribution_types').select('id, name');
  const ct = Object.fromEntries((ctRows ?? []).map(r => [r.name, r.id]));

  // ── Archetypes ──────────────────────────────────────────────────────────────
  const archDefs = [
    { name: 'Screenwriter',             description: 'Creates the original story, script, and creative foundation.',   typical_contributions: ['idea_ownership','creativity','time'],                   typical_compensation_types: ['fixed_payment','profit_percentage','symbolic_credit'], is_built_in: true },
    { name: 'Investor / Entrepreneur',  description: 'Provides financial capital and takes on risk.',                   typical_contributions: ['money','risk'],                                          typical_compensation_types: ['investment_repayment','profit_percentage'],            is_built_in: true },
    { name: 'Distribution Company',     description: 'Provides market access, logistics, and connections.',             typical_contributions: ['distribution','network','logistics','reputation'],        typical_compensation_types: ['revenue_percentage'],                                  is_built_in: true },
    { name: 'Director / Producer',      description: 'Provides artistic vision, leadership, and coordination.',         typical_contributions: ['leadership','creativity','time'],                        typical_compensation_types: ['fixed_payment','profit_percentage'],                   is_built_in: true },
    { name: 'Actor / Performer',        description: 'Provides talent, time, and potentially reputation.',              typical_contributions: ['talent','time','reputation'],                            typical_compensation_types: ['daily_payment','fixed_payment','profit_percentage'],   is_built_in: true },
    { name: 'Crew Member / Extra',      description: 'Provides time and labour.',                                       typical_contributions: ['time','logistics'],                                      typical_compensation_types: ['hourly_payment','daily_payment'],                      is_built_in: true },
    { name: 'Advisor / Mentor',         description: 'Provides knowledge, reputation, and network access.',             typical_contributions: ['reputation','network','leadership'],                     typical_compensation_types: ['symbolic_credit','profit_percentage'],                 is_built_in: true },
    { name: 'Composer / Sound Designer',description: 'Creates original music, sound design, or audio assets.',          typical_contributions: ['creativity','talent','time'],                            typical_compensation_types: ['fixed_payment','revenue_percentage'],                  is_built_in: true },
  ];
  await db.from('archetypes').upsert(archDefs, { onConflict: 'name', ignoreDuplicates: true });
  const { data: archRows } = await db.from('archetypes').select('id, name');
  const arch = Object.fromEntries((archRows ?? []).map(r => [r.name, r.id]));

  // ── Guard: check if demo project already exists ─────────────────────────────
  const { data: existing } = await db
    .from('projects')
    .select('id')
    .eq('name', 'The Last Summer')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'Seed data already present', project_id: existing.id });
  }

  // ── Project ─────────────────────────────────────────────────────────────────
  const { data: project, error: projErr } = await db
    .from('projects')
    .insert({
      name: 'The Last Summer',
      description: 'An intimate drama about three childhood friends who reunite in their hometown after a decade apart, confronting old wounds and unspoken loves.',
      type: 'film',
      status: 'active',
      currency: 'USD',
    })
    .select()
    .single();
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
  const pid = project.id;

  await appendLedgerEvent(pid, 'project_created', { name: 'The Last Summer', type: 'film' });

  // ── Budget ──────────────────────────────────────────────────────────────────
  await db.from('budgets').insert({
    project_id: pid, total_amount: 500000, currency: 'USD',
    allocated_amount: 420000, spent_amount: 185000,
    notes: 'Indie film. Lead investor 300k; remainder from co-producers.',
  });

  // ── Participants ─────────────────────────────────────────────────────────────
  const { data: partRows, error: partErr } = await db
    .from('participants')
    .insert([
      { project_id: pid, name: 'Sofia Morales',     email: 'sofia@vastdemo.io',      bio: 'Award-winning screenwriter. Wrote the original script over three years.' },
      { project_id: pid, name: 'Capital Films Ltd', email: 'finance@capitalfilms.io', bio: 'Independent film investment firm.' },
      { project_id: pid, name: 'StreamVision Inc',  email: 'deals@streamvision.io',  bio: 'Global streaming distributor — rights deals across 40+ countries.' },
      { project_id: pid, name: 'Marcus Chen',       email: 'marcus@vastdemo.io',      bio: 'Director of Photography turned Director.' },
      { project_id: pid, name: 'Emma Laurent',      email: 'emma@vastdemo.io',        bio: 'Lead actress. Two-time BAFTA nominee.' },
      { project_id: pid, name: 'Yuki Tanaka',       email: 'yuki@vastdemo.io',        bio: 'Supporting actor and co-producer.' },
      { project_id: pid, name: 'André Silva',       email: 'andre@vastdemo.io',       bio: 'Composer — classical meets electronic.' },
      { project_id: pid, name: 'Camera Dept (3)',   email: 'crew@vastdemo.io',        bio: 'Three-person camera and lighting crew.' },
    ])
    .select('id, name');
  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });
  const p = Object.fromEntries((partRows ?? []).map(r => [r.name, r.id]));

  // ── Participant ↔ Archetype links ───────────────────────────────────────────
  await db.from('participant_archetypes').insert([
    { participant_id: p['Sofia Morales'],     archetype_id: arch['Screenwriter'] },
    { participant_id: p['Capital Films Ltd'], archetype_id: arch['Investor / Entrepreneur'] },
    { participant_id: p['StreamVision Inc'],  archetype_id: arch['Distribution Company'] },
    { participant_id: p['Marcus Chen'],       archetype_id: arch['Director / Producer'] },
    { participant_id: p['Emma Laurent'],      archetype_id: arch['Actor / Performer'] },
    { participant_id: p['Yuki Tanaka'],       archetype_id: arch['Actor / Performer'] },
    { participant_id: p['Yuki Tanaka'],       archetype_id: arch['Director / Producer'] },
    { participant_id: p['André Silva'],       archetype_id: arch['Composer / Sound Designer'] },
    { participant_id: p['Camera Dept (3)'],   archetype_id: arch['Crew Member / Extra'] },
  ]);

  // ── Contributions ───────────────────────────────────────────────────────────
  await db.from('contributions').insert([
    { project_id: pid, participant_id: p['Sofia Morales'],     contribution_type_id: ct['Original Idea'],         amount: 1,      unit: 'units', description: 'Original concept for The Last Summer',                date: '2023-01-15' },
    { project_id: pid, participant_id: p['Sofia Morales'],     contribution_type_id: ct['Writing / Script'],      amount: 127,    unit: 'pages', description: 'Full screenplay — three drafts',                       date: '2023-09-01' },
    { project_id: pid, participant_id: p['Sofia Morales'],     contribution_type_id: ct['Time (Hours)'],          amount: 800,    unit: 'hours', description: 'Research, writing, production consultations',          date: '2024-06-01' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], contribution_type_id: ct['Financial Investment'],  amount: 300000, unit: 'USD',   description: 'Lead investment — greenlight funding',                 date: '2024-01-10' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], contribution_type_id: ct['Risk Capital'],          amount: 300000, unit: 'USD',   description: 'Full investment at risk pending performance',          date: '2024-01-10' },
    { project_id: pid, participant_id: p['StreamVision Inc'],  contribution_type_id: ct['Distribution Access'],   amount: 1,      unit: 'units', description: 'International streaming rights — 40+ countries',       date: '2024-02-01' },
    { project_id: pid, participant_id: p['StreamVision Inc'],  contribution_type_id: ct['Network / Connections'], amount: 1,      unit: 'units', description: 'Festival pipeline and marketing channels',             date: '2024-02-01' },
    { project_id: pid, participant_id: p['Marcus Chen'],       contribution_type_id: ct['Artistic Leadership'],   amount: 60,     unit: 'days',  description: 'Pre-production creative direction and casting',         date: '2024-03-01' },
    { project_id: pid, participant_id: p['Marcus Chen'],       contribution_type_id: ct['Time (Days)'],           amount: 40,     unit: 'days',  description: 'Principal photography — 40 shooting days',             date: '2024-07-01' },
    { project_id: pid, participant_id: p['Emma Laurent'],      contribution_type_id: ct['Performance / Talent'],  amount: 38,     unit: 'days',  description: 'Lead role — Elena. 38 shooting days.',                 date: '2024-07-01' },
    { project_id: pid, participant_id: p['Emma Laurent'],      contribution_type_id: ct['Reputation Stake'],      amount: 1,      unit: 'units', description: 'BAFTA nominee profile — significant audience draw',    date: '2024-02-15' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       contribution_type_id: ct['Performance / Talent'],  amount: 22,     unit: 'days',  description: 'Supporting role — Marco. 22 shooting days.',           date: '2024-07-01' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       contribution_type_id: ct['Logistics / Ops'],       amount: 30,     unit: 'days',  description: 'Associate producer logistics over 30 pre-prod days',   date: '2024-04-01' },
    { project_id: pid, participant_id: p['André Silva'],       contribution_type_id: ct['Writing / Script'],      amount: 60,     unit: 'pages', description: 'Original score — 60 minutes of composed music',        date: '2024-08-01' },
    { project_id: pid, participant_id: p['André Silva'],       contribution_type_id: ct['Time (Hours)'],          amount: 400,    unit: 'hours', description: 'Composition, recording, mixing, sync sessions',        date: '2024-09-01' },
    { project_id: pid, participant_id: p['Camera Dept (3)'],   contribution_type_id: ct['Time (Days)'],           amount: 120,    unit: 'days',  description: '3 crew members × 40 shooting days',                   date: '2024-07-01' },
  ]);

  // ── Compensation Rules ──────────────────────────────────────────────────────
  await db.from('compensation_rules').insert([
    { project_id: pid, participant_id: p['Sofia Morales'],     rule_type: 'fixed_payment',        label: 'Script Option Fee',       amount: 15000,  percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: 'Upfront script option on greenlight' },
    { project_id: pid, participant_id: p['Sofia Morales'],     rule_type: 'profit_percentage',    label: 'Sofia Profit Share',      amount: null,   percentage: 0.08, currency: 'USD', priority: 10, conditions: {},                       description: '8% of net profit' },
    { project_id: pid, participant_id: p['Sofia Morales'],     rule_type: 'symbolic_credit',      label: 'Written By Credit',       amount: null,   percentage: null, currency: 'USD', priority: 99, conditions: {},                       description: 'Mandatory screen credit' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], rule_type: 'investment_repayment', label: 'Investor Repayment',      amount: 300000, percentage: null, currency: 'USD', priority: 1,  conditions: {},                       description: '300k repayment before profit split' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], rule_type: 'profit_percentage',    label: 'Investor Profit Share',   amount: null,   percentage: 0.25, currency: 'USD', priority: 10, conditions: {},                       description: '25% of net profit' },
    { project_id: pid, participant_id: p['StreamVision Inc'],  rule_type: 'revenue_percentage',   label: 'Distribution Fee',        amount: null,   percentage: 0.15, currency: 'USD', priority: 0,  conditions: {},                       description: '15% of gross revenue' },
    { project_id: pid, participant_id: p['Marcus Chen'],       rule_type: 'fixed_payment',        label: 'Director Fee',            amount: 80000,  percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: 'Global director and producer fee' },
    { project_id: pid, participant_id: p['Marcus Chen'],       rule_type: 'profit_percentage',    label: 'Director Profit Share',   amount: null,   percentage: 0.12, currency: 'USD', priority: 10, conditions: {},                       description: '12% of net profit' },
    { project_id: pid, participant_id: p['Emma Laurent'],      rule_type: 'daily_payment',        label: 'Emma Daily Rate',         amount: 3000,   percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: '3,000/day for 38 days' },
    { project_id: pid, participant_id: p['Emma Laurent'],      rule_type: 'profit_percentage',    label: 'Emma Profit Share',       amount: null,   percentage: 0.05, currency: 'USD', priority: 10, conditions: {},                       description: '5% of net profit' },
    { project_id: pid, participant_id: p['Emma Laurent'],      rule_type: 'success_bonus',        label: 'Emma Success Bonus',      amount: 25000,  percentage: null, currency: 'USD', priority: 10, conditions: { min_revenue: 1000000 }, description: '25k bonus if gross > 1M' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       rule_type: 'daily_payment',        label: 'Yuki Daily Rate',         amount: 1500,   percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: '1,500/day for 22 days' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       rule_type: 'profit_percentage',    label: 'Yuki Profit Share',       amount: null,   percentage: 0.03, currency: 'USD', priority: 10, conditions: {},                       description: '3% of net profit' },
    { project_id: pid, participant_id: p['André Silva'],       rule_type: 'fixed_payment',        label: 'Composer Fee',            amount: 20000,  percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: 'Score composition fee' },
    { project_id: pid, participant_id: p['André Silva'],       rule_type: 'revenue_percentage',   label: 'Music Sync Royalty',      amount: null,   percentage: 0.02, currency: 'USD', priority: 0,  conditions: {},                       description: '2% of gross revenue' },
    { project_id: pid, participant_id: p['Camera Dept (3)'],   rule_type: 'daily_payment',        label: 'Crew Daily Rates',        amount: 600,    percentage: null, currency: 'USD', priority: 0,  conditions: {},                       description: '600/day per person × 3 people × 40 days' },
  ]);

  // ── Rights Allocations ──────────────────────────────────────────────────────
  await db.from('rights_allocations').insert([
    { project_id: pid, participant_id: p['Sofia Morales'],     right_type: 'profit_share',  percentage: 0.08, priority: 10, description: '8% profit share' },
    { project_id: pid, participant_id: p['Sofia Morales'],     right_type: 'credit',        percentage: null, priority: 99, description: '"Written by" screen credit' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], right_type: 'profit_share',  percentage: 0.25, priority: 10, description: '25% profit share after repayment' },
    { project_id: pid, participant_id: p['Capital Films Ltd'], right_type: 'ownership',     percentage: 0.30, priority: 1,  description: '30% co-ownership of film IP' },
    { project_id: pid, participant_id: p['StreamVision Inc'],  right_type: 'revenue_share', percentage: 0.15, priority: 0,  description: '15% of gross revenue' },
    { project_id: pid, participant_id: p['Marcus Chen'],       right_type: 'profit_share',  percentage: 0.12, priority: 10, description: '12% profit share' },
    { project_id: pid, participant_id: p['Marcus Chen'],       right_type: 'credit',        percentage: null, priority: 99, description: '"Directed by" credit' },
    { project_id: pid, participant_id: p['Emma Laurent'],      right_type: 'profit_share',  percentage: 0.05, priority: 10, description: '5% profit share' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       right_type: 'profit_share',  percentage: 0.03, priority: 10, description: '3% profit share' },
    { project_id: pid, participant_id: p['André Silva'],       right_type: 'revenue_share', percentage: 0.02, priority: 0,  description: '2% music sync royalty' },
  ]);

  // ── Sample Payments ─────────────────────────────────────────────────────────
  await db.from('payments').insert([
    { project_id: pid, participant_id: p['Sofia Morales'],     amount: 15000, currency: 'USD', payment_date: '2024-01-15', description: 'Script option fee' },
    { project_id: pid, participant_id: p['Marcus Chen'],       amount: 40000, currency: 'USD', payment_date: '2024-03-01', description: 'Director fee — first 50%' },
    { project_id: pid, participant_id: p['Emma Laurent'],      amount: 57000, currency: 'USD', payment_date: '2024-08-15', description: 'Daily rate — first 19 days' },
    { project_id: pid, participant_id: p['Yuki Tanaka'],       amount: 16500, currency: 'USD', payment_date: '2024-08-15', description: 'Daily rate — first 11 days' },
    { project_id: pid, participant_id: p['Camera Dept (3)'],   amount: 36000, currency: 'USD', payment_date: '2024-08-15', description: 'Crew rate — first 20 days' },
    { project_id: pid, participant_id: p['André Silva'],       amount: 10000, currency: 'USD', payment_date: '2024-07-01', description: 'Composer advance' },
  ]);

  return NextResponse.json({ message: 'Seed data created successfully', project_id: pid }, { status: 201 });
}
