export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getUserFromRequest, getProjectRole } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/members
// PROJECT_ADMIN or OWNER — list members of the project.
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const role = await getProjectRole(user.id, projectId);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = createAdminClient();
  const { data, error } = await db
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/projects/[id]/members
// PROJECT_ADMIN or OWNER — add a user to the project.
// Body: { email: string, role: 'PROJECT_ADMIN' | 'USER' }
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const role = await getProjectRole(user.id, projectId);
  if (role !== 'PROJECT_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, role: memberRole = 'USER' } = body;
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  if (!['PROJECT_ADMIN', 'USER'].includes(memberRole)) {
    return NextResponse.json({ error: 'role must be PROJECT_ADMIN or USER' }, { status: 400 });
  }

  const db = createAdminClient();

  // Resolve the email to a Supabase user ID
  const { data: authUsers, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const target = authUsers.users.find((u) => u.email === email);
  if (!target) {
    return NextResponse.json(
      { error: `No account found for ${email}. The user must sign in at least once first.` },
      { status: 404 },
    );
  }

  const { data, error } = await db
    .from('project_members')
    .upsert(
      { project_id: projectId, user_id: target.id, email, role: memberRole, created_by: user.email },
      { onConflict: 'project_id,user_id' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/projects/[id]/members
// PROJECT_ADMIN or OWNER — remove a user from the project.
// Body: { user_id: string }
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const role = await getProjectRole(user.id, projectId);
  if (role !== 'PROJECT_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { user_id } = body;
  if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Member removed.' });
}
