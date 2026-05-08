// ---------------------------------------------------------------------------
// Project Scheduler — Core TypeScript types
// ---------------------------------------------------------------------------

/** 12-character nanoid primary key */
export type ID = string;

/** ISO-8601 date string (YYYY-MM-DD) */
export type ISODate = string;

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  /** Recurrence end date (optional – last occurrence) */
  endDate?: ISODate | null;
  /** Maximum number of occurrences (optional – overrides endDate if both set?) */
  count?: number | null;
  /** Dates on which an instance is removed (ISO dates) */
  exceptions?: ISODate[] | null;
  /** Replacements for specific dates */
  overrides?: Record<ISODate, { start?: ISODate; end?: ISODate; title?: string }> | null;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface Project {
  id: ID;
  name: string;
  /** Roman numeral index (e.g. "I", "II", "III") */
  romanIndex: string;
  createdAt: ISODate;
  parties: Party[];
}

// ---------------------------------------------------------------------------
// Party  (stakeholder / party colour)
// ---------------------------------------------------------------------------

export interface Party {
  id: ID;
  projectId: ID;
  name: string;
  /** Hex colour string, e.g. "#ff6633" */
  color: string;
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export interface Task {
  id: ID;
  projectId: ID;
  /** Optional reference to a parent task (for sub-tasks) */
  parentTaskId?: ID | null;
  title: string;
  /** Start date (nullable = unscheduled) */
  start?: ISODate | null;
  /** End date (nullable = unscheduled) */
  end?: ISODate | null;
  /** Party responsible */
  partyId?: ID | null;
  /** Display ordering index */
  order: number;
  /** Optional notes */
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Calendar Event  (holidays, out-of-office, blackout)
// ---------------------------------------------------------------------------

export type CalendarEventKind = 'holiday' | 'ooo' | 'blackout';

export interface CalendarEvent {
  id: ID;
  kind: CalendarEventKind;
  title: string;
  start: ISODate;
  end: ISODate;
  recurrence?: Recurrence | null;
  /** Display colour hint */
  color?: string | null;
}

// ---------------------------------------------------------------------------
// Meeting
// ---------------------------------------------------------------------------

export interface Meeting {
  id: ID;
  projectId: ID;
  title: string;
  start: ISODate;
  end: ISODate;
  recurrence?: Recurrence | null;
  /** Optional party organiser */
  partyId?: ID | null;
}

// ---------------------------------------------------------------------------
// App Settings  (singleton)
// ---------------------------------------------------------------------------

export interface AppSettings {
  /** Always 'singleton' */
  id: 'singleton';
  activeProjectId?: ID | null;
  zoomLevel: 'day';
  weekendsHidden: boolean;
}
