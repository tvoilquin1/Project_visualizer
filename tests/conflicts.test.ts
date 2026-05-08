import { describe, it, expect } from 'vitest';
import { findConflicts, hasConflict, getConflictMessages, getConflictCSS } from '../src/lib/conflicts';
import { Task, CalendarEvent } from '../src/lib/types';

describe('findConflicts', () => {
  it('returns empty when task has no dates', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: null, end: null,
      partyId: null, order: 0,
    };
    const events: CalendarEvent[] = [];
    expect(findConflicts(task, events)).toEqual([]);
  });

  it('finds a conflict with overlapping calendar event', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    const events: CalendarEvent[] = [{
      id: 'e1', kind: 'holiday', title: 'National Holiday',
      start: '2026-02-04', end: '2026-02-04',
    }];
    const conflicts = findConflicts(task, events);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].eventId).toBe('e1');
  });

  it('returns empty when event is outside task range', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    const events: CalendarEvent[] = [{
      id: 'e1', kind: 'holiday', title: 'After',
      start: '2026-02-09', end: '2026-02-09',
    }];
    expect(findConflicts(task, events)).toEqual([]);
  });

  it('returns empty when no calendar events exist', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    expect(findConflicts(task, [])).toEqual([]);
  });
});

describe('hasConflict', () => {
  it('returns true when conflict exists', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    const events: CalendarEvent[] = [{
      id: 'e1', kind: 'holiday', title: 'Holiday',
      start: '2026-02-04', end: '2026-02-04',
    }];
    expect(hasConflict(task, events)).toBe(true);
  });

  it('returns false when no conflict', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    expect(hasConflict(task, [])).toBe(false);
  });
});

describe('getConflictMessages', () => {
  it('returns conflict messages', () => {
    const task: Task = {
      id: 't1', projectId: 'p1', parentTaskId: null,
      title: 'Task', start: '2026-02-02', end: '2026-02-06',
      partyId: null, order: 0,
    };
    const events: CalendarEvent[] = [{
      id: 'e1', kind: 'holiday', title: 'New Year',
      start: '2026-02-04', end: '2026-02-04',
    }];
    expect(getConflictMessages(task, events)).toContain('Conflicts with New Year');
  });
});

describe('getConflictCSS', () => {
  it('returns a CSS gradient string', () => {
    const css = getConflictCSS();
    expect(css).toContain('repeating-linear-gradient');
    expect(css).toContain('#ef4444');
  });
});
