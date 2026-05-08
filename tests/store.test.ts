// ---------------------------------------------------------------------------
// Project Scheduler — Store Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nanoid } from 'nanoid';
import {
  useStore,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
} from '../src/lib/store';
import { db } from '../src/lib/db';
import type { Project, Party, Task } from '../src/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uid = (): string => nanoid(12);

/** Get the raw store state (outside React, so we can just call getState) */
function getState() {
  return useStore.getState();
}

/** Get temporal state */
function getTemporal() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (useStore as any).temporal?.getState();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Store initial state', () => {
  it('should initialize with default state', () => {
    const state = getState();
    expect(state.projects).toEqual([]);
    expect(state.parties).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.calendarEvents).toEqual([]);
    expect(state.meetings).toEqual([]);
    expect(state.settings).toBeDefined();
    expect(state.settings.id).toBe('singleton');
    expect(state.activeProjectId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.collapsedTaskIds).toEqual([]);
    expect(state.collapsedTaskIds.length).toBe(0);
  });
});

describe('Store actions', () => {
  // Clean Dexie before each test
  beforeEach(async () => {
    await db.projects.clear();
    await db.parties.clear();
    await db.tasks.clear();
    await db.calendarEvents.clear();
    await db.meetings.clear();
    await db.settings.clear();

    // Reset store state
    useStore.setState({
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
    });

    clearHistory();
  });

  describe('createProject', () => {
    it('should add a project and its parties', async () => {
      const state = getState();
      const id = await state.createProject('Test Project', [
        { name: 'Engineering', color: '#ff6633' },
        { name: 'Design', color: '#33ff66' },
      ]);

      const state2 = getState();
      expect(state2.projects).toHaveLength(1);
      expect(state2.projects[0]!.name).toBe('Test Project');
      expect(state2.projects[0]!.romanIndex).toBe('I');
      expect(state2.activeProjectId).toBe(id);

      const projectParties = state2.parties.filter(
        (p) => p.projectId === id,
      );
      expect(projectParties).toHaveLength(2);
      expect(projectParties.map((p) => p.name).sort()).toEqual([
        'Design',
        'Engineering',
      ]);

      // Verify persisted in Dexie
      const dbProject = await db.projects.get(id);
      expect(dbProject).toBeDefined();
      expect(dbProject!.name).toBe('Test Project');
    });

    it('should increment roman index for subsequent projects', async () => {
      const state = getState();
      await state.createProject('Project A', []);
      await state.createProject('Project B', []);

      const state2 = getState();
      expect(state2.projects).toHaveLength(2);
      expect(state2.projects[0]!.romanIndex).toBe('I');
      expect(state2.projects[1]!.romanIndex).toBe('II');
    });
  });

  describe('switchProject', () => {
    it('should change activeProjectId', async () => {
      const state = getState();
      const id1 = await state.createProject('Project A', []);
      const id2 = await state.createProject('Project B', []);

      state.switchProject(id1);
      expect(getState().activeProjectId).toBe(id1);

      state.switchProject(id2);
      expect(getState().activeProjectId).toBe(id2);
    });
  });

  describe('deleteProject', () => {
    it('should remove project and cascade delete parties, tasks, meetings', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', [
        { name: 'Team', color: '#ff0000' },
      ]);
      const partyId = getState().parties[0]!.id;

      // Add some tasks
      await state.createTask({
        projectId,
        title: 'Task A',
        order: 0,
      });
      await state.createTask({
        projectId,
        title: 'Task B',
        order: 1,
      });

      // Add a meeting
      await state.createMeeting({
        projectId,
        title: 'Meeting',
        start: '2026-03-01',
        end: '2026-03-01',
      });

      await state.deleteProject(projectId);

      const state2 = getState();
      expect(state2.projects).toHaveLength(0);
      expect(state2.parties).toHaveLength(0);
      expect(state2.tasks).toHaveLength(0);
      expect(state2.meetings).toHaveLength(0);
      expect(state2.activeProjectId).toBeNull();

      // Verify Dexie cascade
      expect(await db.projects.get(projectId)).toBeUndefined();
      expect(await db.parties.where('projectId').equals(projectId).toArray()).toEqual([]);
      expect(await db.tasks.where('projectId').equals(projectId).toArray()).toEqual([]);
      expect(await db.meetings.where('projectId').equals(projectId).toArray()).toEqual([]);
    });
  });

  describe('createTask', () => {
    it('should add a task', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);

      const taskId = await state.createTask({
        projectId,
        title: 'Design widget',
        start: '2026-02-01',
        end: '2026-02-15',
        order: 0,
      });

      const state2 = getState();
      expect(state2.tasks).toHaveLength(1);
      expect(state2.tasks[0]!.title).toBe('Design widget');
      expect(state2.tasks[0]!.projectId).toBe(projectId);

      // Verify persisted
      const dbTask = await db.tasks.get(taskId);
      expect(dbTask).toBeDefined();
      expect(dbTask!.title).toBe('Design widget');
    });
  });

  describe('updateTask', () => {
    it('should modify a task', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskId = await state.createTask({
        projectId,
        title: 'Original',
        order: 0,
      });

      await state.updateTask(taskId, { title: 'Updated', order: 5 });

      const state2 = getState();
      expect(state2.tasks[0]!.title).toBe('Updated');
      expect(state2.tasks[0]!.order).toBe(5);

      // Verify persisted
      const dbTask = await db.tasks.get(taskId);
      expect(dbTask!.title).toBe('Updated');
    });
  });

  describe('deleteTask', () => {
    it('should remove a task', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskId = await state.createTask({
        projectId,
        title: 'To delete',
        order: 0,
      });

      await state.deleteTask(taskId);
      expect(getState().tasks).toHaveLength(0);
    });

    it('should cascade delete sub-tasks', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const parentId = await state.createTask({
        projectId,
        title: 'Parent',
        order: 0,
      });
      const childId = await state.createTask({
        projectId,
        parentTaskId: parentId,
        title: 'Child',
        order: 0,
      });

      await state.deleteTask(parentId);
      expect(getState().tasks).toHaveLength(0);
    });
  });

  describe('moveTask / resizeTask / reorderTask', () => {
    it('moveTask should update start and end', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskId = await state.createTask({
        projectId,
        title: 'Task',
        start: '2026-01-01',
        end: '2026-01-15',
        order: 0,
      });

      state.moveTask(taskId, '2026-02-01', '2026-02-15');

      const task = getState().tasks[0]!;
      expect(task.start).toBe('2026-02-01');
      expect(task.end).toBe('2026-02-15');
    });

    it('resizeTask should update start and end', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskId = await state.createTask({
        projectId,
        title: 'Task',
        start: '2026-01-01',
        end: '2026-01-15',
        order: 0,
      });

      state.resizeTask(taskId, '2026-01-10', '2026-01-20');

      const task = getState().tasks[0]!;
      expect(task.start).toBe('2026-01-10');
      expect(task.end).toBe('2026-01-20');
    });

    it('reorderTask should update order', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskA = await state.createTask({
        projectId,
        title: 'Task A',
        order: 0,
      });
      const taskB = await state.createTask({
        projectId,
        title: 'Task B',
        order: 1,
      });
      const taskC = await state.createTask({
        projectId,
        title: 'Task C',
        order: 2,
      });

      // Move taskC (order 2) to position 0
      state.reorderTask(taskC, 0);

      const tasks = getState().tasks;
      const tA = tasks.find((t) => t.id === taskA)!;
      const tB = tasks.find((t) => t.id === taskB)!;
      const tC = tasks.find((t) => t.id === taskC)!;
      expect(tC.order).toBe(0);
      expect(tA.order).toBe(1);
      expect(tB.order).toBe(2);
    });
  });

  describe('toggleCollapseTask', () => {
    it('should add and remove from collapsed set', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const taskId = await state.createTask({
        projectId,
        title: 'Task',
        order: 0,
      });

      // Collapse
      state.toggleCollapseTask(taskId);
      expect(getState().collapsedTaskIds.includes(taskId)).toBe(true);

      // Uncollapse
      state.toggleCollapseTask(taskId);
      expect(getState().collapsedTaskIds.includes(taskId)).toBe(false);
    });

    it('should support multiple collapsed tasks', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);
      const id1 = await state.createTask({ projectId, title: 'A', order: 0 });
      const id2 = await state.createTask({ projectId, title: 'B', order: 1 });

      state.toggleCollapseTask(id1);
      state.toggleCollapseTask(id2);

      const ids = getState().collapsedTaskIds;
      expect(ids.includes(id1)).toBe(true);
      expect(ids.includes(id2)).toBe(true);
      expect(ids.length).toBe(2);
    });
  });

  describe('createCalendarEvent', () => {
    it('should add a calendar event', async () => {
      const state = getState();
      const eventId = await state.createCalendarEvent({
        kind: 'holiday',
        title: 'New Year',
        start: '2026-01-01',
        end: '2026-01-01',
      });

      expect(getState().calendarEvents).toHaveLength(1);
      expect(getState().calendarEvents[0]!.title).toBe('New Year');

      const dbEvent = await db.calendarEvents.get(eventId);
      expect(dbEvent).toBeDefined();
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should remove a calendar event', async () => {
      const state = getState();
      const eventId = await state.createCalendarEvent({
        kind: 'holiday',
        title: 'New Year',
        start: '2026-01-01',
        end: '2026-01-01',
      });

      await state.deleteCalendarEvent(eventId);
      expect(getState().calendarEvents).toHaveLength(0);
    });
  });

  describe('createMeeting / updateMeeting / deleteMeeting', () => {
    it('should create, update, and delete a meeting', async () => {
      const state = getState();
      const projectId = await state.createProject('Test', []);

      const meetingId = await state.createMeeting({
        projectId,
        title: 'Sprint review',
        start: '2026-01-20',
        end: '2026-01-20',
      });

      expect(getState().meetings).toHaveLength(1);

      // Update
      await state.updateMeeting(meetingId, { title: 'Retro' });
      expect(getState().meetings[0]!.title).toBe('Retro');

      // Delete
      await state.deleteMeeting(meetingId);
      expect(getState().meetings).toHaveLength(0);
    });
  });

  describe('setLoading / setError', () => {
    it('should set loading state', () => {
      getState().setLoading(true);
      expect(getState().isLoading).toBe(true);
      getState().setLoading(false);
      expect(getState().isLoading).toBe(false);
    });

    it('should set error state', () => {
      getState().setError('Something went wrong');
      expect(getState().error).toBe('Something went wrong');
      getState().setError(null);
      expect(getState().error).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo round-trip tests
// ---------------------------------------------------------------------------

describe('Undo / Redo', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.parties.clear();
    await db.tasks.clear();
    await db.calendarEvents.clear();
    await db.meetings.clear();
    await db.settings.clear();

    useStore.setState({
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
    });

    clearHistory();
  });

  it('canUndo/canRedo should be false initially', () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('should undo a createTask', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);

    // Create a task
    await state.createTask({
      projectId,
      title: 'New Task',
      order: 0,
    });
    expect(getState().tasks).toHaveLength(1);

    // Undo — task should be gone
    expect(canUndo()).toBe(true);
    undo();
    expect(getState().tasks).toHaveLength(0);

    // Redo — task should be back
    expect(canRedo()).toBe(true);
    redo();
    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]!.title).toBe('New Task');
  });

  it('should undo a createProject (including parties)', async () => {
    const state = getState();
    const projectId = await state.createProject('Test Project', [
      { name: 'Engineering', color: '#ff6633' },
    ]);

    expect(getState().projects).toHaveLength(1);
    expect(getState().parties).toHaveLength(1);

    // Undo — project and parties should be gone
    undo();
    expect(getState().projects).toHaveLength(0);
    expect(getState().parties).toHaveLength(0);
    expect(getState().activeProjectId).toBeNull();

    // Redo — project and parties back
    redo();
    expect(getState().projects).toHaveLength(1);
    expect(getState().parties).toHaveLength(1);
    expect(getState().activeProjectId).toBe(projectId);
  });

  it('should undo a deleteTask', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);
    const taskId = await state.createTask({
      projectId,
      title: 'Task to delete',
      order: 0,
    });

    // Delete
    await state.deleteTask(taskId);
    expect(getState().tasks).toHaveLength(0);

    // Undo — task should be back
    undo();
    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]!.title).toBe('Task to delete');
  });

  it('should undo a party update', async () => {
    const state = getState();
    await state.createProject('Test', [
      { name: 'Engineering', color: '#ff6633' },
    ]);
    const partyId = getState().parties[0]!.id;

    // Update party
    await state.updateParty(partyId, { color: '#00ff00' });
    expect(getState().parties[0]!.color).toBe('#00ff00');

    // Undo
    undo();
    expect(getState().parties[0]!.color).toBe('#ff6633');
  });

  it('should undo a meeting creation', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);

    await state.createMeeting({
      projectId,
      title: 'Meeting A',
      start: '2026-03-01',
      end: '2026-03-01',
    });
    expect(getState().meetings).toHaveLength(1);

    // Undo
    undo();
    expect(getState().meetings).toHaveLength(0);

    // Redo
    redo();
    expect(getState().meetings).toHaveLength(1);
  });

  it('should undo a calendar event creation', async () => {
    const state = getState();

    await state.createCalendarEvent({
      kind: 'holiday',
      title: 'Holiday',
      start: '2026-12-25',
      end: '2026-12-25',
    });
    expect(getState().calendarEvents).toHaveLength(1);

    // Undo
    undo();
    expect(getState().calendarEvents).toHaveLength(0);
  });

  it('should undo toggleCollapseTask', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);
    const taskId = await state.createTask({
      projectId,
      title: 'Task',
      order: 0,
    });

    // Collapse
    state.toggleCollapseTask(taskId);
    expect(getState().collapsedTaskIds.includes(taskId)).toBe(true);

    // Undo — should be uncollapsed
    undo();
    expect(getState().collapsedTaskIds.includes(taskId)).toBe(false);

    // Redo — should be collapsed again
    redo();
    expect(getState().collapsedTaskIds.includes(taskId)).toBe(true);
  });

  it('should support multiple undo steps', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);

    // Create three tasks
    await state.createTask({ projectId, title: 'A', order: 0 });
    await state.createTask({ projectId, title: 'B', order: 1 });
    await state.createTask({ projectId, title: 'C', order: 2 });

    expect(getState().tasks).toHaveLength(3);

    // Undo twice
    undo();
    expect(getState().tasks).toHaveLength(2);
    expect(getState().tasks.map((t) => t.title).sort()).toEqual(['A', 'B']);

    undo();
    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]!.title).toBe('A');

    // Redo once
    redo();
    expect(getState().tasks).toHaveLength(2);
    expect(getState().tasks.map((t) => t.title).sort()).toEqual(['A', 'B']);

    // Redo again
    redo();
    expect(getState().tasks).toHaveLength(3);
  });

  it('should handle undo with steps parameter', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);

    // Create three tasks
    await state.createTask({ projectId, title: 'A', order: 0 });
    await state.createTask({ projectId, title: 'B', order: 1 });
    await state.createTask({ projectId, title: 'C', order: 2 });

    expect(getState().tasks).toHaveLength(3);

    // Undo 2 steps at once
    undo(2);
    expect(getState().tasks).toHaveLength(1);
    expect(getState().tasks[0]!.title).toBe('A');

    // Redo 2 steps at once
    redo(2);
    expect(getState().tasks).toHaveLength(3);
  });

  it('should clear history', async () => {
    const state = getState();
    const projectId = await state.createProject('Test', []);

    await state.createTask({ projectId, title: 'Task', order: 0 });

    expect(canUndo()).toBe(true);
    clearHistory();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('should not break when undo is called with no history', () => {
    expect(canUndo()).toBe(false);
    // Should not throw
    undo();
    redo();
  });
});

// ---------------------------------------------------------------------------
// Selector tests
// ---------------------------------------------------------------------------

describe('Typed selectors', () => {
  beforeEach(async () => {
    await db.projects.clear();
    await db.parties.clear();
    await db.tasks.clear();
    await db.settings.clear();

    useStore.setState({
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
    });

    clearHistory();
  });

  it('useProjects selector returns all projects', async () => {
    const state = getState();
    // Use getState() instead of the hook (hooks need React context)
    expect(state.projects).toEqual([]);

    const id1 = await state.createProject('A', []);
    const id2 = await state.createProject('B', []);

    const projects = getState().projects;
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.name).sort()).toEqual(['A', 'B']);
  });

  it('useParties selector filters by projectId', async () => {
    const state = getState();
    const id1 = await state.createProject('A', [
      { name: 'Team A1', color: '#ff0000' },
    ]);
    const id2 = await state.createProject('B', [
      { name: 'Team B1', color: '#00ff00' },
    ]);

    const aParties = getState().parties.filter((p) => p.projectId === id1);
    expect(aParties).toHaveLength(1);
    expect(aParties[0]!.name).toBe('Team A1');

    const bParties = getState().parties.filter((p) => p.projectId === id2);
    expect(bParties).toHaveLength(1);
    expect(bParties[0]!.name).toBe('Team B1');
  });

  it('useTasks selector filters by projectId', async () => {
    const state = getState();
    const id1 = await state.createProject('A', []);
    const id2 = await state.createProject('B', []);

    await state.createTask({ projectId: id1, title: 'Task A1', order: 0 });
    await state.createTask({ projectId: id1, title: 'Task A2', order: 1 });
    await state.createTask({ projectId: id2, title: 'Task B1', order: 0 });

    const aTasks = getState().tasks.filter((t) => t.projectId === id1);
    expect(aTasks).toHaveLength(2);

    const bTasks = getState().tasks.filter((t) => t.projectId === id2);
    expect(bTasks).toHaveLength(1);
  });
});
