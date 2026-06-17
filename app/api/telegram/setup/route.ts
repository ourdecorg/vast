export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { setWebhook, getWebhookInfo } from '@/lib/telegram';

// POST /api/telegram/setup  — register the webhook URL with Telegram.
// Call this once after deploying or after changing the domain.
// Requires NEXTAUTH_URL (or any env var) pointing to the public hostname.
export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set' },
      { status: 500 },
    );
  }

  // Derive public base URL: honour explicit override, fall back to request host
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const webhookUrl = `${base}/api/telegram/webhook`;

  try {
    await setWebhook(webhookUrl);
    return NextResponse.json({ ok: true, webhook_url: webhookUrl });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

// GET /api/telegram/setup  — check current webhook status.
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  try {
    const info = await getWebhookInfo();
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
