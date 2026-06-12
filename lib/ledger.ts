import { createHash } from 'crypto';
import type { LedgerEvent, LedgerEventType } from '@/types/domain';
import { createAdminClient } from './supabase';

// Build the canonical string that gets hashed for a ledger event.
// Deterministic: same inputs must always produce same output.
function buildHashInput(
  eventType: LedgerEventType,
  payload: Record<string, unknown>,
  createdAt: string,
  previousHash: string,
): string {
  return JSON.stringify({
    event_type: eventType,
    payload,
    created_at: createdAt,
    previous_hash: previousHash,
  });
}

export function computeHash(
  eventType: LedgerEventType,
  payload: Record<string, unknown>,
  createdAt: string,
  previousHash: string,
): string {
  const input = buildHashInput(eventType, payload, createdAt, previousHash);
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// Retrieve the most recent ledger event for a project to get its hash.
// Returns "GENESIS" for the very first event.
async function getLatestHash(projectId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db
    .from('ledger_events')
    .select('hash')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.hash ?? 'GENESIS';
}

// Append a new event to the ledger, linking it to the previous one.
export async function appendLedgerEvent(
  projectId: string,
  eventType: LedgerEventType,
  payload: Record<string, unknown>,
  createdBy?: string,
): Promise<LedgerEvent> {
  const db = createAdminClient();
  const previousHash = await getLatestHash(projectId);
  const createdAt = new Date().toISOString();
  const hash = computeHash(eventType, payload, createdAt, previousHash);

  const { data, error } = await db
    .from('ledger_events')
    .insert({
      project_id: projectId,
      event_type: eventType,
      payload,
      previous_hash: previousHash,
      hash,
      created_at: createdAt,
      created_by: createdBy ?? 'system',
    })
    .select()
    .single();

  if (error) throw new Error(`Ledger write failed: ${error.message}`);
  return data as LedgerEvent;
}

// Verify the integrity of the entire ledger for a project.
// Returns true if every hash in the chain is valid.
export async function verifyLedger(
  projectId: string,
): Promise<{ valid: boolean; brokenAt?: string; eventCount: number }> {
  const db = createAdminClient();
  const { data: events, error } = await db
    .from('ledger_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!events || events.length === 0) return { valid: true, eventCount: 0 };

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const expectedPreviousHash = i === 0 ? 'GENESIS' : events[i - 1].hash;

    if (ev.previous_hash !== expectedPreviousHash) {
      return { valid: false, brokenAt: ev.id, eventCount: events.length };
    }

    const expectedHash = computeHash(
      ev.event_type,
      ev.payload,
      ev.created_at,
      ev.previous_hash,
    );
    if (ev.hash !== expectedHash) {
      return { valid: false, brokenAt: ev.id, eventCount: events.length };
    }
  }

  return { valid: true, eventCount: events.length };
}
