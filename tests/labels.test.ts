import { describe, it, expect } from 'vitest';
import { generateLabels, getLabel, romanNumeral } from '../src/lib/labels';
import { Task } from '../src/lib/types';

describe('romanNumeral', () => {
  it('converts 1 to I', () => expect(romanNumeral(1)).toBe('I'));
  it('converts 4 to IV', () => expect(romanNumeral(4)).toBe('IV'));
  it('converts 5 to V', () => expect(romanNumeral(5)).toBe('V'));
  it('converts 9 to IX', () => expect(romanNumeral(9)).toBe('IX'));
  it('converts 10 to X', () => expect(romanNumeral(10)).toBe('X'));
  it('converts 49 to XLIX', () => expect(romanNumeral(49)).toBe('XLIX'));
  it('converts 50 to L', () => expect(romanNumeral(50)).toBe('L'));
  it('converts 100 to C', () => expect(romanNumeral(100)).toBe('C'));
  it('converts 500 to D', () => expect(romanNumeral(500)).toBe('D'));
  it('converts 1000 to M', () => expect(romanNumeral(1000)).toBe('M'));
  it('converts 3999 to MMMCMXCIX', () => expect(romanNumeral(3999)).toBe('MMMCMXCIX'));
});

describe('generateLabels', () => {
  it('generates numeric labels for top-level tasks', () => {
    const tasks: Task[] = [
      { id: 't1', projectId: 'p1', parentTaskId: null, title: 'First', start: null, end: null, partyId: null, order: 0 },
      { id: 't2', projectId: 'p1', parentTaskId: null, title: 'Second', start: null, end: null, partyId: null, order: 1 },
      { id: 't3', projectId: 'p1', parentTaskId: null, title: 'Third', start: null, end: null, partyId: null, order: 2 },
    ];
    const labels = generateLabels(tasks);
    expect(labels.get('t1')).toBe('1');
    expect(labels.get('t2')).toBe('2');
    expect(labels.get('t3')).toBe('3');
  });

  it('generates 1.1, 1.2 for subtasks', () => {
    const tasks: Task[] = [
      { id: 't1', projectId: 'p1', parentTaskId: null, title: 'Parent', start: null, end: null, partyId: null, order: 0 },
      { id: 't2', projectId: 'p1', parentTaskId: 't1', title: 'Child 1', start: null, end: null, partyId: null, order: 0 },
      { id: 't3', projectId: 'p1', parentTaskId: 't1', title: 'Child 2', start: null, end: null, partyId: null, order: 1 },
    ];
    const labels = generateLabels(tasks);
    expect(labels.get('t2')).toBe('1.1');
    expect(labels.get('t3')).toBe('1.2');
  });

  it('generates 1.1.1, 1.1.2 for sub-subtasks', () => {
    const tasks: Task[] = [
      { id: 't1', projectId: 'p1', parentTaskId: null, title: 'Top', start: null, end: null, partyId: null, order: 0 },
      { id: 't2', projectId: 'p1', parentTaskId: 't1', title: 'Mid', start: null, end: null, partyId: null, order: 0 },
      { id: 't3', projectId: 'p1', parentTaskId: 't2', title: 'Leaf 1', start: null, end: null, partyId: null, order: 0 },
      { id: 't4', projectId: 'p1', parentTaskId: 't2', title: 'Leaf 2', start: null, end: null, partyId: null, order: 1 },
    ];
    const labels = generateLabels(tasks);
    expect(labels.get('t3')).toBe('1.1.1');
    expect(labels.get('t4')).toBe('1.1.2');
  });

  it('respects order field for sorting', () => {
    const tasks: Task[] = [
      { id: 't1', projectId: 'p1', parentTaskId: null, title: 'Second', start: null, end: null, partyId: null, order: 1 },
      { id: 't2', projectId: 'p1', parentTaskId: null, title: 'First', start: null, end: null, partyId: null, order: 0 },
    ];
    const labels = generateLabels(tasks);
    expect(labels.get('t2')).toBe('1');
    expect(labels.get('t1')).toBe('2');
  });

  it('returns empty label for unknown task', () => {
    const labels = new Map<string, string>();
    expect(getLabel('nonexistent', labels)).toBe('');
  });
});
