-- VAST — Value Attribution and Sharing Toolkit
-- Database Schema
-- Run this in your Supabase SQL editor before starting the app.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Projects
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  type        VARCHAR(100) NOT NULL DEFAULT 'film',
  status      VARCHAR(50)  NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','completed','archived')),
  currency    VARCHAR(10)  NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Archetypes — reusable role templates
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archetypes (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      VARCHAR(255) NOT NULL UNIQUE,
  description               TEXT,
  typical_contributions     TEXT[]       NOT NULL DEFAULT '{}',
  typical_compensation_types TEXT[]      NOT NULL DEFAULT '{}',
  is_built_in               BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Participants
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  bio         TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Participant ↔ Archetype  (many-to-many)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participant_archetypes (
  id             UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID  NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  archetype_id   UUID  NOT NULL REFERENCES archetypes(id)  ON DELETE RESTRICT,
  notes          TEXT,
  UNIQUE (participant_id, archetype_id)
);

-- ─────────────────────────────────────────
-- Contribution types — what kinds of value exist
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contribution_types (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL UNIQUE,
  category     VARCHAR(100) NOT NULL,
  description  TEXT,
  unit         VARCHAR(50),           -- hours | days | USD | words | scenes | …
  is_monetary  BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ─────────────────────────────────────────
-- Contributions — recorded acts of giving value
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributions (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id       UUID         NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  contribution_type_id UUID         NOT NULL REFERENCES contribution_types(id),
  amount               NUMERIC(15,2) NOT NULL,
  unit                 VARCHAR(50),
  description          TEXT,
  date                 DATE         NOT NULL DEFAULT CURRENT_DATE,
  ledger_event_id      UUID,                  -- filled after ledger write
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Compensation rules — how participants get paid
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compensation_rules (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id UUID          NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rule_type      VARCHAR(100)  NOT NULL,
  label          VARCHAR(255)  NOT NULL,
  amount         NUMERIC(15,2),               -- for fixed / hourly / daily / bonus
  percentage     NUMERIC(6,5),               -- 0-1 decimal, e.g. 0.15000 = 15%
  currency       VARCHAR(10)   DEFAULT 'USD',
  priority       INTEGER       DEFAULT 0,     -- lower = applied first in waterfall
  conditions     JSONB         DEFAULT '{}',  -- e.g. {"min_revenue": 100000}
  description    TEXT,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Rights allocations — future claims
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rights_allocations (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id UUID          NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  right_type     VARCHAR(100)  NOT NULL,
  percentage     NUMERIC(6,5),
  priority       INTEGER       DEFAULT 0,
  description    TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Payments — actual money disbursed
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id       UUID          NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  compensation_rule_id UUID          REFERENCES compensation_rules(id),
  amount               NUMERIC(15,2) NOT NULL,
  currency             VARCHAR(10)   NOT NULL DEFAULT 'USD',
  payment_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
  description          TEXT,
  ledger_event_id      UUID,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Ledger events — append-only, hash-chained audit log
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_events (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type    VARCHAR(100)  NOT NULL,
  payload       JSONB         NOT NULL DEFAULT '{}',
  previous_hash VARCHAR(64)   NOT NULL,   -- "GENESIS" for the first event
  hash          VARCHAR(64)   NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by    VARCHAR(255)
);

-- Back-fill foreign keys now that ledger_events exists
ALTER TABLE contributions
  ADD CONSTRAINT fk_contributions_ledger
  FOREIGN KEY (ledger_event_id) REFERENCES ledger_events(id);

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_ledger
  FOREIGN KEY (ledger_event_id) REFERENCES ledger_events(id);

-- ─────────────────────────────────────────
-- Budget
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  total_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(10)   NOT NULL DEFAULT 'USD',
  allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  spent_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Revenue events
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_events (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount          NUMERIC(15,2) NOT NULL,
  currency        VARCHAR(10)   NOT NULL DEFAULT 'USD',
  description     TEXT,
  source          VARCHAR(255),
  date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  ledger_event_id UUID          REFERENCES ledger_events(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_participants_project      ON participants(project_id);
CREATE INDEX IF NOT EXISTS idx_contributions_project     ON contributions(project_id);
CREATE INDEX IF NOT EXISTS idx_contributions_participant  ON contributions(participant_id);
CREATE INDEX IF NOT EXISTS idx_compensation_rules_project ON compensation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_events_project     ON ledger_events(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_events_created     ON ledger_events(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_project          ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_project    ON revenue_events(project_id);
