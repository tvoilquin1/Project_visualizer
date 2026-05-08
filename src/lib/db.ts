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

/** Shared singleton database instance */
export const db = new SchedulerDB();

// ---------------------------------------------------------------------------
// CRUD helpers – Projects
// ---------------------------------------------------------------------------

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function createProject(data: Project): Promise<string> {
  projectSchema.parse(data);
  await db.projects.add(data);
  return data.id;
}

export async function updateProject(
  id: string,
  data: Partial<Project>,
): Promise<void> {
  await db.projects.update(id, data);
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade: remove parties, tasks, meetings belonging to this project
  await db.parties.where('projectId').equals(id).delete();
  await db.tasks.where('projectId').equals(id).delete();
  await db.meetings.where('projectId').equals(id).delete();
  await db.projects.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Parties
// ---------------------------------------------------------------------------

export async function getParties(projectId: string): Promise<Party[]> {
  return db.parties.where('projectId').equals(projectId).toArray();
}

export async function createParty(data: Party): Promise<string> {
  partySchema.parse(data);
  await db.parties.add(data);
  return data.id;
}

export async function updateParty(
  id: string,
  data: Partial<Party>,
): Promise<void> {
  await db.parties.update(id, data);
}

export async function deleteParty(id: string): Promise<void> {
  await db.parties.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Tasks
// ---------------------------------------------------------------------------

export async function getTasks(projectId: string): Promise<Task[]> {
  return db.tasks.where('projectId').equals(projectId).toArray();
}

export async function getSubTasks(parentTaskId: string): Promise<Task[]> {
  return db.tasks.where('parentTaskId').equals(parentTaskId).toArray();
}

export async function createTask(data: Task): Promise<string> {
  taskSchema.parse(data);
  await db.tasks.add(data);
  return data.id;
}

export async function updateTask(
  id: string,
  data: Partial<Task>,
): Promise<void> {
  await db.tasks.update(id, data);
}

export async function deleteTask(id: string): Promise<void> {
  // Delete sub-tasks first
  await db.tasks.where('parentTaskId').equals(id).delete();
  await db.tasks.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Calendar Events
// ---------------------------------------------------------------------------

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return db.calendarEvents.toArray();
}

export async function createCalendarEvent(
  data: CalendarEvent,
): Promise<string> {
  calendarEventSchema.parse(data);
  await db.calendarEvents.add(data);
  return data.id;
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent>,
): Promise<void> {
  await db.calendarEvents.update(id, data);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await db.calendarEvents.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Meetings
// ---------------------------------------------------------------------------

export async function getMeetings(projectId: string): Promise<Meeting[]> {
  return db.meetings.where('projectId').equals(projectId).toArray();
}

export async function createMeeting(data: Meeting): Promise<string> {
  meetingSchema.parse(data);
  await db.meetings.add(data);
  return data.id;
}

export async function updateMeeting(
  id: string,
  data: Partial<Meeting>,
): Promise<void> {
  await db.meetings.update(id, data);
}

export async function deleteMeeting(id: string): Promise<void> {
  await db.meetings.delete(id);
}

// ---------------------------------------------------------------------------
// CRUD helpers – Settings (singleton)
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<AppSettings | undefined> {
  return db.settings.get('singleton');
}

export async function updateSettings(
  data: Partial<AppSettings>,
): Promise<void> {
  const existing = await getSettings();
  if (existing) {
    await db.settings.update('singleton', data);
  } else {
    const defaults: AppSettings = {
      id: 'singleton',
      activeProjectId: null,
      zoomLevel: 'day',
      weekendsHidden: true,
    };
    appSettingsSchema.parse({ ...defaults, ...data });
    await db.settings.add({ ...defaults, ...data } as AppSettings);
  }
}
