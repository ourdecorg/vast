-- VAST — Seed Data: "The Last Summer" Film Project
-- Run AFTER schema.sql
-- Uses DB-generated UUIDs via a DO block to avoid any hardcoded ID strings in UUID columns.

DO $$
DECLARE
  -- contribution type IDs
  ct_time_hours   UUID;
  ct_time_days    UUID;
  ct_money        UUID;
  ct_risk         UUID;
  ct_writing      UUID;
  ct_idea         UUID;
  ct_talent       UUID;
  ct_reputation   UUID;
  ct_network      UUID;
  ct_distribution UUID;
  ct_logistics    UUID;
  ct_leadership   UUID;
  ct_community    UUID;
  ct_emotional    UUID;

  -- archetype IDs
  arch_screenwriter UUID;
  arch_investor     UUID;
  arch_distributor  UUID;
  arch_director     UUID;
  arch_actor        UUID;
  arch_crew         UUID;
  arch_advisor      UUID;
  arch_composer     UUID;

  -- project + participant IDs
  proj_id     UUID;
  p_sofia     UUID;
  p_capital   UUID;
  p_stream    UUID;
  p_marcus    UUID;
  p_emma      UUID;
  p_yuki      UUID;
  p_andre     UUID;
  p_crew1     UUID;

BEGIN

-- ─────────────────────────────────────────
-- Contribution Types
-- ─────────────────────────────────────────
INSERT INTO contribution_types (name, category, description, unit, is_monetary)
VALUES
  ('Time (Hours)',          'time',           'General time measured in hours',                    'hours',  false),
  ('Time (Days)',           'time',           'General time measured in days',                     'days',   false),
  ('Financial Investment',  'money',          'Direct monetary investment',                        'USD',    true),
  ('Risk Capital',          'risk',           'Taking on financial or reputational risk',          'USD',    true),
  ('Writing / Script',      'creativity',     'Screenwriting, scriptwriting, copywriting',         'pages',  false),
  ('Original Idea',         'idea_ownership', 'Founding concept or intellectual property',         'units',  false),
  ('Performance / Talent',  'talent',         'Acting, performing, creative execution',            'days',   false),
  ('Reputation Stake',      'reputation',     'Lending personal or brand reputation',             'units',  false),
  ('Network / Connections', 'network',        'Introducing key contacts or partners',              'units',  false),
  ('Distribution Access',   'distribution',   'Access to distribution channels or markets',       'units',  false),
  ('Logistics / Ops',       'logistics',      'Production management, coordination, operations',   'days',   false),
  ('Artistic Leadership',   'leadership',     'Creative direction, vision, project leadership',    'days',   false),
  ('Community Trust',       'community_trust','Community credibility or audience trust',           'units',  false),
  ('Emotional Labor',       'emotional_labor','Supporting team morale, mediation',                 'hours',  false)
ON CONFLICT (name) DO NOTHING;

SELECT id INTO ct_time_hours   FROM contribution_types WHERE name = 'Time (Hours)';
SELECT id INTO ct_time_days    FROM contribution_types WHERE name = 'Time (Days)';
SELECT id INTO ct_money        FROM contribution_types WHERE name = 'Financial Investment';
SELECT id INTO ct_risk         FROM contribution_types WHERE name = 'Risk Capital';
SELECT id INTO ct_writing      FROM contribution_types WHERE name = 'Writing / Script';
SELECT id INTO ct_idea         FROM contribution_types WHERE name = 'Original Idea';
SELECT id INTO ct_talent       FROM contribution_types WHERE name = 'Performance / Talent';
SELECT id INTO ct_reputation   FROM contribution_types WHERE name = 'Reputation Stake';
SELECT id INTO ct_network      FROM contribution_types WHERE name = 'Network / Connections';
SELECT id INTO ct_distribution FROM contribution_types WHERE name = 'Distribution Access';
SELECT id INTO ct_logistics    FROM contribution_types WHERE name = 'Logistics / Ops';
SELECT id INTO ct_leadership   FROM contribution_types WHERE name = 'Artistic Leadership';
SELECT id INTO ct_community    FROM contribution_types WHERE name = 'Community Trust';
SELECT id INTO ct_emotional    FROM contribution_types WHERE name = 'Emotional Labor';

-- ─────────────────────────────────────────
-- Archetypes
-- ─────────────────────────────────────────
INSERT INTO archetypes (name, description, typical_contributions, typical_compensation_types, is_built_in)
VALUES
  ('Screenwriter',             'Creates original story, script, and creative foundation.',   ARRAY['idea_ownership','creativity','time'],                    ARRAY['fixed_payment','profit_percentage','symbolic_credit'], true),
  ('Investor / Entrepreneur',  'Provides financial capital and takes on risk.',               ARRAY['money','risk'],                                           ARRAY['investment_repayment','profit_percentage'],            true),
  ('Distribution Company',     'Provides market access, logistics, and connections.',         ARRAY['distribution','network','logistics','reputation'],         ARRAY['revenue_percentage'],                                  true),
  ('Director / Producer',      'Artistic vision, leadership, and coordination.',              ARRAY['leadership','creativity','time'],                          ARRAY['fixed_payment','profit_percentage'],                   true),
  ('Actor / Performer',        'Provides talent, time, and potentially reputation.',          ARRAY['talent','time','reputation'],                              ARRAY['daily_payment','fixed_payment','profit_percentage'],   true),
  ('Crew Member / Extra',      'Provides time and labour.',                                   ARRAY['time','logistics'],                                        ARRAY['hourly_payment','daily_payment'],                      true),
  ('Advisor / Mentor',         'Knowledge, reputation, and network access.',                  ARRAY['reputation','network','leadership'],                       ARRAY['symbolic_credit','profit_percentage'],                 true),
  ('Composer / Sound Designer','Creates original music, sound design, or audio assets.',      ARRAY['creativity','talent','time'],                              ARRAY['fixed_payment','revenue_percentage'],                  true)
ON CONFLICT (name) DO NOTHING;

SELECT id INTO arch_screenwriter FROM archetypes WHERE name = 'Screenwriter';
SELECT id INTO arch_investor     FROM archetypes WHERE name = 'Investor / Entrepreneur';
SELECT id INTO arch_distributor  FROM archetypes WHERE name = 'Distribution Company';
SELECT id INTO arch_director     FROM archetypes WHERE name = 'Director / Producer';
SELECT id INTO arch_actor        FROM archetypes WHERE name = 'Actor / Performer';
SELECT id INTO arch_crew         FROM archetypes WHERE name = 'Crew Member / Extra';
SELECT id INTO arch_advisor      FROM archetypes WHERE name = 'Advisor / Mentor';
SELECT id INTO arch_composer     FROM archetypes WHERE name = 'Composer / Sound Designer';

-- ─────────────────────────────────────────
-- Skip if demo project already exists
-- ─────────────────────────────────────────
IF EXISTS (SELECT 1 FROM projects WHERE name = 'The Last Summer') THEN
  RAISE NOTICE 'Demo project already exists — skipping.';
  RETURN;
END IF;

-- ─────────────────────────────────────────
-- Project
-- ─────────────────────────────────────────
INSERT INTO projects (name, description, type, status, currency)
VALUES ('The Last Summer',
  'An intimate drama about three childhood friends who reunite in their hometown after a decade apart, confronting old wounds and unspoken loves.',
  'film', 'active', 'USD')
RETURNING id INTO proj_id;

-- ─────────────────────────────────────────
-- Budget
-- ─────────────────────────────────────────
INSERT INTO budgets (project_id, total_amount, currency, allocated_amount, spent_amount, notes)
VALUES (proj_id, 500000, 'USD', 420000, 185000,
  'Indie film. Lead investor 300k; remainder from co-producers.');

-- ─────────────────────────────────────────
-- Participants
-- ─────────────────────────────────────────
INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Sofia Morales',     'sofia@vastdemo.io',      'Award-winning screenwriter. Wrote the original script over three years.')
RETURNING id INTO p_sofia;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Capital Films Ltd', 'finance@capitalfilms.io','Independent film investment firm.')
RETURNING id INTO p_capital;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'StreamVision Inc',  'deals@streamvision.io',  'Global streaming distributor — rights deals across 40+ countries.')
RETURNING id INTO p_stream;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Marcus Chen',       'marcus@vastdemo.io',     'Director of Photography turned Director.')
RETURNING id INTO p_marcus;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Emma Laurent',      'emma@vastdemo.io',       'Lead actress. Two-time BAFTA nominee.')
RETURNING id INTO p_emma;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Yuki Tanaka',       'yuki@vastdemo.io',       'Supporting actor and co-producer.')
RETURNING id INTO p_yuki;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'André Silva',       'andre@vastdemo.io',      'Composer — classical meets electronic.')
RETURNING id INTO p_andre;

INSERT INTO participants (project_id, name, email, bio) VALUES
  (proj_id, 'Camera Dept (3)',   'crew@vastdemo.io',       'Three-person camera and lighting crew.')
RETURNING id INTO p_crew1;

-- ─────────────────────────────────────────
-- Participant ↔ Archetype
-- ─────────────────────────────────────────
INSERT INTO participant_archetypes (participant_id, archetype_id) VALUES
  (p_sofia,   arch_screenwriter),
  (p_capital, arch_investor),
  (p_stream,  arch_distributor),
  (p_marcus,  arch_director),
  (p_emma,    arch_actor),
  (p_yuki,    arch_actor),
  (p_yuki,    arch_director),
  (p_andre,   arch_composer),
  (p_crew1,   arch_crew);

-- ─────────────────────────────────────────
-- Contributions
-- ─────────────────────────────────────────
INSERT INTO contributions (project_id, participant_id, contribution_type_id, amount, unit, description, date) VALUES
  (proj_id, p_sofia,   ct_idea,         1,      'units', 'Original concept for The Last Summer',                '2023-01-15'),
  (proj_id, p_sofia,   ct_writing,      127,    'pages', 'Full screenplay — three drafts',                       '2023-09-01'),
  (proj_id, p_sofia,   ct_time_hours,   800,    'hours', 'Research, writing, production consultations',          '2024-06-01'),
  (proj_id, p_capital, ct_money,        300000, 'USD',   'Lead investment — greenlight funding',                 '2024-01-10'),
  (proj_id, p_capital, ct_risk,         300000, 'USD',   'Full investment at risk pending performance',          '2024-01-10'),
  (proj_id, p_stream,  ct_distribution, 1,      'units', 'International streaming rights — 40+ countries',       '2024-02-01'),
  (proj_id, p_stream,  ct_network,      1,      'units', 'Festival pipeline and marketing channels',             '2024-02-01'),
  (proj_id, p_marcus,  ct_leadership,   60,     'days',  'Pre-production creative direction and casting',         '2024-03-01'),
  (proj_id, p_marcus,  ct_time_days,    40,     'days',  'Principal photography — 40 shooting days',             '2024-07-01'),
  (proj_id, p_emma,    ct_talent,       38,     'days',  'Lead role — Elena. 38 shooting days.',                 '2024-07-01'),
  (proj_id, p_emma,    ct_reputation,   1,      'units', 'BAFTA nominee profile — significant audience draw',    '2024-02-15'),
  (proj_id, p_yuki,    ct_talent,       22,     'days',  'Supporting role — Marco. 22 shooting days.',           '2024-07-01'),
  (proj_id, p_yuki,    ct_logistics,    30,     'days',  'Associate producer logistics over 30 pre-prod days',   '2024-04-01'),
  (proj_id, p_andre,   ct_writing,      60,     'pages', 'Original score — 60 minutes of composed music',        '2024-08-01'),
  (proj_id, p_andre,   ct_time_hours,   400,    'hours', 'Composition, recording, mixing, sync sessions',        '2024-09-01'),
  (proj_id, p_crew1,   ct_time_days,    120,    'days',  '3 crew members × 40 shooting days',                   '2024-07-01');

-- ─────────────────────────────────────────
-- Compensation Rules
-- ─────────────────────────────────────────
INSERT INTO compensation_rules (project_id, participant_id, rule_type, label, amount, percentage, currency, priority, conditions, description) VALUES
  (proj_id, p_sofia,   'fixed_payment',        'Script Option Fee',       15000,  NULL,  'USD', 0,  '{}',                       'Upfront script option on greenlight'),
  (proj_id, p_sofia,   'profit_percentage',    'Sofia Profit Share',      NULL,   0.08,  'USD', 10, '{}',                       '8% of net profit'),
  (proj_id, p_sofia,   'symbolic_credit',      'Written By Credit',       NULL,   NULL,  'USD', 99, '{}',                       'Mandatory screen credit'),
  (proj_id, p_capital, 'investment_repayment', 'Investor Repayment',      300000, NULL,  'USD', 1,  '{}',                       '300k repayment before profit split'),
  (proj_id, p_capital, 'profit_percentage',    'Investor Profit Share',   NULL,   0.25,  'USD', 10, '{}',                       '25% of net profit'),
  (proj_id, p_stream,  'revenue_percentage',   'Distribution Fee',        NULL,   0.15,  'USD', 0,  '{}',                       '15% of gross revenue'),
  (proj_id, p_marcus,  'fixed_payment',        'Director Fee',            80000,  NULL,  'USD', 0,  '{}',                       'Global director and producer fee'),
  (proj_id, p_marcus,  'profit_percentage',    'Director Profit Share',   NULL,   0.12,  'USD', 10, '{}',                       '12% of net profit'),
  (proj_id, p_emma,    'daily_payment',        'Emma Daily Rate',         3000,   NULL,  'USD', 0,  '{}',                       '3,000/day for 38 days'),
  (proj_id, p_emma,    'profit_percentage',    'Emma Profit Share',       NULL,   0.05,  'USD', 10, '{}',                       '5% of net profit'),
  (proj_id, p_emma,    'success_bonus',        'Emma Success Bonus',      25000,  NULL,  'USD', 10, '{"min_revenue":1000000}',  '25k bonus if gross > 1M'),
  (proj_id, p_yuki,    'daily_payment',        'Yuki Daily Rate',         1500,   NULL,  'USD', 0,  '{}',                       '1,500/day for 22 days'),
  (proj_id, p_yuki,    'profit_percentage',    'Yuki Profit Share',       NULL,   0.03,  'USD', 10, '{}',                       '3% of net profit'),
  (proj_id, p_andre,   'fixed_payment',        'Composer Fee',            20000,  NULL,  'USD', 0,  '{}',                       'Score composition fee'),
  (proj_id, p_andre,   'revenue_percentage',   'Music Sync Royalty',      NULL,   0.02,  'USD', 0,  '{}',                       '2% of gross revenue'),
  (proj_id, p_crew1,   'daily_payment',        'Crew Daily Rates',        600,    NULL,  'USD', 0,  '{}',                       '600/day per person × 3 people × 40 days');

-- ─────────────────────────────────────────
-- Rights Allocations
-- ─────────────────────────────────────────
INSERT INTO rights_allocations (project_id, participant_id, right_type, percentage, priority, description) VALUES
  (proj_id, p_sofia,   'profit_share',  0.08, 10, '8% profit share'),
  (proj_id, p_sofia,   'credit',        NULL, 99, '"Written by" screen credit'),
  (proj_id, p_capital, 'profit_share',  0.25, 10, '25% profit share after repayment'),
  (proj_id, p_capital, 'ownership',     0.30, 1,  '30% co-ownership of film IP'),
  (proj_id, p_stream,  'revenue_share', 0.15, 0,  '15% of gross revenue'),
  (proj_id, p_marcus,  'profit_share',  0.12, 10, '12% profit share'),
  (proj_id, p_marcus,  'credit',        NULL, 99, '"Directed by" credit'),
  (proj_id, p_emma,    'profit_share',  0.05, 10, '5% profit share'),
  (proj_id, p_yuki,    'profit_share',  0.03, 10, '3% profit share'),
  (proj_id, p_andre,   'revenue_share', 0.02, 0,  '2% music sync royalty');

-- ─────────────────────────────────────────
-- Sample Payments
-- ─────────────────────────────────────────
INSERT INTO payments (project_id, participant_id, amount, currency, payment_date, description) VALUES
  (proj_id, p_sofia,   15000, 'USD', '2024-01-15', 'Script option fee'),
  (proj_id, p_marcus,  40000, 'USD', '2024-03-01', 'Director fee — first 50%'),
  (proj_id, p_emma,    57000, 'USD', '2024-08-15', 'Daily rate — first 19 days'),
  (proj_id, p_yuki,    16500, 'USD', '2024-08-15', 'Daily rate — first 11 days'),
  (proj_id, p_crew1,   36000, 'USD', '2024-08-15', 'Crew rate — first 20 days'),
  (proj_id, p_andre,   10000, 'USD', '2024-07-01', 'Composer advance');

RAISE NOTICE 'Demo project "The Last Summer" seeded with project_id = %', proj_id;

END $$;
