import { createAdminClient } from './supabase';
import type { NextRequest } from 'next/server';

export type AuthUser = { id: string; email: string };

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  const db = createAdminClient();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;

  return { id: user.id, email: user.email ?? user.id };
}
