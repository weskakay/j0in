import type { Task } from './models';
import { boardStats, filterTasks, isFiltering, priorityFrom, weekAround } from './board-filter';

/** A card with just enough filled in. */
function task(parts: Partial<Task> = {}): Task {
  return {
    id: 't1',
    columnId: 'todo',
    categoryId: null,
    title: 'Karte',
    description: null,
    dueDate: null,
    priority: 'medium',
    position: 1,
    subtasks: [],
    contactIds: [],
    timeEntries: [],
    doneAt: null,
    estimateMinutes: null,
    ...parts,
  };
}

describe('filterTasks', () => {
  const cards = [
    task({ id: 'a', categoryId: 'c1', priority: 'urgent' }),
    task({ id: 'b', categoryId: 'c2', priority: 'urgent' }),
    task({ id: 'c', categoryId: 'c1', priority: 'low' }),
  ];

  it('keeps everything without a filter', () => {
    expect(filterTasks(cards, { category: null, priority: null }).length).toBe(3);
  });

  it('narrows by category and priority together', () => {
    const left = filterTasks(cards, { category: 'c1', priority: 'urgent' });
    expect(left.map((one) => one.id)).toEqual(['a']);
  });

  it('knows when a filter is set', () => {
    expect(isFiltering({ category: null, priority: 'low' })).toBe(true);
    expect(isFiltering({ category: null, priority: null })).toBe(false);
  });
});

describe('priorityFrom', () => {
  it('accepts the known priorities only', () => {
    expect(priorityFrom('urgent')).toBe('urgent');
    expect(priorityFrom('high')).toBeNull();
    expect(priorityFrom(null)).toBeNull();
  });
});

describe('weekAround', () => {
  it('runs from Monday to Sunday', () => {
    expect(weekAround('2026-10-18')).toEqual(['2026-10-12', '2026-10-18']);
    expect(weekAround('2026-10-12')).toEqual(['2026-10-12', '2026-10-18']);
  });

  it('crosses a month end', () => {
    expect(weekAround('2026-11-01')).toEqual(['2026-10-26', '2026-11-01']);
  });
});

describe('boardStats', () => {
  const day = '2026-10-14';
  const cards = [
    task({ id: 'late', dueDate: '2026-10-10' }),
    task({ id: 'soon', dueDate: '2026-10-17' }),
    task({ id: 'later', dueDate: '2026-10-30' }),
    task({ id: 'done', columnId: 'done', dueDate: '2026-10-01', doneAt: '2026-10-13 09:00:00' }),
    task({ id: 'old', columnId: 'done', doneAt: '2026-10-02 09:00:00' }),
  ];

  it('counts open, due, overdue and done cards', () => {
    expect(boardStats(cards, 'done', day)).toEqual({ open: 3, dueWeek: 1, overdue: 1, doneWeek: 1 });
  });

  it('treats every card as open on a board without columns', () => {
    expect(boardStats(cards, null, day).open).toBe(5);
  });
});
