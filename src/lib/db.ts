// ---------------------------------------------------------------------------
// Project Scheduler — Dexie.js database schema & typed CRUD helpers
// ---------------------------------------------------------------------------

import Dexie, { type EntityTable } from 'dexie';
import type {
  Project,
  Party,
  Task,
  CalendarEvent,
  Meeting,
  AppSettings,
} from './types';
import {
  projectSchema,
  partySchema,
  taskSchema,
  calendarEventSchema,
  meetingSchema,
  appSettingsSchema,
} from './validators';

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------

export class SchedulerDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  parties!: EntityTable<Party, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  calendarEvents!: EntityTable<CalendarEvent, 'id'>;
  meetings!: EntityTable<Meeting, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('SchedulerDB');

    this.version(1).stores({
      projects: 'id, name, romanIndex, createdAt',
      parties: 'id, projectId, name, color',
      tasks: 'id, projectId, parentTaskId, order, start, end',
      calendarEvents: 'id, kind, start, end',
      meetings: 'id, projectId, start, end',
      settings: 'id',
    });
  }
}

// ---------------------------------------------------------------------------
// Lazy singleton — Dexie is imported but only instantiated client-side
// ---------------------------------------------------------------------------

let _db: SchedulerDB | null = null;

/** Returns the shared Dexie instance, creating it lazily on first call. */
export function getDb(): SchedulerDB {
  if (!_db) {
    _db = new SchedulerDB();
  }
  return _db;
}

/** Re-export for convenience — also lazy via getDb() */
export const db = new Proxy({} as SchedulerDB, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

// ---------------------------------------------------------------------------
// CRUD helpers – Projects
// ---------------------------------------------------------------------------

export async function getAllProjects(): Promise<Project[]> {
  return getDb().projects.toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return getDb().projects.get(id);
}

export async function createProject(data: Project): Promise<string> {
  projectSchema.parse(data);
  await getDb().projects.add(data);
  return data.id;
}

export async function updateProject(
  id: string,
  data: Partial<Project>,
): Promise<void> {
  await getDb().projects.update(id, data);
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade: remove parties, tasks, meetings belonging to this project
  await getDb().parties.where('projectId').equals(id).delete();
  await getDb().tasks.where('projectId').equals(id).delete();
  await getDb().meetings.where('projectId').equals(id).delete();
  await getDb().projects.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Parties
// ---------------------------------------------------------------------------

/** Returns ALL parties across all projects */
export async function getAllParties(): Promise<Party[]> {
  return getDb().parties.toArray();
}

export async function getParties(projectId: string): Promise<Party[]> {
  return getDb().parties.where('projectId').equals(projectId).toArray();
}

export async function createParty(data: Party): Promise<string> {
  partySchema.parse(data);
  await getDb().parties.add(data);
  return data.id;
}

export async function updateParty(
  id: string,
  data: Partial<Party>,
): Promise<void> {
  await getDb().parties.update(id, data);
}

export async function deleteParty(id: string): Promise<void> {
  await getDb().parties.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Tasks
// ---------------------------------------------------------------------------

/** Returns ALL tasks across all projects */
export async function getAllTasks(): Promise<Task[]> {
  return getDb().tasks.toArray();
}

export async function getTasks(projectId: string): Promise<Task[]> {
  return getDb().tasks.where('projectId').equals(projectId).toArray();
}

export async function getSubTasks(parentTaskId: string): Promise<Task[]> {
  return getDb().tasks.where('parentTaskId').equals(parentTaskId).toArray();
}

export async function createTask(data: Task): Promise<string> {
  taskSchema.parse(data);
  await getDb().tasks.add(data);
  return data.id;
}

export async function updateTask(
  id: string,
  data: Partial<Task>,
): Promise<void> {
  await getDb().tasks.update(id, data);
}

export async function deleteTask(id: string): Promise<void> {
  // Delete sub-tasks first
  await getDb().tasks.where('parentTaskId').equals(id).delete();
  await getDb().tasks.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Calendar Events
// ---------------------------------------------------------------------------

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return getDb().calendarEvents.toArray();
}

export async function createCalendarEvent(
  data: CalendarEvent,
): Promise<string> {
  calendarEventSchema.parse(data);
  await getDb().calendarEvents.add(data);
  return data.id;
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent>,
): Promise<void> {
  await getDb().calendarEvents.update(id, data);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await getDb().calendarEvents.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Meetings
// ---------------------------------------------------------------------------

export async function getMeetings(projectId: string): Promise<Meeting[]> {
  return getDb().meetings.where('projectId').equals(projectId).toArray();
}

export async function createMeeting(data: Meeting): Promise<string> {
  meetingSchema.parse(data);
  await getDb().meetings.add(data);
  return data.id;
}

export async function updateMeeting(
  id: string,
  data: Partial<Meeting>,
): Promise<void> {
  await getDb().meetings.update(id, data);
}

export async function deleteMeeting(id: string): Promise<void> {
  await getDb().meetings.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Settings (singleton)
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<AppSettings | undefined> {
  return getDb().settings.get('singleton');
}

export async function updateSettings(
  data: Partial<AppSettings>,
): Promise<void> {
  const existing = await getSettings();
  if (existing) {
    await getDb().settings.update('singleton', data);
  } else {
    const defaults: AppSettings = {
      id: 'singleton',
      activeProjectId: null,
      zoomLevel: 'day',
      weekendsHidden: true,
    };
    appSettingsSchema.parse({ ...defaults, ...data });
    await getDb().settings.add({ ...defaults, ...data } as AppSettings);
  }
}
