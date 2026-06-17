// Telegram Bot API helpers — uses fetch only, no external libraries.

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ─── Telegram Update Types ────────────────────────────────────────────────────

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramReactionType {
  type: 'emoji' | 'custom_emoji';
  emoji?: string;
  custom_emoji_id?: string;
}

export interface TelegramMessageReaction {
  chat: TelegramChat;
  message_id: number;
  user?: TelegramUser;
  date: number;
  old_reaction: TelegramReactionType[];
  new_reaction: TelegramReactionType[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  message_reaction?: TelegramMessageReaction;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options: {
    replyToMessageId?: number;
    parseMode?: 'HTML' | 'Markdown';
  } = {},
): Promise<TelegramMessage> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode ?? 'HTML',
  };
  if (options.replyToMessageId) {
    body.reply_to_message_id = options.replyToMessageId;
  }

  const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendMessage failed: ${json.description}`);
  return json.result as TelegramMessage;
}

export async function setWebhook(webhookUrl: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'message_reaction'],
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram setWebhook failed: ${json.description}`);
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  const res = await fetch(`${TELEGRAM_API_BASE}/getWebhookInfo`);
  const json = await res.json();
  return json.result;
}

// ─── Message Formatting ───────────────────────────────────────────────────────

export function formatContributionAnnouncement(contribution: {
  participantName: string;
  telegramUsername?: string;
  typeName: string;
  description?: string;
  amount: number;
  unit?: string;
}): string {
  const who = contribution.telegramUsername
    ? `@${contribution.telegramUsername}`
    : contribution.participantName;

  const valueStr = contribution.unit
    ? `${contribution.amount} ${contribution.unit}`
    : String(contribution.amount);

  return [
    '✅ <b>תרומה חדשה נרשמה!</b>',
    `👤 ${who}`,
    `📋 סוג: ${contribution.typeName}`,
    contribution.description ? `💬 ${contribution.description}` : null,
    `📊 ערך: ${valueStr}`,
    '',
    '<i>הגיבו עם emoji או הודעת תגובה כדי להביע הערכה</i>',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

// ─── Command Parsing ──────────────────────────────────────────────────────────

export function parseContributionCommand(text: string): {
  description: string;
  amount: number;
  unit?: string;
} {
  // Strip the /contribute command prefix (handles /contribute@botname too)
  const body = text.replace(/^\/contribute(?:@\S+)?\s*/i, '').trim();

  // Try to extract a leading number (e.g. "8 שעות כתיבה" → amount=8, rest=description)
  const numberMatch = body.match(/^(\d+(?:\.\d+)?)\s+(\S+)\s+(.*)/);
  if (numberMatch) {
    return {
      amount: parseFloat(numberMatch[1]),
      unit: numberMatch[2],
      description: numberMatch[3].trim(),
    };
  }

  // Fallback: treat everything as description, default amount=1
  return { amount: 1, description: body || 'תרומה מטלגרם' };
}

// ─── User Display ─────────────────────────────────────────────────────────────

export function displayName(user: TelegramUser): string {
  return user.username ? `@${user.username}` : user.first_name;
}
