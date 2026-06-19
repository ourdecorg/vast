-- Add created_by / updated_by audit columns to all write-enabled tables.
-- projects already tracks updated_at; we add the user columns alongside it.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

ALTER TABLE compensation_rules
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

ALTER TABLE rights_allocations
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE revenue_events
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
