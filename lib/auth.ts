import { createAdminClient } from './supabase';
import type { NextRequest } from 'next/server';

export type AuthUser = { id: string; email: string };
export type SystemRole = 'OWNER' | 'USER';
export type ProjectRole = 'PROJECT_ADMIN' | 'USER';

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  const db = createAdminClient();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;

  return { id: user.id, email: user.email ?? user.id };
}

export async function getSystemRole(userId: string): Promise<SystemRole> {
  const db = createAdminClient();
  const { data } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return data ? 'OWNER' : 'USER';
}

// Returns the effective project role for a user.
// OWNERs are treated as PROJECT_ADMIN on every project.
// Returns null if the user has no membership in the project.
export async function getProjectRole(
  userId: string,
  projectId: string,
): Promise<ProjectRole | null> {
  const sysRole = await getSystemRole(userId);
  if (sysRole === 'OWNER') return 'PROJECT_ADMIN';

  const db = createAdminClient();
  const { data } = await db
    .from('project_members')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  return data ? (data.role as ProjectRole) : null;
}

// Returns all project IDs the user is a member of.
// OWNERs get null (meaning: access to everything — no filter needed).
export async function getUserProjectIds(userId: string): Promise<string[] | null> {
  const sysRole = await getSystemRole(userId);
  if (sysRole === 'OWNER') return null;

  const db = createAdminClient();
  const { data } = await db
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  return (data ?? []).map((r) => r.project_id);
}
