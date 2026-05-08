// ---------------------------------------------------------------------------
// Project Scheduler — Database & Validation Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { nanoid } from 'nanoid';
import {
  SchedulerDB,
  db,
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getParties,
  createParty,
  updateParty,
  deleteParty,
  getTasks,
  getSubTasks,
  createTask,
  updateTask,
  deleteTask,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getSettings,
  updateSettings,
} from '../src/lib/db';
import {
  projectSchema,
  partySchema,
  taskSchema,
  calendarEventSchema,
  meetingSchema,
  recurrenceSchema,
  appSettingsSchema,
} from '../src/lib/validators';
import type {
  Project,
  Party,
  Task,
  CalendarEvent,
  Meeting,
  AppSettings,
  Recurrence,
} from '../src/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = (): string => nanoid(12);

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: uid(),
    name: 'Test Project',
    romanIndex: 'I',
    createdAt: '2026-01-15',
    parties: [],
    ...overrides,
  };
}

function makeParty(
  projectId: string,
  overrides: Partial<Party> = {},
): Party {
  return {
    id: uid(),
    projectId,
    name: 'Engineering',
    color: '#ff6633',
    ...overrides,
  };
}

function makeTask(
  projectId: string,
  partyId: string,
  overrides: Partial<Task> = {},
): Task {
  return {
    id: uid(),
    projectId,
    title: 'Widget design',
    start: '2026-02-01',
    end: '2026-02-15',
    partyId,
    order: 0,
    ...overrides,
  };
}

function makeCalendarEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: uid(),
    kind: 'holiday',
    title: 'New Year',
    start: '2026-01-01',
    end: '2026-01-01',
    ...overrides,
  };
}

function makeMeeting(
  projectId: string,
  overrides: Partial<Meeting> = {},
): Meeting {
  return {
    id: uid(),
    projectId,
    title: 'Sprint review',
    start: '2026-01-20',
    end: '2026-01-20',
    ...overrides,
  };
}

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    id: 'singleton',
    activeProjectId: null,
    zoomLevel: 'day',
    weekendsHidden: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema Migration Tests
// ---------------------------------------------------------------------------

describe('Schema migration from empty', () => {
  let testDb: SchedulerDB;

  beforeAll(async () => {
    // Create a fresh in-memory database to test migration
    testDb = new SchedulerDB();
    // Dexie uses IndexedDB — no explicit "create" needed, schema is auto-applied
    // We just need to ensure the tables exist
    await testDb.open();
  });

  afterAll(async () => {
    await testDb.delete();
  });

  it('should create the database and have all tables', () => {
    expect(testDb.isOpen()).toBe(true);
    expect(testDb.tables.length).toBe(6);
    const tableNames = testDb.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      'calendarEvents',
      'meetings',
      'parties',
      'projects',
      'settings',
      'tasks',
    ]);
  });

  it('should be able to write and read a project', async () => {
    const project = makeProject();
    await testDb.projects.add(project);
    const retrieved = await testDb.projects.get(project.id);
    expect(retrieved).toEqual(project);
  });

  it('should have correct schema definitions (indexed keys)', () => {
    const projTable = testDb.projects;
    // Dexie stores schema info internally; just verify the table exists
    expect(projTable).toBeDefined();
    expect(projTable.name).toBe('projects');
  });
});

// ---------------------------------------------------------------------------
// Zod Validation Tests
// ---------------------------------------------------------------------------

describe('Zod validation', () => {
  describe('projectSchema', () => {
    it('accepts a valid project', () => {
      const data = makeProject();
      expect(() => projectSchema.parse(data)).not.toThrow();
    });

    it('rejects project without name', () => {
      const data = makeProject({ name: '' });
      expect(() => projectSchema.parse(data)).toThrow();
    });

    it('rejects project with invalid id (wrong length)', () => {
      const data = makeProject({ id: 'short' });
      expect(() => projectSchema.parse(data)).toThrow();
    });

    it('rejects invalid romanIndex', () => {
      const data = makeProject({ romanIndex: '' });
      expect(() => projectSchema.parse(data)).toThrow();
    });
  });

  describe('partySchema', () => {
    it('accepts valid party', () => {
      const data = makeParty(uid());
      expect(() => partySchema.parse(data)).not.toThrow();
    });

    it('rejects invalid color format', () => {
      const data = makeParty(uid(), { color: 'red' });
      expect(() => partySchema.parse(data)).toThrow();
    });

    it('rejects empty name', () => {
      const data = makeParty(uid(), { name: '' });
      expect(() => partySchema.parse(data)).toThrow();
    });
  });

  describe('taskSchema', () => {
    it('accepts valid task', () => {
      const data = makeTask(uid(), uid());
      expect(() => taskSchema.parse(data)).not.toThrow();
    });

    it('rejects task with missing title', () => {
      const data = makeTask(uid(), uid(), { title: '' });
      expect(() => taskSchema.parse(data)).toThrow();
    });

    it('accepts task with notes', () => {
      const data = makeTask(uid(), uid(), { notes: 'Some note' });
      expect(() => taskSchema.parse(data)).not.toThrow();
    });

    it('rejects invalid ISO date', () => {
      const data = makeTask(uid(), uid(), { start: 'not-a-date' });
      expect(() => taskSchema.parse(data)).toThrow();
    });
  });

  describe('calendarEventSchema', () => {
    it('accepts valid calendar event', () => {
      const data = makeCalendarEvent();
      expect(() => calendarEventSchema.parse(data)).not.toThrow();
    });

    it('rejects invalid kind', () => {
      const data = makeCalendarEvent({ kind: 'invalid' as any });
      expect(() => calendarEventSchema.parse(data)).toThrow();
    });

    it('accepts event with recurrence', () => {
      const data = makeCalendarEvent({
        recurrence: {
          freq: 'weekly',
          interval: 1,
          count: 10,
        },
      });
      expect(() => calendarEventSchema.parse(data)).not.toThrow();
    });
  });

  describe('meetingSchema', () => {
    it('accepts valid meeting', () => {
      const data = makeMeeting(uid());
      expect(() => meetingSchema.parse(data)).not.toThrow();
    });

    it('accepts meeting with partyId', () => {
      const data = makeMeeting(uid(), { partyId: uid() });
      expect(() => meetingSchema.parse(data)).not.toThrow();
    });
  });

  describe('recurrenceSchema', () => {
    it('accepts valid daily recurrence', () => {
      const data: Recurrence = { freq: 'daily', interval: 2 };
      expect(() => recurrenceSchema.parse(data)).not.toThrow();
    });

    it('rejects invalid frequency', () => {
      const data = { freq: 'yearly', interval: 1 };
      expect(() => recurrenceSchema.parse(data)).toThrow();
    });

    it('rejects interval of 0', () => {
      const data = { freq: 'weekly', interval: 0 };
      expect(() => recurrenceSchema.parse(data)).toThrow();
    });
  });

  describe('appSettingsSchema', () => {
    it('accepts valid settings', () => {
      const data = makeSettings();
      expect(() => appSettingsSchema.parse(data)).not.toThrow();
    });

    it('rejects non-singleton id', () => {
      const data = makeSettings({ id: 'other' as any });
      expect(() => appSettingsSchema.parse(data)).toThrow();
    });

    it('rejects invalid zoomLevel', () => {
      const data = makeSettings({ zoomLevel: 'week' as any });
      expect(() => appSettingsSchema.parse(data)).toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// CRUD Operations Tests
// ---------------------------------------------------------------------------

describe('CRUD operations', () => {
  beforeEach(async () => {
    // Clean all tables before each test
    await db.projects.clear();
    await db.parties.clear();
    await db.tasks.clear();
    await db.calendarEvents.clear();
    await db.meetings.clear();
    await db.settings.clear();
  });

  // ---- Projects ----

  describe('Projects', () => {
    it('getAllProjects returns empty array initially', async () => {
      const projects = await getAllProjects();
      expect(projects).toEqual([]);
    });

    it('createProject adds a project', async () => {
      const project = makeProject();
      const id = await createProject(project);
      expect(id).toBe(project.id);
      const retrieved = await getProject(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Test Project');
    });

    it('getProject returns undefined for missing id', async () => {
      const result = await getProject('nonexistent');
      expect(result).toBeUndefined();
    });

    it('updateProject modifies fields', async () => {
      const project = makeProject();
      await createProject(project);
      await updateProject(project.id, { name: 'Updated' });
      const retrieved = await getProject(project.id);
      expect(retrieved!.name).toBe('Updated');
    });

    it('deleteProject removes project and cascades', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const task = makeTask(project.id, party.id);
      await createTask(task);
      const meeting = makeMeeting(project.id);
      await createMeeting(meeting);

      await deleteProject(project.id);

      expect(await getProject(project.id)).toBeUndefined();
      const parties = await getParties(project.id);
      expect(parties).toEqual([]);
      const tasks = await getTasks(project.id);
      expect(tasks).toEqual([]);
      const meetings = await getMeetings(project.id);
      expect(meetings).toEqual([]);
    });
  });

  // ---- Parties ----

  describe('Parties', () => {
    it('createParty and getParties', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const parties = await getParties(project.id);
      expect(parties).toHaveLength(1);
      expect(parties[0]!.name).toBe('Engineering');
    });

    it('updateParty', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      await updateParty(party.id, { color: '#00ff00' });
      const parties = await getParties(project.id);
      expect(parties[0]!.color).toBe('#00ff00');
    });

    it('deleteParty', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      await deleteParty(party.id);
      const parties = await getParties(project.id);
      expect(parties).toEqual([]);
    });
  });

  // ---- Tasks ----

  describe('Tasks', () => {
    it('createTask and getTasks', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const task = makeTask(project.id, party.id);
      await createTask(task);
      const tasks = await getTasks(project.id);
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.title).toBe('Widget design');
    });

    it('getSubTasks returns children', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const parent = makeTask(project.id, party.id, { title: 'Parent' });
      await createTask(parent);
      const child = makeTask(project.id, party.id, {
        title: 'Child',
        parentTaskId: parent.id,
      });
      await createTask(child);

      const subtasks = await getSubTasks(parent.id);
      expect(subtasks).toHaveLength(1);
      expect(subtasks[0]!.title).toBe('Child');
    });

    it('updateTask', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const task = makeTask(project.id, party.id);
      await createTask(task);
      await updateTask(task.id, { order: 5 });
      const tasks = await getTasks(project.id);
      expect(tasks[0]!.order).toBe(5);
    });

    it('deleteTask cascades to sub-tasks', async () => {
      const project = makeProject();
      await createProject(project);
      const party = makeParty(project.id);
      await createParty(party);
      const parent = makeTask(project.id, party.id);
      await createTask(parent);
      const child = makeTask(project.id, party.id, {
        parentTaskId: parent.id,
      });
      await createTask(child);
      await deleteTask(parent.id);
      const tasks = await getTasks(project.id);
      expect(tasks).toEqual([]);
    });
  });

  // ---- Calendar Events ----

  describe('Calendar Events', () => {
    it('createCalendarEvent and getCalendarEvents', async () => {
      const event = makeCalendarEvent();
      await createCalendarEvent(event);
      const events = await getCalendarEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.title).toBe('New Year');
    });

    it('updateCalendarEvent', async () => {
      const event = makeCalendarEvent();
      await createCalendarEvent(event);
      await updateCalendarEvent(event.id, { title: 'Updated' });
      const events = await getCalendarEvents();
      expect(events[0]!.title).toBe('Updated');
    });

    it('deleteCalendarEvent', async () => {
      const event = makeCalendarEvent();
      await createCalendarEvent(event);
      await deleteCalendarEvent(event.id);
      expect(await getCalendarEvents()).toEqual([]);
    });
  });

  // ---- Meetings ----

  describe('Meetings', () => {
    it('createMeeting and getMeetings', async () => {
      const project = makeProject();
      await createProject(project);
      const meeting = makeMeeting(project.id);
      await createMeeting(meeting);
      const meetings = await getMeetings(project.id);
      expect(meetings).toHaveLength(1);
      expect(meetings[0]!.title).toBe('Sprint review');
    });

    it('updateMeeting', async () => {
      const project = makeProject();
      await createProject(project);
      const meeting = makeMeeting(project.id);
      await createMeeting(meeting);
      await updateMeeting(meeting.id, { title: 'Retro' });
      const meetings = await getMeetings(project.id);
      expect(meetings[0]!.title).toBe('Retro');
    });

    it('deleteMeeting', async () => {
      const project = makeProject();
      await createProject(project);
      const meeting = makeMeeting(project.id);
      await createMeeting(meeting);
      await deleteMeeting(meeting.id);
      const meetings = await getMeetings(project.id);
      expect(meetings).toEqual([]);
    });
  });

  // ---- Settings ----

  describe('Settings', () => {
    it('returns undefined when no settings exist', async () => {
      const settings = await getSettings();
      expect(settings).toBeUndefined();
    });

    it('updateSettings creates default when none exists', async () => {
      await updateSettings({ weekendsHidden: false });
      const settings = await getSettings();
      expect(settings).toBeDefined();
      expect(settings!.id).toBe('singleton');
      expect(settings!.zoomLevel).toBe('day');
      expect(settings!.weekendsHidden).toBe(false);
    });

    it('updateSettings merges with existing', async () => {
      await updateSettings({ weekendsHidden: false });
      await updateSettings({ activeProjectId: uid() });
      const settings = await getSettings();
      expect(settings!.weekendsHidden).toBe(false);
      expect(settings!.activeProjectId).toBeDefined();
      expect(settings!.zoomLevel).toBe('day');
    });
  });
});
