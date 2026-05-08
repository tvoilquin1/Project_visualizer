import { addBusinessDays, isWeekend, eachDayOfInterval, format, startOfMonth, getDaysInMonth, differenceInCalendarDays } from 'date-fns';

export type ISODate = string; // 'YYYY-MM-DD'

/**
 * Returns all workdays between start and end (inclusive), skipping weekends.
 */
export function getWorkdaysBetween(start: ISODate, end: ISODate): ISODate[] {
  const days = eachDayOfInterval({ start: new Date(start), end: new Date(end) });
  return days.filter(d => !isWeekend(d)).map(d => format(d, 'yyyy-MM-dd'));
}

/**
 * Adds N workdays to a date (can use negative N for previous workdays).
 */
export function addWorkdays(date: ISODate, n: number): ISODate {
  return format(addBusinessDays(new Date(date), n), 'yyyy-MM-dd');
}

/**
 * Returns true if the date is a workday (Monday-Friday).
 */
export function isWorkday(date: ISODate): boolean {
  return !isWeekend(new Date(date));
}

/**
 * Returns the next workday after the given date.
 */
export function nextWorkday(date: ISODate): ISODate {
  let d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return format(d, 'yyyy-MM-dd');
}

/**
 * Returns the previous workday before the given date.
 */
export function prevWorkday(date: ISODate): ISODate {
  let d = new Date(date);
  d.setDate(d.getDate() - 1);
  while (isWeekend(d)) {
    d.setDate(d.getDate() - 1);
  }
  return format(d, 'yyyy-MM-dd');
}

/**
 * Returns the zero-based index of a workday from an anchor date.
 * Counts only workdays between anchor (exclusive) and date.
 */
export function getWorkdayIndex(date: ISODate, anchor: ISODate): number {
  const start = new Date(anchor);
  const end = new Date(date);
  const sign = end >= start ? 1 : -1;
  const days = eachDayOfInterval({
    start: sign > 0 ? start : end,
    end: sign > 0 ? end : start,
  });
  const workdays = days.filter(d => !isWeekend(d));
  return (workdays.length - 1) * sign;
}

/**
 * Inverse of getWorkdayIndex: returns the date at the given index from anchor.
 */
export function getDateFromIndex(index: number, anchor: ISODate): ISODate {
  let d = new Date(anchor);
  let remaining = Math.abs(index);
  const direction = index >= 0 ? 1 : -1;

  while (remaining > 0) {
    d.setDate(d.getDate() + direction);
    if (!isWeekend(d)) {
      remaining--;
    }
  }
  return format(d, 'yyyy-MM-dd');
}

/**
 * Returns the number of workdays in a given month.
 */
export function getWorkdayCountInMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (!isWeekend(d)) count++;
  }
  return count;
}

/**
 * Returns month boundary markers (first workday of each month) in a date range.
 */
export function getMonthBoundaries(start: ISODate, end: ISODate): { date: ISODate; label: string }[] {
  const boundaries: { date: ISODate; label: string }[] = [];
  let current = startOfMonth(new Date(start));

  while (current <= new Date(end)) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthStr = format(current, 'yyyy-MM');
    const label = format(current, 'MMM yyyy');

    // Find first workday of this month that's >= start
    const daysInMonth = getDaysInMonth(current);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (!isWeekend(d)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (dateStr >= start) {
          boundaries.push({ date: dateStr, label });
        }
        break;
      }
    }

    current = new Date(year, month + 1, 1);
  }

  return boundaries;
}

/**
 * Generates a window of workday dates around an anchor date (~12 weeks / 60 workdays).
 */
export function generateWeekWindow(
  anchorDate: ISODate,
  weeksBack: number = 6,
  weeksForward: number = 6
): ISODate[] {
  const start = addWorkdays(anchorDate, -weeksBack * 5);
  const end = addWorkdays(anchorDate, weeksForward * 5);
  return getWorkdaysBetween(start, end);
}
