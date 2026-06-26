export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getSystemRole } from '@/lib/auth';

// Lightweight endpoint — returns only the current user's system role.
// Used by AppShell to decide whether to show the Admin link.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const system_role = await getSystemRole(user.id);
  return NextResponse.json({ system_role });
}
