import { supabase, isSupabaseConfigured } from './supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'export' | 'clear';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  summary: string;
  actorName: string;
  actorEmail: string;
  createdAt: string;
}

const LOCAL_KEY = 'globalcare_audit_v1';

function fromRow(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id),
    action: row.action as AuditAction,
    entity: String(row.entity ?? 'admission'),
    entityId: String(row.entity_id ?? ''),
    summary: String(row.summary ?? ''),
    actorName: String(row.actor_name ?? ''),
    actorEmail: String(row.actor_email ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function writeAudit(entry: {
  action: AuditAction;
  entity?: string;
  entityId?: string;
  summary: string;
  actorName?: string;
  actorEmail?: string;
}): Promise<void> {
  const payload = {
    action: entry.action,
    entity: entry.entity || 'admission',
    entity_id: entry.entityId || '',
    summary: entry.summary,
    actor_name: entry.actorName || '',
    actor_email: entry.actorEmail || '',
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('audit_logs').insert(payload);
      return;
    } catch (e) {
      console.error('audit supabase failed', e);
    }
  }

  const local: AuditEntry = {
    id: crypto.randomUUID(),
    action: entry.action,
    entity: payload.entity,
    entityId: payload.entity_id,
    summary: payload.summary,
    actorName: payload.actor_name,
    actorEmail: payload.actor_email,
    createdAt: new Date().toISOString(),
  };
  try {
    const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as AuditEntry[];
    localStorage.setItem(LOCAL_KEY, JSON.stringify([local, ...prev].slice(0, 500)));
  } catch {
    /* ignore */
  }
}

export async function fetchAuditLogs(limit = 100): Promise<AuditEntry[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((r) => fromRow(r as Record<string, unknown>));
    } catch (e) {
      console.error(e);
    }
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as AuditEntry[];
  } catch {
    return [];
  }
}
