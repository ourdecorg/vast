export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';
import { sendTelegramMessage, formatReactionAnnouncement } from '@/lib/telegram';

type Params = { params: Promise<{ id: string; contributionId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contributionId } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('contribution_reactions')
    .select('*')
    .eq('contribution_id', contributionId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contributionId } = await params;
  const body = await req.json();
  const { reaction_type, emoji, reply_text } = body;

  if (!['emoji', 'reply'].includes(reaction_type)) {
    return NextResponse.json({ error: 'reaction_type must be emoji or reply' }, { status: 400 });
  }
  if (reaction_type === 'emoji' && !emoji) {
    return NextResponse.json({ error: 'emoji required' }, { status: 400 });
  }
  if (reaction_type === 'reply' && !reply_text?.trim()) {
    return NextResponse.json({ error: 'reply_text required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('contribution_reactions')
    .insert({
      contribution_id: contributionId,
      reaction_type,
      emoji:      reaction_type === 'emoji' ? emoji : null,
      reply_text: reaction_type === 'reply' ? reply_text.trim() : null,
      web_user_email: user.email,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reply to the Telegram message for this contribution (fire-and-forget)
  notifyReactionToTelegram(db, contributionId, data, user.email).catch(err =>
    console.error('[reactions] Telegram notification failed:', err),
  );

  return NextResponse.json(data, { status: 201 });
}

async function notifyReactionToTelegram(
  db: ReturnType<typeof createAdminClient>,
  contributionId: string,
  reaction: { reaction_type: string; emoji?: string | null; reply_text?: string | null },
  authorEmail: string,
) {
  const { data: contrib } = await db
    .from('contributions')
    .select('telegram_message_id, telegram_chat_id, participants(name)')
    .eq('id', contributionId)
    .single();

  const chatId = contrib?.telegram_chat_id as number | null;
  const messageId = contrib?.telegram_message_id as number | null;
  if (!chatId || !messageId) return;

  const participants = contrib?.participants as { name: string }[] | { name: string } | null | undefined;
  const participantName = (Array.isArray(participants) ? participants[0]?.name : participants?.name) ?? '—';

  const text = formatReactionAnnouncement({
    authorEmail,
    contributionParticipantName: participantName,
    reactionType: reaction.reaction_type as 'emoji' | 'reply',
    emoji: reaction.emoji,
    replyText: reaction.reply_text,
  });

  await sendTelegramMessage(chatId, text, { replyToMessageId: messageId });
}
