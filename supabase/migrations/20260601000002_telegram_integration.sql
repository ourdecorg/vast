CREATE TABLE IF NOT EXISTS participant_telegram_accounts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id    UUID        NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  telegram_user_id  BIGINT      NOT NULL UNIQUE,
  telegram_username TEXT,
  telegram_first_name TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_telegram_user_id
  ON participant_telegram_accounts (telegram_user_id);

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id    BIGINT;

CREATE INDEX IF NOT EXISTS idx_contributions_telegram_message_id
  ON contributions (telegram_message_id)
  WHERE telegram_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contribution_reactions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id     UUID        NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  telegram_user_id    BIGINT      NOT NULL,
  telegram_username   TEXT,
  reaction_type       TEXT        NOT NULL CHECK (reaction_type IN ('emoji', 'reply')),
  emoji               TEXT,
  reply_text          TEXT,
  telegram_message_id BIGINT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contribution_reactions_contribution_id
  ON contribution_reactions (contribution_id);

CREATE INDEX IF NOT EXISTS idx_contribution_reactions_telegram_user
  ON contribution_reactions (telegram_user_id);
