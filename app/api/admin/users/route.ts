export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest, getSystemRole } from '@/lib/auth';

// GET /api/admin/users
// OWNER only — list all auth users with their system role.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getSystemRole(user.id);
  if (role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = createAdminClient();

  const { data: authUsers, error } = await db.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: ownerRows } = await db.from('user_roles').select('user_id');
  const ownerIds = new Set((ownerRows ?? []).map((r) => r.user_id));

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    system_role: ownerIds.has(u.id) ? 'OWNER' : 'USER',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));

  return NextResponse.json(users);
}

// POST /api/admin/users
// OWNER only — grant or revoke OWNER role for a user.
// Body: { user_id: string, action: 'grant_owner' | 'revoke_owner' }
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getSystemRole(user.id);
  if (role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { user_id, action } = body;
  if (!user_id || !action) {
    return NextResponse.json({ error: 'user_id and action are required' }, { status: 400 });
  }

  const db = createAdminClient();

  if (action === 'grant_owner') {
    const { error } = await db
      .from('user_roles')
      .upsert({ user_id, role: 'OWNER', created_by: user.email }, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'OWNER role granted.' });
  }

  if (action === 'revoke_owner') {
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Cannot revoke your own OWNER role.' }, { status: 400 });
    }
    const { error } = await db.from('user_roles').delete().eq('user_id', user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: 'OWNER role revoked.' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
