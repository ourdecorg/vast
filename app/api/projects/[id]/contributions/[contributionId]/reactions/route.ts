export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

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
  return NextResponse.json(data, { status: 201 });
}
