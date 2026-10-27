export type TimeClockEntryType = "IN" | "BREAK_START" | "BREAK_END" | "OUT";

export type TimeClockStatus = "WORKING" | "ON_BREAK" | "OFF";

export interface TimeClockActor {
  id: string;
  name: string;
}

export interface TimeClockEntry {
  id: string;
  userId: string;
  type: TimeClockEntryType;
  punchedAt: string;
  isManual: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TimeClockActor | null;
  updatedBy: TimeClockActor | null;
}

export interface TimeClockDay {
  date: string;
  workedMinutes: number;
  breakMinutes: number;
  isOpen: boolean;
  entries: TimeClockEntry[];
}

export interface TimeClockRange {
  from: string;
  to: string;
}

export interface TimeClockRangeQuery {
  from?: string;
  to?: string;
}

export interface MyTimeClock {
  range: TimeClockRange;
  allowedTypes: TimeClockEntryType[];
  totalMinutes: number;
  days: TimeClockDay[];
}

export interface TeamTimeClockMember {
  user: { id: string; name: string; avatarUrl: string | null };
  totalMinutes: number;
  status: TimeClockStatus;
  days: TimeClockDay[];
}

export interface TeamTimeClock {
  range: TimeClockRange;
  users: TeamTimeClockMember[];
}

export interface TeamTimeClockQuery extends TimeClockRangeQuery {
  userId?: string;
}

export interface CreateManualTimeClockEntryInput {
  userId: string;
  type: TimeClockEntryType;
  punchedAt: string;
  note: string;
}

export interface UpdateTimeClockEntryInput {
  type?: TimeClockEntryType;
  punchedAt?: string;
  note: string;
}
