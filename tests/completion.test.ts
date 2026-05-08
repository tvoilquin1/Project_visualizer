import { describe, it, expect } from 'vitest';
import { getTaskCompletion, getProjectCompletion, getCompletionGradient } from '../src/lib/completion';
import { Task } from '../src/lib/types';

describe('getTaskCompletion', () => {
  it('returns 1 for a scheduled task with no subtasks', () => {
    const task: Task = {
      id: 't1',
      projectId: 'p1',
      parentTaskId: null,
      title: 'Task',
      start: '2026-02-02',
      end: '2026-02-06',
      partyId: null,
      order: 0,
    };
    expect(getTaskCompletion(task, [])).toBe(1);
  });

  it('returns 0 for an unscheduled task with no subtasks', () => {
    const task: Task = {
      id: 't2',
      projectId: 'p1',
      parentTaskId: null,
      title: 'Unscheduled',
      start: null,
      end: null,
      partyId: null,
      order: 0,
    };
    expect(getTaskCompletion(task, [])).toBe(0);
  });

  it('calculates completion based on scheduled subtasks', () => {
    const parent: Task = {
      id: 'parent',
      projectId: 'p1',
      parentTaskId: null,
      title: 'Parent',
      start: null,
      end: null,
      partyId: null,
      order: 0,
    };
    const subtasks: Task[] = [
      { ...parent, id: 's1', parentTaskId: 'parent', title: 'Sub 1', start: '2026-02-02', end: '2026-02-03', order: 0 },
      { ...parent, id: 's2', parentTaskId: 'parent', title: 'Sub 2', start: null, end: null, order: 1 },
      { ...parent, id: 's3', parentTaskId: 'parent', title: 'Sub 3', start: '2026-02-05', end: '2026-02-06', order: 2 },
      { ...parent, id: 's4', parentTaskId: 'parent', title: 'Sub 4', start: null, end: null, order: 3 },
    ];
    expect(getTaskCompletion(parent, subtasks)).toBe(0.5); // 2/4
  });

  it('returns 0 for task with subtasks but none scheduled', () => {
    const parent: Task = {
      id: 'parent',
      projectId: 'p1',
      parentTaskId: null,
      title: 'Parent',
      start: null,
      end: null,
      partyId: null,
      order: 0,
    };
    const subtasks: Task[] = [
      { ...parent, id: 's1', parentTaskId: 'parent', title: 'Sub 1', start: null, end: null, order: 0 },
    ];
    expect(getTaskCompletion(parent, subtasks)).toBe(0);
  });
});

describe('getProjectCompletion', () => {
  it('returns 0 for empty tasks', () => {
    expect(getProjectCompletion([], new Map())).toBe(0);
  });

  it('calculates average completion across tasks', () => {
    const task1: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'T1', start: '2026-02-02', end: '2026-02-03',
      partyId: null, order: 0,
    };
    const task2: Task = {
      id: 't2', projectId: 'p1', parentTaskId: null,
      title: 'T2', start: '2026-02-04', end: '2026-02-06',
      partyId: null, order: 1,
    };
    const allTasks = new Map<string, Task[]>();
    allTasks.set('t1', []);
    allTasks.set('t2', []);
    expect(getProjectCompletion([task1, task2], allTasks)).toBe(1);
  });
});

describe('getCompletionGradient', () => {
  it('returns a color-mix string for partial completion', () => {
    const result = getCompletionGradient(0.5, '#22c55e');
    expect(result).toContain('color-mix');
    expect(result).toContain('#22c55e');
  });

  it('returns string containing color for 1.0 completion', () => {
    const result = getCompletionGradient(1, '#22c55e');
    expect(result).toBe('#22c55e');
  });
});
