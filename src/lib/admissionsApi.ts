import type { Admission } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

/** Map DB row (snake_case) → app Admission (camelCase) */
export function fromRow(row: Record<string, unknown>): Admission {
  const timeRaw = row.time_of_admission;
  let time = '';
  if (typeof timeRaw === 'string') {
    time = timeRaw.slice(0, 5);
  }
  return {
    id: String(row.id),
    patientName: String(row.patient_name ?? ''),
    address: String(row.address ?? ''),
    oldNew: (row.old_new as Admission['oldNew']) || 'New',
    hhoCash: (row.hho_cash as Admission['hhoCash']) || 'HHO',
    source: (row.source as Admission['source']) || 'OPD',
    patientType: (row.patient_type as Admission['patientType']) || 'Private',
    chiefComplaint: String(row.chief_complaint ?? ''),
    diagnosis: String(row.diagnosis ?? ''),
    advisedForAdmission: (row.advised_for_admission as Admission['advisedForAdmission']) || 'No',
    opdAttendingPhysician: String(row.opd_attending_physician ?? ''),
    actuallyAdmitted: (row.actually_admitted as Admission['actuallyAdmitted']) || 'No',
    dateOfAdmission: row.date_of_admission ? String(row.date_of_admission).slice(0, 10) : '',
    timeOfAdmission: time,
    admittingPhysician: String(row.admitting_physician ?? ''),
    remarks: String(row.remarks ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/** Map app Admission → DB insert/update payload */
export function toRow(a: Partial<Admission>) {
  return {
    patient_name: a.patientName ?? '',
    address: a.address ?? '',
    old_new: a.oldNew ?? 'New',
    hho_cash: a.hhoCash ?? 'HHO',
    source: a.source ?? 'OPD',
    patient_type: a.patientType ?? 'Private',
    chief_complaint: a.chiefComplaint ?? '',
    diagnosis: a.diagnosis ?? '',
    advised_for_admission: a.advisedForAdmission ?? 'No',
    opd_attending_physician: a.opdAttendingPhysician ?? '',
    actually_admitted: a.actuallyAdmitted ?? 'No',
    date_of_admission: a.dateOfAdmission || null,
    time_of_admission: a.timeOfAdmission || null,
    admitting_physician: a.admittingPhysician ?? '',
    remarks: a.remarks ?? '',
  };
}

export async function fetchAdmissions(): Promise<Admission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('admissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => fromRow(row as Record<string, unknown>));
}

export async function insertAdmission(
  data: Omit<Admission, 'id' | 'createdAt'>
): Promise<Admission> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: row, error } = await supabase
    .from('admissions')
    .insert(toRow(data))
    .select()
    .single();
  if (error) throw error;
  return fromRow(row as Record<string, unknown>);
}

export async function updateAdmissionRow(
  id: string,
  data: Partial<Admission>
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('admissions').update(toRow(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteAdmissionRow(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('admissions').delete().eq('id', id);
  if (error) throw error;
}

export { isSupabaseConfigured };
