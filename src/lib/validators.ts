// ---------------------------------------------------------------------------
// Project Scheduler — Zod validation schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';
import type {
  ID,
  ISODate,
  Recurrence,
  Project,
  Party,
  Task,
  CalendarEvent,
  CalendarEventKind,
  Meeting,
  AppSettings,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const idSchema: z.ZodType<ID> = z
  .string()
  .length(12, 'ID must be exactly 12 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID must be alphanumeric with _ or -');

const isoDateSchema: z.ZodType<ISODate> = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

export const recurrenceSchema: z.ZodType<Recurrence> = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1),
  endDate: isoDateSchema.nullish(),
  count: z.number().int().positive().nullish(),
  exceptions: z.array(isoDateSchema).nullish(),
  overrides: z.record(isoDateSchema, z.object({
    start: isoDateSchema.optional(),
    end: isoDateSchema.optional(),
    title: z.string().optional(),
  })).nullish(),
});

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------

export const partySchema: z.ZodType<Party> = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string().min(1, 'Party name is required'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be in hex format e.g. #ff6633'),
});

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const projectSchema: z.ZodType<Project> = z.object({
  id: idSchema,
  name: z.string().min(1, 'Project name is required'),
  romanIndex: z.string().min(1, 'Roman index is required'),
  createdAt: isoDateSchema,
  parties: z.array(partySchema).default([]),
});

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const taskSchema: z.ZodType<Task> = z.object({
  id: idSchema,
  projectId: idSchema,
  parentTaskId: idSchema.nullish(),
  title: z.string().min(1, 'Task title is required'),
  start: isoDateSchema.nullish(),
  end: isoDateSchema.nullish(),
  partyId: idSchema.nullish(),
  order: z.number().int().min(0),
  notes: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Calendar Event
// ---------------------------------------------------------------------------

export const calendarEventSchema: z.ZodType<CalendarEvent> = z.object({
  id: idSchema,
  kind: z.enum(['holiday', 'ooo', 'blackout']),
  title: z.string().min(1, 'Calendar event title is required'),
  start: isoDateSchema,
  end: isoDateSchema,
  recurrence: recurrenceSchema.nullish(),
  color: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Meeting
// ---------------------------------------------------------------------------

export const meetingSchema: z.ZodType<Meeting> = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1, 'Meeting title is required'),
  start: isoDateSchema,
  end: isoDateSchema,
  recurrence: recurrenceSchema.nullish(),
  partyId: idSchema.nullish(),
});

// ---------------------------------------------------------------------------
// App Settings  (singleton)
// ---------------------------------------------------------------------------

export const appSettingsSchema: z.ZodType<AppSettings> = z.object({
  id: z.literal('singleton'),
  activeProjectId: idSchema.nullish(),
  zoomLevel: z.literal('day'),
  weekendsHidden: z.boolean(),
});
