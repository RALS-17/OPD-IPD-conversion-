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
  actuallyAdmitted: YesNo;
  dateOfAdmission: string;
  timeOfAdmission: string;
  admittingPhysician: string;
  remarks: string;
  createdAt: string;
}

export interface Physician {
  id: string;
  name: string;
  department: string;
  active: boolean;
  createdAt: string;
}

export interface PhysicianStats {
  physician: string;
  totalOpdConsults: number;
  opdAdvisedAdmission: number;
  actualAdmissionsFromOpd: number;
  conversionRate: number;
  totalAdmissions: number;
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
  'Internal Medicine',
  'Orthopedics',
  'General Surgery',
  'Obstetrics & Gynecology',
  'Pulmonology',
  'Pediatrics',
  'Emergency Medicine',
  'Cardiology',
  'Neurology',
  'Family Medicine',
] as const;
