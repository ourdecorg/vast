export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';
import {
  sendTelegramMessage,
  sendMessageWithKeyboard,
  editMessageWithKeyboard,
  answerCallbackQuery,
  formatContributionAnnouncement,
  contributionUrl,
  displayName,
  type TelegramUpdate,
  type TelegramMessage,
  type TelegramCallbackQuery,
  type TelegramUser,
  type TelegramInlineKeyboardButton,
} from '@/lib/telegram';

// ─── Wizard session type (mirrors DB row) ─────────────────────────────────────

interface WizardSession {
  id: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  step: 'select_project' | 'select_type' | 'enter_description' | 'enter_amount' | 'confirm';
  project_id: string | null;
  contribution_type_id: string | null;
  description: string | null;
  amount: number | null;
  unit: string | null;
  wizard_message_id: number | null;
  expires_at: string;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
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
    console.error('[telegram/webhook]', err);
  }

  return NextResponse.json({ ok: true });
}

// ─── Message router ──────────────────────────────────────────────────────────

async function handleMessage(msg: TelegramMessage) {
  const text = msg.text ?? '';

  if (text.startsWith('/contribute')) {
    await startWizard(msg);
    return;
  }

  if (text.startsWith('/link')) {
    await handleLink(msg);
    return;
  }

  // Check if this user has an active wizard session waiting for text input
  if (msg.from) {
    const db = createAdminClient();
    const session = await getActiveSession(db, msg.from.id, msg.chat.id);
    if (session) {
      await handleWizardTextInput(msg, session, db);
      return;
    }
  }

  // Reply to a bot announcement message → store as a reaction
  if (msg.reply_to_message?.from?.is_bot && msg.from) {
    await handleReply(msg);
  }
}

// ─── Wizard: Step 1 — /contribute starts the flow ────────────────────────────

async function startWizard(msg: TelegramMessage) {
  if (!msg.from) return;
  const db = createAdminClient();

  const { data: projects, error } = await db
    .from('projects')
    .select('id, name')
    .in('status', ['draft', 'active'])
    .order('name');

  if (error || !projects?.length) {
    await sendTelegramMessage(msg.chat.id, '⚠️ לא נמצאו פרויקטים פעילים ב-VAST.', {
      replyToMessageId: msg.message_id,
    });
    return;
  }

  // One button per project, two per row
  const buttons: TelegramInlineKeyboardButton[][] = chunkButtons(
    projects.map((p) => ({ text: p.name, callback_data: `proj:${p.id}` })),
    2,
  );

  const sent = await sendMessageWithKeyboard(
    msg.chat.id,
    '📁 <b>הזנת תרומה — שלב 1/4</b>\n\nבחר פרויקט:',
    buttons,
  );

  // Upsert session (replaces any existing abandoned wizard for this user+chat)
  await db.from('telegram_wizard_sessions').upsert(
    {
      telegram_user_id: msg.from.id,
      telegram_chat_id: msg.chat.id,
      step: 'select_project',
      project_id: null,
      contribution_type_id: null,
      description: null,
      amount: null,
      unit: null,
      wizard_message_id: sent.message_id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
    { onConflict: 'telegram_user_id,telegram_chat_id' },
  );
}

// ─── Wizard: Callback query router ───────────────────────────────────────────

async function handleCallbackQuery(cq: TelegramCallbackQuery) {
  const data = cq.data ?? '';
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;

  if (!chatId || !messageId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  const db = createAdminClient();
  const session = await getActiveSession(db, cq.from.id, chatId);

  if (!session) {
    await answerCallbackQuery(cq.id, 'הפגישה פגה. שלח /contribute להתחלה מחדש.');
    return;
  }

  if (data.startsWith('proj:')) {
    await handleProjectSelected(cq, session, data.slice(5), db);
  } else if (data.startsWith('type:')) {
    await handleTypeSelected(cq, session, data.slice(5), db);
  } else if (data === 'confirm:yes') {
    await handleConfirm(cq, session, db);
  } else if (data === 'confirm:no') {
    await handleCancel(cq, session, db);
  } else {
    await answerCallbackQuery(cq.id);
  }
}

// ─── Wizard: Step 2 — project selected ───────────────────────────────────────

async function handleProjectSelected(
  cq: TelegramCallbackQuery,
  session: WizardSession,
  projectId: string,
  db: ReturnType<typeof createAdminClient>,
) {
  const { data: project } = await db
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single();

  if (!project) {
    await answerCallbackQuery(cq.id, 'פרויקט לא נמצא.');
    return;
  }

  const { data: types } = await db
    .from('contribution_types')
    .select('id, name')
    .order('name');

  if (!types?.length) {
    await answerCallbackQuery(cq.id, 'לא נמצאו סוגי תרומה. פנה למנהל המערכת.');
    return;
  }

  const buttons: TelegramInlineKeyboardButton[][] = chunkButtons(
    types.map((t) => ({ text: t.name, callback_data: `type:${t.id}` })),
    2,
  );

  await editMessageWithKeyboard(
    cq.message!.chat.id,
    cq.message!.message_id,
    `📁 <b>הזנת תרומה — שלב 2/4</b>\n✅ פרויקט: ${project.name}\n\nבחר סוג תרומה:`,
    buttons,
  );

  await db
    .from('telegram_wizard_sessions')
    .update({ step: 'select_type', project_id: projectId })
    .eq('id', session.id);

  await answerCallbackQuery(cq.id);
}

// ─── Wizard: Step 3 — type selected, ask for description ─────────────────────

async function handleTypeSelected(
  cq: TelegramCallbackQuery,
  session: WizardSession,
  typeId: string,
  db: ReturnType<typeof createAdminClient>,
) {
  const { data: type } = await db
    .from('contribution_types')
    .select('id, name, unit')
    .eq('id', typeId)
    .single();

  if (!type) {
    await answerCallbackQuery(cq.id, 'סוג תרומה לא נמצא.');
    return;
  }

  // Edit wizard message to show progress (remove keyboard)
  await editMessageWithKeyboard(
    cq.message!.chat.id,
    cq.message!.message_id,
    `📁 <b>הזנת תרומה — שלב 3/4</b>\n✅ סוג: ${type.name}\n\n✏️ הזן תיאור קצר של התרומה:`,
    [],
  );

  await db
    .from('telegram_wizard_sessions')
    .update({ step: 'enter_description', contribution_type_id: typeId, unit: type.unit ?? null })
    .eq('id', session.id);

  await answerCallbackQuery(cq.id);
}

// ─── Wizard: Text input handler (description + amount) ───────────────────────

async function handleWizardTextInput(
  msg: TelegramMessage,
  session: WizardSession,
  db: ReturnType<typeof createAdminClient>,
) {
  const text = (msg.text ?? '').trim();
  if (!text || !msg.from) return;

  if (session.step === 'enter_description') {
    await db
      .from('telegram_wizard_sessions')
      .update({ step: 'enter_amount', description: text })
      .eq('id', session.id);

    const unitHint = session.unit ? ` (${session.unit})` : '';
    await sendTelegramMessage(
      msg.chat.id,
      `📁 <b>הזנת תרומה — שלב 4/4</b>\n✅ תיאור: ${text}\n\n⏱ כמה${unitHint} השקעת? (הזן מספר)`,
    );
    return;
  }

  if (session.step === 'enter_amount') {
    const amount = parseFloat(text.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      await sendTelegramMessage(msg.chat.id, '❌ הזן מספר חיובי בלבד (לדוגמה: 8 או 2.5)');
      return;
    }

    // Fetch names for the summary
    const [{ data: project }, { data: type }] = await Promise.all([
      db.from('projects').select('name').eq('id', session.project_id!).single(),
      db.from('contribution_types').select('name').eq('id', session.contribution_type_id!).single(),
    ]);

    const unitStr = session.unit ? ` ${session.unit}` : '';
    const summary =
      `📋 <b>סיכום התרומה:</b>\n\n` +
      `🗂 פרויקט: ${project?.name ?? '—'}\n` +
      `📌 סוג: ${type?.name ?? '—'}\n` +
      `💬 תיאור: ${session.description}\n` +
      `📊 ערך: ${amount}${unitStr}\n\n` +
      `האם לאשר ולשמור?`;

    const sent = await sendMessageWithKeyboard(msg.chat.id, summary, [
      [
        { text: '✅ אישור', callback_data: 'confirm:yes' },
        { text: '❌ ביטול', callback_data: 'confirm:no' },
      ],
    ]);

    await db
      .from('telegram_wizard_sessions')
      .update({ step: 'confirm', amount, wizard_message_id: sent.message_id })
      .eq('id', session.id);
  }
}

// ─── Wizard: Confirm — save contribution ─────────────────────────────────────

async function handleConfirm(
  cq: TelegramCallbackQuery,
  session: WizardSession,
  db: ReturnType<typeof createAdminClient>,
) {
  await answerCallbackQuery(cq.id, 'שומר תרומה...');

  const chatId = cq.message!.chat.id;

  // Remove keyboard from summary message
  await editMessageWithKeyboard(chatId, cq.message!.message_id, cq.message!.text ?? '', []);

  const projectId = session.project_id!;
  const participant = await findOrCreateParticipant(db, cq.from, projectId);

  const ledgerEvent = await appendLedgerEvent(projectId, 'contribution_recorded', {
    participant_id: participant.id,
    contribution_type_id: session.contribution_type_id,
    amount: session.amount,
    unit: session.unit,
    description: session.description,
    source: 'telegram_wizard',
    telegram_user_id: cq.from.id,
  }, displayName(cq.from));

  const { data: contribution, error } = await db
    .from('contributions')
    .insert({
      project_id: projectId,
      participant_id: participant.id,
      contribution_type_id: session.contribution_type_id,
      amount: session.amount,
      unit: session.unit ?? null,
      description: session.description,
      date: new Date().toISOString().split('T')[0],
      ledger_event_id: ledgerEvent.id,
      telegram_chat_id: chatId,
    })
    .select('*, contribution_types(name)')
    .single();

  if (error || !contribution) {
    await sendTelegramMessage(chatId, '❌ שגיאה בשמירת התרומה. נסה שוב.');
    return;
  }

  // Delete the session
  await db.from('telegram_wizard_sessions').delete().eq('id', session.id);

  // Post group announcement and save its message_id
  const typeName = (contribution as { contribution_types?: { name: string } }).contribution_types?.name ?? 'כללי';
  const announcement = formatContributionAnnouncement({
    participantName: participant.name,
    telegramUsername: cq.from.username,
    typeName,
    description: session.description ?? undefined,
    amount: session.amount!,
    unit: session.unit ?? undefined,
    contributionUrl: contributionUrl(projectId, contribution.id),
  });

  const sentMsg = await sendTelegramMessage(chatId, announcement);

  await db
    .from('contributions')
    .update({ telegram_message_id: sentMsg.message_id })
    .eq('id', contribution.id);
}

// ─── Wizard: Cancel ──────────────────────────────────────────────────────────

async function handleCancel(
  cq: TelegramCallbackQuery,
  session: WizardSession,
  db: ReturnType<typeof createAdminClient>,
) {
  await db.from('telegram_wizard_sessions').delete().eq('id', session.id);
  await editMessageWithKeyboard(cq.message!.chat.id, cq.message!.message_id, '❌ הזנת התרומה בוטלה.', []);
  await answerCallbackQuery(cq.id, 'בוטל');
}

// ─── /link handler ───────────────────────────────────────────────────────────

async function handleLink(msg: TelegramMessage) {
  if (!msg.from) return;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActiveSession(
  db: ReturnType<typeof createAdminClient>,
  telegramUserId: number,
  chatId: number,
): Promise<WizardSession | null> {
  const { data } = await db
    .from('telegram_wizard_sessions')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .eq('telegram_chat_id', chatId)
    .gt('expires_at', new Date().toISOString())
    .single();

  return (data as WizardSession | null);
}

function chunkButtons<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function findOrCreateParticipant(
  db: ReturnType<typeof createAdminClient>,
  telegramUser: TelegramUser,
  projectId: string,
): Promise<{ id: string; name: string }> {
  const { data: linked } = await db
    .from('participant_telegram_accounts')
    .select('participant_id, participants(id, name)')
    .eq('telegram_user_id', telegramUser.id)
    .single();

  if (linked?.participant_id) {
    const p = (linked as unknown as { participants?: { id: string; name: string }[] }).participants;
    if (p?.[0]) return p[0];
  }

  const name = telegramUser.username
    ? `@${telegramUser.username}`
    : telegramUser.first_name;

  const { data: newParticipant, error } = await db
    .from('participants')
    .insert({ project_id: projectId, name })
    .select('id, name')
    .single();

  if (error || !newParticipant) throw new Error(`Failed to create participant: ${error?.message}`);

  await db.from('participant_telegram_accounts').insert({
    participant_id: newParticipant.id,
    telegram_user_id: telegramUser.id,
    telegram_username: telegramUser.username ?? null,
    telegram_first_name: telegramUser.first_name,
  });

  return newParticipant as { id: string; name: string };
}
