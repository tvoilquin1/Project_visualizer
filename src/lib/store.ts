// ---------------------------------------------------------------------------
// Project Scheduler — Zustand store with zundo undo/redo middleware
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type {
  Project,
  Party,
  Task,
  CalendarEvent,
  Meeting,
  AppSettings,
  ISODate,
  ID,
} from './types';
import {
  db,
  getAllProjects,
  getParties,
  getTasks,
  getCalendarEvents,
  getMeetings,
  getSettings,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  createParty as dbCreateParty,
  updateParty as dbUpdateParty,
  deleteParty as dbDeleteParty,
  createTask as dbCreateTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  createCalendarEvent as dbCreateCalendarEvent,
  deleteCalendarEvent as dbDeleteCalendarEvent,
  createMeeting as dbCreateMeeting,
  updateMeeting as dbUpdateMeeting,
  deleteMeeting as dbDeleteMeeting,
  updateSettings as dbUpdateSettings,
} from './db';

// ---------------------------------------------------------------------------
// Store state shape
// ---------------------------------------------------------------------------

export interface SchedulerState {
  // Data
  projects: Project[];
  parties: Party[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  meetings: Meeting[];
  settings: AppSettings;

  // UI State
  activeProjectId: string | null;
  collapsedTaskIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;

  // Project actions
  createProject: (name: string, initialParties: { name: string; color: string }[]) => Promise<string>;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => Promise<void>;

  // Party actions
  createParty: (projectId: string, name: string, color: string) => Promise<string>;
  updateParty: (partyId: string, data: Partial<Party>) => Promise<void>;
  deleteParty: (partyId: string) => Promise<void>;

  // Task actions
  createTask: (data: { projectId: string; parentTaskId?: string | null; title: string; start?: string | null; end?: string | null; partyId?: string | null; order: number }) => Promise<string>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStart: string, newEnd: string) => void;
  resizeTask: (taskId: string, newStart: string, newEnd: string) => void;
  reorderTask: (taskId: string, newOrder: number) => void;

  // Calendar event actions
  createCalendarEvent: (data: Omit<CalendarEvent, 'id'>) => Promise<string>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;

  // Meeting actions
  createMeeting: (data: Omit<Meeting, 'id'>) => Promise<string>;
  updateMeeting: (meetingId: string, data: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (meetingId: string) => Promise<void>;

  // UI actions
  toggleCollapseTask: (taskId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ---------------------------------------------------------------------------
// State partial used by zundo (data-only, no actions)
// ---------------------------------------------------------------------------

export interface UndoableState {
  projects: Project[];
  parties: Party[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  meetings: Meeting[];
  settings: AppSettings;
  activeProjectId: string | null;
  collapsedTaskIds: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = (): string => nanoid(12);

function today(): ISODate {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toRoman(num: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romanNumerals[num - 1] || String(num);
}

// Count existing projects to determine next roman numeral
function countProjects(projects: Project[]): number {
  return projects.length;
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

export const useStore = create<SchedulerState>()(
  temporal(
    (set, get) => ({
      // ---- Initial state ----
      projects: [],
      parties: [],
      tasks: [],
      calendarEvents: [],
      meetings: [],
      settings: {
        id: 'singleton',
        activeProjectId: null,
        zoomLevel: 'day',
        weekendsHidden: true,
      },
      activeProjectId: null,
      collapsedTaskIds: [],
      isLoading: false,
      error: null,

      // ---- Init ----
      init: async () => {
        set({ isLoading: true, error: null });
        try {
          const [projects, allParties, allTasks, calendarEvents, meetings, settings] =
            await Promise.all([
              getAllProjects(),
              db.parties.toArray(),
              db.tasks.toArray(),
              getCalendarEvents(),
              db.meetings.toArray(),
              getSettings(),
            ]);

          const resolvedSettings: AppSettings = settings ?? {
            id: 'singleton',
            activeProjectId: null,
            zoomLevel: 'day',
            weekendsHidden: true,
          };

          set({
            projects,
            parties: allParties,
            tasks: allTasks,
            calendarEvents,
            meetings,
            settings: resolvedSettings,
            activeProjectId: resolvedSettings.activeProjectId ?? null,
            isLoading: false,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load data',
          });
        }
      },

      // ---- Projects ----
      createProject: async (name: string, initialParties: { name: string; color: string }[]) => {
        const id = uid();
        const romanIndex = toRoman(countProjects(get().projects) + 1);
        const project: Project = {
          id,
          name,
          romanIndex,
          createdAt: today(),
          parties: [],
        };

        // Create parties
        const partyRecords: Party[] = initialParties.map((p) => ({
          id: uid(),
          projectId: id,
          name: p.name,
          color: p.color,
        }));

        // Persist to Dexie
        await dbCreateProject(project);
        for (const party of partyRecords) {
          await dbCreateParty(party);
        }
        await dbUpdateSettings({ activeProjectId: id });

        // Single set() call for atomic undo snapshot
        set((state) => ({
          projects: [...state.projects, project],
          parties: [...state.parties, ...partyRecords],
          activeProjectId: id,
          settings: { ...state.settings, activeProjectId: id },
        }));

        return id;
      },

      switchProject: (projectId: string) => {
        set({ activeProjectId: projectId });
        dbUpdateSettings({ activeProjectId: projectId });
      },

      deleteProject: async (projectId: string) => {
        // Gather IDs to remove from local state
        const state = get();
        const projectParties = state.parties.filter((p) => p.projectId === projectId);
        const projectTasks = state.tasks.filter((t) => t.projectId === projectId);
        const projectMeetings = state.meetings.filter((m) => m.projectId === projectId);
        const partyIds = new Set(projectParties.map((p) => p.id));
        const taskIds = new Set(projectTasks.map((t) => t.id));

        // Persist cascade delete to Dexie
        await dbDeleteProject(projectId);

        // Update local state
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== projectId),
          parties: s.parties.filter((p) => !partyIds.has(p.id)),
          tasks: s.tasks.filter((t) => !taskIds.has(t.id)),
          meetings: s.meetings.filter((m) => m.projectId !== projectId),
          activeProjectId:
            s.activeProjectId === projectId ? null : s.activeProjectId,
        }));

        if (state.activeProjectId === projectId) {
          await dbUpdateSettings({ activeProjectId: null });
          set((s) => ({
            settings: { ...s.settings, activeProjectId: null },
          }));
        }
      },

      // ---- Parties ----
      createParty: async (projectId: string, name: string, color: string) => {
        const id = uid();
        const party: Party = { id, projectId, name, color };
        await dbCreateParty(party);
        set((state) => ({ parties: [...state.parties, party] }));
        return id;
      },

      updateParty: async (partyId: string, data: Partial<Party>) => {
        await dbUpdateParty(partyId, data);
        set((state) => ({
          parties: state.parties.map((p) =>
            p.id === partyId ? { ...p, ...data } : p,
          ),
        }));
      },

      deleteParty: async (partyId: string) => {
        await dbDeleteParty(partyId);
        set((state) => ({
          parties: state.parties.filter((p) => p.id !== partyId),
        }));
      },

      // ---- Tasks ----
      createTask: async (data: {
        projectId: string;
        parentTaskId?: string | null;
        title: string;
        start?: string | null;
        end?: string | null;
        partyId?: string | null;
        order: number;
      }) => {
        const id = uid();
        const task: Task = {
          id,
          projectId: data.projectId,
          parentTaskId: data.parentTaskId ?? null,
          title: data.title,
          start: data.start ?? null,
          end: data.end ?? null,
          partyId: data.partyId ?? null,
          order: data.order,
          notes: null,
        };
        await dbCreateTask(task);
        set((state) => ({ tasks: [...state.tasks, task] }));
        return id;
      },

      updateTask: async (taskId: string, data: Partial<Task>) => {
        await dbUpdateTask(taskId, data);
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...data } : t,
          ),
        }));
      },

      deleteTask: async (taskId: string) => {
        // Cascade: find sub-tasks
        const state = get();
        const subTaskIds = new Set<string>();
        const findSubtasks = (parentId: string) => {
          for (const t of state.tasks) {
            if (t.parentTaskId === parentId) {
              subTaskIds.add(t.id);
              findSubtasks(t.id);
            }
          }
        };
        findSubtasks(taskId);
        subTaskIds.add(taskId);

        // Persist to Dexie
        await dbDeleteTask(taskId);

        // Update local state
        set((s) => ({
          tasks: s.tasks.filter((t) => !subTaskIds.has(t.id)),
        }));
      },

      moveTask: (taskId: string, newStart: string, newEnd: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, start: newStart, end: newEnd } : t,
          ),
        }));
        // Persist to Dexie (fire-and-forget)
        dbUpdateTask(taskId, { start: newStart, end: newEnd });
      },

      resizeTask: (taskId: string, newStart: string, newEnd: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, start: newStart, end: newEnd } : t,
          ),
        }));
        dbUpdateTask(taskId, { start: newStart, end: newEnd });
      },

      reorderTask: (taskId: string, newOrder: number) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, order: newOrder } : t,
          ),
        }));
        dbUpdateTask(taskId, { order: newOrder });
      },

      // ---- Calendar Events ----
      createCalendarEvent: async (data: Omit<CalendarEvent, 'id'>) => {
        const id = uid();
        const event: CalendarEvent = { id, ...data };
        await dbCreateCalendarEvent(event);
        set((state) => ({
          calendarEvents: [...state.calendarEvents, event],
        }));
        return id;
      },

      deleteCalendarEvent: async (eventId: string) => {
        await dbDeleteCalendarEvent(eventId);
        set((state) => ({
          calendarEvents: state.calendarEvents.filter((e) => e.id !== eventId),
        }));
      },

      // ---- Meetings ----
      createMeeting: async (data: Omit<Meeting, 'id'>) => {
        const id = uid();
        const meeting: Meeting = { id, ...data };
        await dbCreateMeeting(meeting);
        set((state) => ({
          meetings: [...state.meetings, meeting],
        }));
        return id;
      },

      updateMeeting: async (meetingId: string, data: Partial<Meeting>) => {
        await dbUpdateMeeting(meetingId, data);
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === meetingId ? { ...m, ...data } : m,
          ),
        }));
      },

      deleteMeeting: async (meetingId: string) => {
        await dbDeleteMeeting(meetingId);
        set((state) => ({
          meetings: state.meetings.filter((m) => m.id !== meetingId),
        }));
      },

      // ---- UI actions ----
      toggleCollapseTask: (taskId: string) => {
        set((state) => {
          const next = state.collapsedTaskIds.includes(taskId)
            ? state.collapsedTaskIds.filter((id) => id !== taskId)
            : [...state.collapsedTaskIds, taskId];
          return { collapsedTaskIds: next };
        });
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
    }),
    {
      limit: 50,
      partialize: (state: SchedulerState): UndoableState => ({
        projects: state.projects,
        parties: state.parties,
        tasks: state.tasks,
        calendarEvents: state.calendarEvents,
        meetings: state.meetings,
        settings: state.settings,
        activeProjectId: state.activeProjectId,
        collapsedTaskIds: Array.from(state.collapsedTaskIds),
      }),
      // Equality check: skip snapshot if nothing changed
      equality: (past: UndoableState, current: UndoableState) => {
        return (
          past.projects === current.projects &&
          past.parties === current.parties &&
          past.tasks === current.tasks &&
          past.calendarEvents === current.calendarEvents &&
          past.meetings === current.meetings &&
          past.settings === current.settings &&
          past.activeProjectId === current.activeProjectId
        );
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Typed selectors
// ---------------------------------------------------------------------------

export const useProjects = () => useStore((s) => s.projects);

export const useParties = (projectId: string) =>
  useStore((s) => s.parties.filter((p) => p.projectId === projectId));

export const useTasks = (projectId: string) =>
  useStore((s) => s.tasks.filter((t) => t.projectId === projectId));

export const useCalendarEvents = () => useStore((s) => s.calendarEvents);

export const useMeetings = (projectId: string) =>
  useStore((s) => s.meetings.filter((m) => m.projectId === projectId));

export const useSettings = () => useStore((s) => s.settings);

export const useActiveProject = () =>
  useStore((s) => {
    if (!s.activeProjectId) return null;
    return s.projects.find((p) => p.id === s.activeProjectId) ?? null;
  });

export const useActiveProjectId = () => useStore((s) => s.activeProjectId);

export const useCollapsedTaskIds = () => useStore((s) => s.collapsedTaskIds);

export const useIsLoading = () => useStore((s) => s.isLoading);

export const useError = () => useStore((s) => s.error);

// ---------------------------------------------------------------------------
// Undo / Redo hooks
// ---------------------------------------------------------------------------

/**
 * Get raw temporal state (pastStates, futureStates, undo, redo, clear, etc.)
 * Access via `useStore.temporal` — the underlying store API.
 * In React components, use like:
 *
 *   const { undo, redo } = useStore.temporal.getState();
 *   undo(); // or redo()
 *
 * Or subscribe to temporal state changes:
 *
 *   useStore.temporal.subscribe((state) => { ... });
 */
export function getTemporalState() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (useStore as any).temporal?.getState() as
    | {
        pastStates: UndoableState[];
        futureStates: UndoableState[];
        undo: (steps?: number) => void;
        redo: (steps?: number) => void;
        clear: () => void;
        isTracking: boolean;
        pause: () => void;
        resume: () => void;
      }
    | undefined;
}

/** Undo the last action */
export function undo(steps = 1) {
  getTemporalState()?.undo(steps);
}

/** Redo a previously undone action */
export function redo(steps = 1) {
  getTemporalState()?.redo(steps);
}

/** Check if undo is available */
export function canUndo(): boolean {
  return (getTemporalState()?.pastStates.length ?? 0) > 0;
}

/** Check if redo is available */
export function canRedo(): boolean {
  return (getTemporalState()?.futureStates.length ?? 0) > 0;
}

/** Clear undo/redo history */
export function clearHistory() {
  getTemporalState()?.clear();
}
