import { Task } from './types';

/**
 * Convert a number to a Roman numeral (1-3999).
 */
export function romanNumeral(n: number): string {
  if (n <= 0 || n > 3999) return String(n);
  
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  
  let result = '';
  let remaining = n;
  for (const [value, numeral] of map) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

/**
 * Convert a number to a lowercase letter (1=a, 2=b, ... 26=z).
 */
function alphaLabel(n: number): string {
  return String.fromCharCode(96 + n);
}

interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}

/**
 * Build a tree from a flat task list using parentTaskId.
 */
function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  const taskMap = new Map<string, Task>();
  const roots: TaskTreeNode[] = [];
  const childrenMap = new Map<string | null, Task[]>();

  for (const task of tasks) {
    taskMap.set(task.id, task);
    const parentId = task.parentTaskId ?? null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(task);
  }

  // Sort each level by order
  childrenMap.forEach((children) => {
    children.sort((a, b) => a.order - b.order);
  });

  function buildNodes(parentId: string | null): TaskTreeNode[] {
    const children = childrenMap.get(parentId) || [];
    return children.map(task => ({
      task,
      children: buildNodes(task.id),
    }));
  }

  return buildNodes(null);
}

/**
 * Assign labels to each node in the tree.
 */
function assignLabels(
  nodes: TaskTreeNode[],
  prefix: string[],   // e.g. [] for root, ['1'] for level 1, ['1', '1'] for level 2
  labels: Map<string, string>
): void {
  nodes.forEach((node, i) => {
    
    const label = [...prefix, String(i + 1)].join('.');

    labels.set(node.task.id, label);

    if (node.children.length > 0) {
      assignLabels(node.children, [...prefix, String(i + 1)], labels);
    }
  });
}

/**
 * Generate display labels for all tasks using regular numbering.
 * Top-level: 1, 2, 3
 * Subtasks: 1.1, 1.2, ...
 * Sub-subtasks: 1.1.1, 1.1.2, ...
 */
export function generateLabels(tasks: Task[]): Map<string, string> {
  const tree = buildTaskTree(tasks);
  const labels = new Map<string, string>();
  assignLabels(tree, [], labels);
  return labels;
}

/**
 * Convenience getter for a task's label from the map.
 */
export function getLabel(taskId: string, labels: Map<string, string>): string {
  return labels.get(taskId) || '';
}
