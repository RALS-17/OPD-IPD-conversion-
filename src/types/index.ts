export type SourceOfAdmission = 'ER' | 'OPD' | 'Direct';
export type OldNew = 'Old' | 'New';
export type HhoCash = 'HHO' | 'CASH';
export type YesNo = 'Yes' | 'No';
export type PatientType = 'Private' | 'Walk-in';

export type UserRole = 'admin' | 'staff' | 'doctor';

export interface Admission {
  id: string;
  patientName: string;
  address: string;
  oldNew: OldNew;
  hhoCash: HhoCash;
  source: SourceOfAdmission;
  patientType: PatientType;
  chiefComplaint: string;
  diagnosis: string;
  advisedForAdmission: YesNo;
  opdAttendingPhysician: string;
  /** Old/New relative to the OPD attending physician for this visit */
  opdPatientStatus: OldNew;
  actuallyAdmitted: YesNo;
  dateOfAdmission: string;
  timeOfAdmission: string;
  admittingPhysician: string;
  housePhysician: string;
  remarks: string;
  createdAt: string;
}

export type PhysicianStaffType = 'Active' | 'Visiting' | 'House Physician';

export interface Physician {
  id: string;
  name: string;
  department: string;
  /** Roster category: Active staff vs Visiting */
  staffType: PhysicianStaffType;
  specialization: string;
  subSpecialization: string;
  /** Soft-delete / enabled flag (not the same as Active vs Visiting) */
  active: boolean;
  createdAt: string;
}

export interface PhysicianWriteFields {
  name: string;
  department: string;
  staffType: PhysicianStaffType;
  specialization: string;
  subSpecialization: string;
}

export interface PhysicianStats {
  physician: string;
  totalOpdConsults: number;
  opdAdvisedAdmission: number;
  actualAdmissionsFromOpd: number;
  conversionRate: number;
  totalAdmissions: number;
  /** Patient mix: Private / Walk-in × HMO / CASH (counted from records or daily entries) */
  privateHmo: number;
  privateCash: number;
  walkInHmo: number;
  walkInCash: number;
  /** Total OPD before daily entries were applied (Admission Log count) */
  systemOpdConsults?: number;
  /** True when the numbers come from manual daily entries */
  isManualOpd?: boolean;
}

export interface RankedItem {
  name: string;
  count: number;
}

export type Page =
  | 'dashboard'
  | 'admission-log'
  | 'physician-summary'
  | 'physicians'
  | 'settings';

export type KpiMode = 'demo' | 'live';

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  hospitalName: string;
  branch: string;
  adminName: string;
  adminRole: string;
  targetConversion: number;
  goodThreshold: number;
  averageThreshold: number;
  kpiMode: KpiMode;
  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  hospitalName: 'Global Care',
  branch: 'Canlubang',
  adminName: 'Dr. Ananya Sharma',
  adminRole: 'Administrator',
  targetConversion: 30,
  goodThreshold: 30,
  averageThreshold: 15,
  kpiMode: 'live',
  theme: 'light',
};

export const DEPARTMENTS = [
  'Anesthesiology',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Pediatrics',
  'Surgery',
  'Dentistry',
  'Rehabilitation Medicine',
  'Occupational and Family Medicine',
  'Radiology',
  'Pathology',
  'Emergency Medicine',
] as const;

/** Departments used only for House Physician roster */
export const HOUSE_PHYSICIAN_DEPARTMENTS = [
  'ROD',
  'IM JCON',
  'PEDIA JCON',
  'OB JCON',
] as const;

export const PHYSICIAN_STAFF_TYPES: PhysicianStaffType[] = ['Active', 'Visiting', 'House Physician'];

/** Clinical roster only (excludes House Physician) */
export const CLINICAL_STAFF_TYPES: PhysicianStaffType[] = ['Active', 'Visiting'];
