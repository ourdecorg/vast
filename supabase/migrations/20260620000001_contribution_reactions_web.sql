-- Allow web users (no Telegram) to post reactions
ALTER TABLE contribution_reactions
  ALTER COLUMN telegram_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS web_user_email TEXT;
