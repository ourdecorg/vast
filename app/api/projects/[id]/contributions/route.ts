export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { appendLedgerEvent } from '@/lib/ledger';
import { getUserFromRequest } from '@/lib/auth';
import { sendTelegramMessage, formatContributionAnnouncement, contributionUrl } from '@/lib/telegram';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = createAdminClient();

  const { data, error } = await db
    .from('contributions')
    .select(`
      *,
      participants ( id, name ),
      contribution_types ( id, name, category, unit, is_monetary )
    `)
    .eq('project_id', id)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const body = await req.json();
  const { participant_id, contribution_type_id, amount, unit, description, date } = body;

  if (!participant_id || !contribution_type_id || amount == null) {
    return NextResponse.json(
      { error: 'participant_id, contribution_type_id, and amount are required' },
      { status: 400 },
    );
  }

  const db = createAdminClient();

  const ledgerEvent = await appendLedgerEvent(projectId, 'contribution_recorded', {
    participant_id, contribution_type_id, amount, unit, description, date,
  }, user.email);

  const { data, error } = await db
    .from('contributions')
    .insert({
      project_id: projectId,
      participant_id,
      contribution_type_id,
      amount,
      unit,
      description,
      date: date ?? new Date().toISOString().split('T')[0],
      ledger_event_id: ledgerEvent.id,
      created_by: user.email,
    })
    .select(`
      *,
      participants ( id, name ),
      contribution_types ( id, name, category, unit, is_monetary )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all Telegram chats that are active for this project (fire-and-forget)
  notifyContributionToChats(db, projectId, data, user.email).catch(err =>
    console.error('[contributions] Telegram notification failed:', err),
  );

  return NextResponse.json(data, { status: 201 });
}

async function notifyContributionToChats(
  db: ReturnType<typeof createAdminClient>,
  projectId: string,
  contribution: { id: string; amount: number; unit?: string | null; description?: string | null; participants?: { name: string } | null; contribution_types?: { name: string } | null },
  addedByEmail: string,
) {
  const { data: rows } = await db
    .from('contributions')
    .select('telegram_chat_id')
    .eq('project_id', projectId)
    .not('telegram_chat_id', 'is', null)
    .neq('id', contribution.id);

  const chatIds = [...new Set((rows ?? []).map(r => r.telegram_chat_id as number).filter(Boolean))];
  if (!chatIds.length) return;

  const message = formatContributionAnnouncement({
    participantName: contribution.participants?.name ?? '—',
    typeName: contribution.contribution_types?.name ?? 'כללי',
    description: contribution.description ?? undefined,
    amount: Number(contribution.amount),
    unit: contribution.unit ?? undefined,
    addedByEmail,
    contributionUrl: contributionUrl(projectId, contribution.id),
  });

  for (const chatId of chatIds) {
    try {
      const sent = await sendTelegramMessage(chatId, message);
      // Save message_id on the first chat so Telegram reactions can be linked back
      await db
        .from('contributions')
        .update({ telegram_message_id: sent.message_id, telegram_chat_id: chatId })
        .eq('id', contribution.id)
        .is('telegram_message_id', null);
    } catch (err) {
      console.error(`[contributions] Failed to notify chat ${chatId}:`, err);
    }
  }
}
