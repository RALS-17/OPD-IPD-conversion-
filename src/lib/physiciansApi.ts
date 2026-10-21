import type { Physician } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export function fromPhysicianRow(row: Record<string, unknown>): Physician {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    department: String(row.department ?? ''),
    active: row.active !== false,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchPhysicians(): Promise<Physician[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('physicians')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => fromPhysicianRow(r as Record<string, unknown>));
}

export async function insertPhysician(name: string, department: string): Promise<Physician> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('physicians')
    .insert({ name: name.trim(), department: department.trim(), active: true })
    .select()
    .single();
  if (error) throw error;
  return fromPhysicianRow(data as Record<string, unknown>);
}

export async function updatePhysician(
  id: string,
  fields: { name?: string; department?: string; active?: boolean }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const payload: Record<string, unknown> = {};
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.department !== undefined) payload.department = fields.department.trim();
  if (fields.active !== undefined) payload.active = fields.active;
  const { error } = await supabase.from('physicians').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deletePhysician(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  // Hard delete
  const { error } = await supabase.from('physicians').delete().eq('id', id);
  if (error) throw error;
}

export { isSupabaseConfigured };
