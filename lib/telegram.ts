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

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
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
  callback_query?: TelegramCallbackQuery;
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
    disable_web_page_preview: true,
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

// Send a message with an Inline Keyboard.
// buttons is a 2D array: outer = rows, inner = columns.
export async function sendMessageWithKeyboard(
  chatId: number,
  text: string,
  buttons: TelegramInlineKeyboardButton[][],
): Promise<TelegramMessage> {
  const res = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendMessageWithKeyboard failed: ${json.description}`);
  return json.result as TelegramMessage;
}

// Edit an existing bot message in-place (used to advance wizard steps without extra noise).
export async function editMessageWithKeyboard(
  chatId: number,
  messageId: number,
  text: string,
  buttons: TelegramInlineKeyboardButton[][],
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API_BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: buttons },
    }),
  });

  const json = await res.json();
  // Telegram returns false (not an error) when the message content didn't change — ignore that.
  if (!json.ok && json.description !== 'Bad Request: message is not modified') {
    throw new Error(`Telegram editMessageWithKeyboard failed: ${json.description}`);
  }
}

// Must be called after every callback_query to dismiss the loading spinner on the button.
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function setWebhook(webhookUrl: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query', 'message_reaction'],
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
  addedByEmail?: string;
  contributionUrl?: string;
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
    contribution.addedByEmail ? `🌐 נרשם ע"י ${contribution.addedByEmail}` : null,
    '',
    contribution.contributionUrl ? `🔗 <a href="${contribution.contributionUrl}">פתח ב-VAST</a>` : null,
    '<i>הגיבו עם emoji או הודעת תגובה כדי להביע הערכה</i>',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function formatReactionAnnouncement(reaction: {
  authorEmail: string;
  contributionParticipantName: string;
  reactionType: 'emoji' | 'reply';
  emoji?: string | null;
  replyText?: string | null;
  contributionUrl?: string;
}): string {
  const link = reaction.contributionUrl
    ? `\n🔗 <a href="${reaction.contributionUrl}">פתח ב-VAST</a>`
    : '';

  if (reaction.reactionType === 'emoji') {
    return `${reaction.emoji} <b>${reaction.authorEmail}</b> הגיב לתרומת ${reaction.contributionParticipantName}${link}`;
  }
  return [
    `💬 <b>${reaction.authorEmail}</b> הגיב על תרומת ${reaction.contributionParticipantName}:`,
    reaction.replyText ?? '',
    link,
  ].filter(Boolean).join('\n');
}

export function contributionUrl(projectId: string, contributionId: string): string {
  const base = process.env.NEXTAUTH_URL ?? '';
  return `${base}/projects/${projectId}/contributions#c-${contributionId}`;
}

// ─── User Display ─────────────────────────────────────────────────────────────

export function displayName(user: TelegramUser): string {
  return user.username ? `@${user.username}` : user.first_name;
}
