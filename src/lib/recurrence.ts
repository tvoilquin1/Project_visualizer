import { addDays, addWeeks, addMonths, format, isBefore, isAfter, parse, startOfDay } from 'date-fns';
import { Recurrence, Meeting } from './types';

export type ISODate = string;

/**
 * Expands a recurrence rule into concrete dates.
 * Capped at 200 occurrences.
 */
export function expandRecurrence(
  rec: Recurrence,
  anchor: ISODate
): ISODate[] {
  const dates: ISODate[] = [];
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());
  const maxCount = rec.count ? Math.min(rec.count, 200) : 200;
  const endDate = rec.endDate ? parse(rec.endDate, 'yyyy-MM-dd', new Date()) : null;
  const exceptions = new Set(rec.exceptions || []);

  let current = new Date(anchorDate);

  for (let i = 0; i < maxCount; i++) {
    const dateStr = format(current, 'yyyy-MM-dd');

    // Check end date
    if (endDate && isAfter(current, endDate)) break;

    // Skip exceptions
    if (!exceptions.has(dateStr)) {
      dates.push(dateStr);
    }

    // Advance
    switch (rec.freq) {
      case 'daily':
        current = addDays(current, rec.interval);
        break;
      case 'weekly':
        current = addWeeks(current, rec.interval);
        break;
      case 'monthly':
        current = addMonths(current, rec.interval);
        break;
    }

    // Safety cap
    if (dates.length >= 200) break;
  }

  return dates;
}

/**
 * Expands a meeting's recurrence into concrete date occurrences.
 */
export function expandMeeting(
  meeting: Meeting
): { date: ISODate; override?: { start?: ISODate; end?: ISODate; title?: string } }[] {
  if (!meeting.recurrence) {
    return [{ date: meeting.start }];
  }

  const dates = expandRecurrence(meeting.recurrence, meeting.start);
  const overrides = meeting.recurrence.overrides || {};

  return dates.map(date => ({
    date,
    override: overrides[date] || undefined,
  }));
}

/**
 * Applies a date-specific override to a meeting occurrence.
 */
export function applyOverride(
  occurrences: ISODate[],
  overrides: Record<string, { start?: ISODate; end?: ISODate; title?: string } | undefined>
): ISODate[] {
  return occurrences.map(date => {
    const override = overrides[date];
    if (override && override.start) {
      return override.start;
    }
    return date;
  });
}
