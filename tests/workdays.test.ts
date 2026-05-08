import { describe, it, expect } from 'vitest';
import {
  getWorkdaysBetween,
  addWorkdays,
  isWorkday,
  nextWorkday,
  prevWorkday,
  getWorkdayIndex,
  getDateFromIndex,
  getWorkdayCountInMonth,
  getMonthBoundaries,
  generateWeekWindow,
} from '../src/lib/workdays';

describe('getWorkdaysBetween', () => {
  it('returns workdays between two dates inclusive', () => {
    // Feb 2 2026 is Monday, Feb 6 2026 is Friday (all workdays)
    const result = getWorkdaysBetween('2026-02-02', '2026-02-06');
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('2026-02-02');
    expect(result[4]).toBe('2026-02-06');
  });

  it('skips weekends', () => {
    // Feb 5 2026 is Thursday, Feb 10 is Tuesday (weekend in between)
    const result = getWorkdaysBetween('2026-02-05', '2026-02-10');
    expect(result).toEqual([
      '2026-02-05',
      '2026-02-06',
      '2026-02-09',
      '2026-02-10',
    ]);
  });

  it('returns single day if start equals end and is workday', () => {
    const result = getWorkdaysBetween('2026-02-02', '2026-02-02');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('2026-02-02');
  });
});

describe('addWorkdays', () => {
  it('adds positive workdays skipping weekends', () => {
    // Feb 6 2026 is Friday, +1 = Monday Feb 9
    expect(addWorkdays('2026-02-06', 1)).toBe('2026-02-09');
  });

  it('adds zero workdays returns same date', () => {
    expect(addWorkdays('2026-02-03', 0)).toBe('2026-02-03');
  });
});

describe('isWorkday', () => {
  it('returns true for Monday-Friday', () => {
    expect(isWorkday('2026-02-02')).toBe(true); // Monday
    expect(isWorkday('2026-02-06')).toBe(true); // Friday
  });

  it('returns false for Saturday and Sunday', () => {
    expect(isWorkday('2026-02-07')).toBe(false); // Saturday
    expect(isWorkday('2026-02-08')).toBe(false); // Sunday
  });
});

describe('nextWorkday', () => {
  it('returns next day if weekday', () => {
    expect(nextWorkday('2026-02-02')).toBe('2026-02-03');
  });

  it('skips weekends', () => {
    expect(nextWorkday('2026-02-06')).toBe('2026-02-09'); // Fri -> Mon
  });
});

describe('prevWorkday', () => {
  it('returns previous day if weekday', () => {
    expect(prevWorkday('2026-02-03')).toBe('2026-02-02');
  });

  it('skips weekends', () => {
    expect(prevWorkday('2026-02-09')).toBe('2026-02-06'); // Mon -> Fri
  });
});

describe('getWorkdayIndex', () => {
  it('returns zero for anchor date itself', () => {
    expect(getWorkdayIndex('2026-02-02', '2026-02-02')).toBe(0);
  });

  it('counts workdays from anchor', () => {
    // Feb 2 is Monday. Feb 3 = 1, Feb 6 (Fri) = 4
    expect(getWorkdayIndex('2026-02-06', '2026-02-02')).toBe(4);
  });
});

describe('getDateFromIndex', () => {
  it('returns anchor date for index 0', () => {
    expect(getDateFromIndex(0, '2026-02-02')).toBe('2026-02-02');
  });
});

describe('getWorkdayCountInMonth', () => {
  it('returns correct workday count for Feb 2026', () => {
    // Feb 2026 has 28 days, 8 weekend days = 20 workdays
    expect(getWorkdayCountInMonth(2026, 2)).toBe(20);
  });
});

describe('getMonthBoundaries', () => {
  it('returns month boundaries in range', () => {
    const result = getMonthBoundaries('2026-01-01', '2026-03-31');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[0].label).toContain('Jan');
  });
});

describe('generateWeekWindow', () => {
  it('returns ~60 workdays by default', () => {
    const result = generateWeekWindow('2026-02-02');
    expect(result.length).toBeGreaterThanOrEqual(58);
    expect(result.length).toBeLessThanOrEqual(62);
  });
});
