export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/auth';

// Allows the first authenticated user to claim the OWNER role.
// Only succeeds when no OWNER exists in the system.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();

  const { count } = await db
    .from('user_roles')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'An OWNER already exists. Contact them to grant you access.' },
      { status: 403 },
    );
  }

  const { error } = await db
    .from('user_roles')
    .insert({ user_id: user.id, role: 'OWNER', created_by: user.email });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: `${user.email} is now OWNER.` }, { status: 201 });
}
