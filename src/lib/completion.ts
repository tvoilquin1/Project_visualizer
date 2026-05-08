import { Task } from './types';

export type ISODate = string;

/**
 * Calculate completion percentage for a task.
 * - Task with subtasks: scheduledSubtasks / totalSubtasks
 * - Scheduled = start && end both set
 * - Task with no subtasks: 1 if scheduled (start && end set), 0 if unscheduled
 */
export function getTaskCompletion(task: Task, subtasks: Task[]): number {
  if (subtasks.length === 0) {
    return task.start && task.end ? 1 : 0;
  }

  const scheduled = subtasks.filter(s => s.start && s.end).length;
  return scheduled / subtasks.length;
}

/**
 * Calculate completion percentage for a project.
 * Aggregates over all top-level tasks.
 */
export function getProjectCompletion(
  topLevelTasks: Task[],
  allTasksMap: Map<string, Task[]>
): number {
  if (topLevelTasks.length === 0) return 0;

  let total = 0;
  for (const task of topLevelTasks) {
    const subtasks = allTasksMap.get(task.id) || [];
    total += getTaskCompletion(task, subtasks);
  }

  return total / topLevelTasks.length;
}

/**
 * Interpolate a color from neutral-gray (0%) to the given party color (100%)
 * using OKLCH color interpolation.
 */
export function getCompletionGradient(completion: number, color: string): string {
  // Clamp
  const pct = Math.max(0, Math.min(1, completion));

  if (pct === 0) return 'color-mix(in oklch, var(--color-neutral-400), transparent 0%)';
  if (pct === 1) return color;

  // Use CSS color-mix for interpolation
  return `color-mix(in oklch, ${color} ${Math.round(pct * 100)}%, var(--color-neutral-400))`;
}
