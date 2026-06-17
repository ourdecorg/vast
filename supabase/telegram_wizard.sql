-- VAST — Telegram Wizard Sessions
-- Run this in your Supabase SQL editor after telegram_integration.sql

CREATE TABLE IF NOT EXISTS telegram_wizard_sessions (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_user_id     BIGINT      NOT NULL,
  telegram_chat_id     BIGINT      NOT NULL,
  step                 TEXT        NOT NULL CHECK (step IN (
                         'select_project','select_type',
                         'enter_description','enter_amount','confirm')),
  project_id           UUID        REFERENCES projects(id) ON DELETE SET NULL,
  contribution_type_id UUID        REFERENCES contribution_types(id) ON DELETE SET NULL,
  description          TEXT,
  amount               NUMERIC,
  unit                 TEXT,
  wizard_message_id    BIGINT,     -- message_id of the bot's last wizard message
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (telegram_user_id, telegram_chat_id)
);

CREATE INDEX IF NOT EXISTS idx_wizard_sessions_user
  ON telegram_wizard_sessions (telegram_user_id, telegram_chat_id);
