import { describe, it, expect } from 'vitest';
import { expandRecurrence, expandMeeting, applyOverride } from '../src/lib/recurrence';
import { Recurrence, Meeting } from '../src/lib/types';

describe('expandRecurrence', () => {
  it('expands daily recurrence', () => {
    const rec: Recurrence = { freq: 'daily', interval: 1, count: 5 };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('2026-02-02');
    expect(result[4]).toBe('2026-02-06');
  });

  it('expands weekly recurrence', () => {
    const rec: Recurrence = { freq: 'weekly', interval: 1, count: 3 };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('2026-02-02');
    expect(result[1]).toBe('2026-02-09');
    expect(result[2]).toBe('2026-02-16');
  });

  it('expands monthly recurrence', () => {
    const rec: Recurrence = { freq: 'monthly', interval: 1, count: 2 };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('2026-02-02');
    expect(result[1]).toBe('2026-03-02');
  });

  it('respects endDate', () => {
    const rec: Recurrence = { freq: 'daily', interval: 1, endDate: '2026-02-05' };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).toEqual(['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05']);
  });

  it('skips exceptions', () => {
    const rec: Recurrence = {
      freq: 'daily',
      interval: 1,
      count: 5,
      exceptions: ['2026-02-04'],
    };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).not.toContain('2026-02-04');
    expect(result).toHaveLength(4);
  });

  it('caps at 200 occurrences', () => {
    const rec: Recurrence = { freq: 'daily', interval: 1, count: 500 };
    const result = expandRecurrence(rec, '2026-02-02');
    expect(result).toHaveLength(200);
  });
});

describe('expandMeeting', () => {
  it('returns single date for non-recurring meeting', () => {
    const meeting: Meeting = {
      id: 'm1',
      projectId: 'p1',
      title: 'Standup',
      start: '2026-02-02',
      end: '2026-02-02',
    };
    const result = expandMeeting(meeting);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-02-02');
  });

  it('expands recurring meeting dates', () => {
    const meeting: Meeting = {
      id: 'm2',
      projectId: 'p1',
      title: 'Sprint Planning',
      start: '2026-02-02',
      end: '2026-02-02',
      recurrence: { freq: 'weekly', interval: 2, count: 4 },
    };
    const result = expandMeeting(meeting);
    expect(result).toHaveLength(4);
  });
});

describe('applyOverride', () => {
  it('returns occurrences with overrides applied', () => {
    const occurrences = ['2026-02-02', '2026-02-09', '2026-02-16'];
    const overrides = {
      '2026-02-09': { start: '2026-02-10', end: '2026-02-10' },
    };
    const result = applyOverride(occurrences, overrides);
    expect(result[0]).toBe('2026-02-02');
    expect(result[1]).toBe('2026-02-10');
    expect(result[2]).toBe('2026-02-16');
  });
});
