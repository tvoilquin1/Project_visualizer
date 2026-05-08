import { Task, CalendarEvent } from './types';

export type ISODate = string;

/**
 * Find conflicts between a task and calendar events.
 * Returns array of conflict info.
 */
export function findConflicts(
  task: Task,
  calendarEvents: CalendarEvent[]
): { eventId: string; date: ISODate }[] {
  if (!task.start || !task.end) return [];

  const conflicts: { eventId: string; date: ISODate }[] = [];

  for (const event of calendarEvents) {
    // Check if task overlaps with event
    if (task.start <= event.end && task.end >= event.start) {
      // Find the overlapping workdays
      const overlapStart = task.start > event.start ? task.start : event.start;
      const overlapEnd = task.end < event.end ? task.end : event.end;

      // We'll keep it simple: return the event and the overlap range
      conflicts.push({
        eventId: event.id,
        date: overlapStart,
      });
    }
  }

  return conflicts;
}

/**
 * Returns the CSS for conflict diagonal red stripes.
 */
export function getConflictCSS(): string {
  return `repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 3px,
    #ef4444 3px,
    #ef4444 5px
  )`;
}

/**
 * Returns true if a task has any conflicts with calendar events.
 */
export function hasConflict(
  task: Task,
  calendarEvents: CalendarEvent[]
): boolean {
  return findConflicts(task, calendarEvents).length > 0;
}

/**
 * Returns human-readable conflict messages for a task.
 */
export function getConflictMessages(
  task: Task,
  calendarEvents: CalendarEvent[]
): string[] {
  return findConflicts(task, calendarEvents).map(conflict => {
    const event = calendarEvents.find(e => e.id === conflict.eventId);
    return event ? `Conflicts with ${event.title}` : 'Unknown conflict';
  }).filter((msg, i, arr) => arr.indexOf(msg) === i); // deduplicate
}
