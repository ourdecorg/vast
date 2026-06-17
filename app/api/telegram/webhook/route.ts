export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';
import {
  sendTelegramMessage,
  formatContributionAnnouncement,
  parseContributionCommand,
  displayName,
  type TelegramUpdate,
  type TelegramMessage,
  type TelegramUser,
} from '@/lib/telegram';

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Validate secret token sent by Telegram
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.message_reaction) {
      await handleReaction(
        update.message_reaction.chat.id,
        update.message_reaction.message_id,
        update.message_reaction.user,
        update.message_reaction.new_reaction[0]?.emoji ?? null,
      );
    }
  } catch (err) {
    // Log but always return 200 so Telegram does not retry
    console.error('[telegram/webhook]', err);
  }

  return NextResponse.json({ ok: true });
}

// ─── Message router ──────────────────────────────────────────────────────────

async function handleMessage(msg: TelegramMessage) {
  const text = msg.text ?? '';

  if (text.startsWith('/contribute')) {
    await handleContribute(msg);
    return;
  }

  if (text.startsWith('/link')) {
    await handleLink(msg);
    return;
  }

  // Reply to a bot announcement message → store as a reaction
  if (msg.reply_to_message?.from?.is_bot && msg.from) {
    await handleReply(msg);
  }
}

// ─── /contribute handler ─────────────────────────────────────────────────────

async function handleContribute(msg: TelegramMessage) {
  if (!msg.from) return;

  const projectId = process.env.VAST_DEFAULT_PROJECT_ID;
  const contributionTypeId = process.env.VAST_DEFAULT_CONTRIBUTION_TYPE_ID;

  if (!projectId || !contributionTypeId) {
    await sendTelegramMessage(
      msg.chat.id,
      '⚠️ שגיאת הגדרה: חסרים VAST_DEFAULT_PROJECT_ID או VAST_DEFAULT_CONTRIBUTION_TYPE_ID',
      { replyToMessageId: msg.message_id },
    );
    return;
  }

  const { description, amount, unit } = parseContributionCommand(msg.text ?? '');

  if (!description) {
    await sendTelegramMessage(
      msg.chat.id,
      '❌ שימוש: <code>/contribute [כמות] [יחידה] [תיאור]</code>\nדוגמה: <code>/contribute 8 שעות כתיבת תסריט פרק 3</code>',
      { replyToMessageId: msg.message_id },
    );
    return;
  }

  const db = createAdminClient();

  // Find or create participant linked to this Telegram user
  const participant = await findOrCreateParticipant(db, msg.from, projectId);

  // Write ledger entry
  const ledgerEvent = await appendLedgerEvent(projectId, 'contribution_recorded', {
    participant_id: participant.id,
    contribution_type_id: contributionTypeId,
    amount,
    unit,
    description,
    source: 'telegram',
    telegram_user_id: msg.from.id,
  }, displayName(msg.from));

  // Insert contribution
  const { data: contribution, error } = await db
    .from('contributions')
    .insert({
      project_id: projectId,
      participant_id: participant.id,
      contribution_type_id: contributionTypeId,
      amount,
      unit: unit ?? null,
      description,
      date: new Date().toISOString().split('T')[0],
      ledger_event_id: ledgerEvent.id,
      telegram_chat_id: msg.chat.id,
    })
    .select('*, contribution_types(name)')
    .single();

  if (error) {
    console.error('[handleContribute] DB error:', error);
    await sendTelegramMessage(msg.chat.id, '❌ שגיאה בשמירת התרומה. נסה שוב.', {
      replyToMessageId: msg.message_id,
    });
    return;
  }

  // Send announcement and save its message_id back to the contribution row
  const typeName = (contribution as { contribution_types?: { name: string } }).contribution_types?.name ?? 'כללי';
  const announcement = formatContributionAnnouncement({
    participantName: participant.name,
    telegramUsername: msg.from.username,
    typeName,
    description,
    amount,
    unit,
  });

  const sentMsg = await sendTelegramMessage(msg.chat.id, announcement);

  // Back-fill telegram_message_id so reactions can be linked
  await db
    .from('contributions')
    .update({ telegram_message_id: sentMsg.message_id })
    .eq('id', contribution.id);
}

// ─── /link handler ───────────────────────────────────────────────────────────

async function handleLink(msg: TelegramMessage) {
  if (!msg.from) return;

  // Usage: /link <participant_uuid>
  const parts = (msg.text ?? '').trim().split(/\s+/);
  const participantId = parts[1];

  if (!participantId || !/^[0-9a-f-]{36}$/i.test(participantId)) {
    await sendTelegramMessage(
      msg.chat.id,
      '❌ שימוש: <code>/link &lt;participant_uuid&gt;</code>',
      { replyToMessageId: msg.message_id },
    );
    return;
  }

  const db = createAdminClient();

  const { error } = await db.from('participant_telegram_accounts').upsert(
    {
      participant_id: participantId,
      telegram_user_id: msg.from.id,
      telegram_username: msg.from.username ?? null,
      telegram_first_name: msg.from.first_name,
    },
    { onConflict: 'telegram_user_id' },
  );

  if (error) {
    await sendTelegramMessage(msg.chat.id, `❌ שגיאה: ${error.message}`, {
      replyToMessageId: msg.message_id,
    });
    return;
  }

  await sendTelegramMessage(
    msg.chat.id,
    `✅ ${displayName(msg.from)} קושר בהצלחה למשתתף VAST`,
    { replyToMessageId: msg.message_id },
  );
}

// ─── Reply handler ───────────────────────────────────────────────────────────

async function handleReply(msg: TelegramMessage) {
  if (!msg.from || !msg.reply_to_message) return;

  const db = createAdminClient();

  const { data: contribution } = await db
    .from('contributions')
    .select('id')
    .eq('telegram_message_id', msg.reply_to_message.message_id)
    .eq('telegram_chat_id', msg.chat.id)
    .single();

  if (!contribution) return;

  await db.from('contribution_reactions').insert({
    contribution_id: contribution.id,
    telegram_user_id: msg.from.id,
    telegram_username: msg.from.username ?? null,
    reaction_type: 'reply',
    reply_text: msg.text ?? '',
    telegram_message_id: msg.message_id,
  });
}

// ─── Emoji reaction handler ──────────────────────────────────────────────────

async function handleReaction(
  chatId: number,
  messageId: number,
  user: TelegramUser | undefined,
  emoji: string | null,
) {
  if (!user || !emoji) return;

  const db = createAdminClient();

  const { data: contribution } = await db
    .from('contributions')
    .select('id')
    .eq('telegram_message_id', messageId)
    .eq('telegram_chat_id', chatId)
    .single();

  if (!contribution) return;

  // Upsert so a user can change their emoji without duplicating rows
  await db.from('contribution_reactions').upsert(
    {
      contribution_id: contribution.id,
      telegram_user_id: user.id,
      telegram_username: user.username ?? null,
      reaction_type: 'emoji',
      emoji,
    },
    { onConflict: 'contribution_id,telegram_user_id,reaction_type' },
  );
}

// ─── Participant resolution ──────────────────────────────────────────────────

async function findOrCreateParticipant(
  db: ReturnType<typeof createAdminClient>,
  telegramUser: TelegramUser,
  projectId: string,
): Promise<{ id: string; name: string }> {
  // Check if this Telegram user is already linked
  const { data: linked } = await db
    .from('participant_telegram_accounts')
    .select('participant_id, participants(id, name)')
    .eq('telegram_user_id', telegramUser.id)
    .single();

  if (linked?.participant_id) {
    const p = (linked as unknown as { participants?: { id: string; name: string }[] }).participants;
    if (p?.[0]) return p[0];
  }

  // Auto-create a participant from Telegram data
  const name = telegramUser.username
    ? `@${telegramUser.username}`
    : telegramUser.first_name;

  const { data: newParticipant, error } = await db
    .from('participants')
    .insert({ project_id: projectId, name })
    .select('id, name')
    .single();

  if (error || !newParticipant) throw new Error(`Failed to create participant: ${error?.message}`);

  // Link the new participant to the Telegram account
  await db.from('participant_telegram_accounts').insert({
    participant_id: newParticipant.id,
    telegram_user_id: telegramUser.id,
    telegram_username: telegramUser.username ?? null,
    telegram_first_name: telegramUser.first_name,
  });

  return newParticipant as { id: string; name: string };
}
