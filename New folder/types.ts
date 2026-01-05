
export enum StaffCategory {
  Permanent = 'Block Integrator / Federation Coordinator',
  Contractual = 'Contractual',
  Regional = 'Regional',
  MIS = 'MIS',
  PSDB = 'PSDB',
  Associate = 'Associate',
  Accountant = 'Accountant'
}

export type StaffStatus = 'Working' | 'Not Working' | 'Long Leave';

export interface Location {
  id: string;
  name: string;
  excludedFromSchedule?: boolean;
}

export interface Staff {
  id: string;
  name: string;
  locationId: string;
  additionalLocationIds?: string[];
  category: StaffCategory;
  email?: string; // Kept for backward compatibility if needed, but primary is meetId
  meetId: string;
  status: StaffStatus;
}

export interface Topic {
  id: string;
  name: string;
}

export interface Thirukkural {
  id: string;
  topicId: string;
  verse: string;
}

export interface SharingConfig {
  day: string; // Monday, Tuesday...
  locationIds: string[];
}

export interface PostponedDate {
  originalDate: string;
  newDate: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  staffId: string;
  meetLink: string;
  inTime: string;
  outTime: string;
  percentage: number;
  unknownName?: string;
}

export interface ScheduleRow {
  date: string;
  day: string;
  topic: string;
  thirukkural: string;
  sharing1Location: string;
  subRowLocation: string;
  sharing2Staff: string;
  sharing3Staff: string;
  sharing4Staff: string;
  isFirstSubRow: boolean;
  subRowSpan: number;
}
