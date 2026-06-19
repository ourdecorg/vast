import { getSupabaseClient } from './supabase';

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...init, headers });
}
