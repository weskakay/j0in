import type { Category, Task, TimeEntry } from './models';
import {
  categoryProgress,
  categoryRows,
  daysUntil,
  lastWeekTotal,
  deadlineBuckets,
  doneOn,
  dueNext,
  dueOn,
  mineFor,
  overdue,
  partOfDay,
  phaseSecondsOn,
  secondsOn,
  share,
  weekCounts,
} from './home';

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

/** A finished time entry. */
function entry(parts: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    phaseId: 'p1',
    note: null,
    startedAt: '2026-10-14 09:00:00',
    running: false,
    seconds: 600,
    target: null,
    ...parts,
  };
}

const DAY = '2026-10-14';

describe('partOfDay', () => {
  it('splits the day at eleven and six', () => {
    expect(partOfDay(10)).toBe('morning');
    expect(partOfDay(11)).toBe('day');
    expect(partOfDay(18)).toBe('evening');
  });
});

describe('due and done', () => {
  const cards = [
    task({ id: 'late', dueDate: '2026-10-10' }),
    task({ id: 'today', dueDate: DAY }),
    task({ id: 'soon', dueDate: '2026-10-16' }),
    task({ id: 'next', dueDate: '2026-10-15' }),
    task({ id: 'done', columnId: 'done', dueDate: DAY, doneAt: '2026-10-14 08:00:00' }),
  ];

  it('finds what was finished on the day', () => {
    expect(doneOn(cards, DAY, 'done').map((one) => one.id)).toEqual(['done']);
  });

  it('leaves finished cards out of what is due', () => {
    expect(dueOn(cards, DAY, 'done').map((one) => one.id)).toEqual(['today']);
    expect(overdue(cards, DAY, 'done').map((one) => one.id)).toEqual(['late']);
  });

  it('lists overdue and due cards, the oldest first', () => {
    expect(mineFor(cards, DAY, 'done').map((one) => one.id)).toEqual(['late', 'today']);
  });

  it('lists what comes due next, nearest first', () => {
    expect(dueNext(cards, DAY, 'done', 2).map((one) => one.id)).toEqual(['today', 'next']);
  });
});

describe('time on the day', () => {
  const cards = [
    task({ timeEntries: [entry(), entry({ id: 'e2', phaseId: null, seconds: 300 })] }),
    task({ id: 't2', timeEntries: [entry({ id: 'e3', startedAt: '2026-10-13 09:00:00' })] }),
    task({ id: 't3', timeEntries: [entry({ id: 'e4', running: true, seconds: 60 })] }),
  ];

  it('sums per phase, a running timer included', () => {
    expect(phaseSecondsOn(cards, DAY, 30)).toEqual({ p1: 690, '': 300 });
  });

  it('sums everything started that day', () => {
    expect(secondsOn(cards, DAY, 0)).toBe(960);
  });
});

describe('weekCounts', () => {
  it('counts finished cards from Monday to Sunday', () => {
    const cards = [
      task({ columnId: 'done', doneAt: '2026-10-12 10:00:00' }),
      task({ id: 'b', columnId: 'done', doneAt: '2026-10-14 10:00:00' }),
      task({ id: 'c', columnId: 'done', doneAt: '2026-10-14 12:00:00' }),
      task({ id: 'moved back', doneAt: '2026-10-14 12:00:00' }),
    ];
    const week = weekCounts(cards, DAY, 'done');
    expect(week.map((one) => one.count)).toEqual([1, 0, 2, 0, 0, 0, 0]);
    expect(week[0].day).toBe('2026-10-12');
  });
});

describe('categoryProgress', () => {
  const kinds: Category[] = [
    { id: 'c1', name: 'Story', color: 'blue', position: 1, icon: null, description: null, status: 'active', dueDate: null, pinned: false },
    { id: 'c2', name: 'Leer', color: 'red', position: 2, icon: null, description: null, status: 'active', dueDate: null, pinned: false },
  ];

  it('shares finished cards per category', () => {
    const cards = [task({ categoryId: 'c1', columnId: 'done' }), task({ id: 'b', categoryId: 'c1' })];
    const [story, empty] = categoryProgress(cards, kinds, 'done');
    expect(story).toEqual({ category: kinds[0], done: 1, total: 2, percent: 50 });
    expect(empty.percent).toBe(0);
  });
});

describe('share', () => {
  it('stays between 0 and 1', () => {
    expect(share(3, 2)).toBe(1);
    expect(share(1, 0)).toBe(0);
    expect(share(1, 4)).toBe(0.25);
  });
});

describe('deadlineBuckets', () => {
  it('sorts due dates into windows seen from the day', () => {
    const cards = [
      task({ dueDate: '2026-10-01' }),
      task({ id: 'b', dueDate: DAY }),
      task({ id: 'c', dueDate: '2026-10-21' }),
      task({ id: 'd', dueDate: '2026-10-22' }),
      task({ id: 'e' }),
      task({ id: 'done', columnId: 'done', dueDate: '2026-10-01' }),
    ];
    expect(deadlineBuckets(cards, DAY, 'done')).toEqual({ overdue: 1, today: 1, week: 1, later: 1, none: 1 });
  });
});

describe('daysUntil', () => {
  it('counts whole days forward and back', () => {
    expect(daysUntil('2026-10-16', DAY)).toBe(2);
    expect(daysUntil('2026-10-11', DAY)).toBe(-3);
    expect(daysUntil(DAY, DAY)).toBe(0);
  });
});

describe('lastWeekTotal', () => {
  it('counts what was finished the week before', () => {
    const cards = [
      task({ columnId: 'done', doneAt: '2026-10-06 10:00:00' }),
      task({ id: 'b', columnId: 'done', doneAt: '2026-10-12 10:00:00' }),
    ];
    expect(lastWeekTotal(cards, DAY, 'done')).toBe(1);
  });
});

describe('categoryRows', () => {
  it('adds open cards, the next date and the people of a category', () => {
    const kinds: Category[] = [{ id: 'c1', name: 'Story', color: 'blue', position: 1, icon: null, description: null, status: 'active', dueDate: null, pinned: false }];
    const cards = [
      task({ categoryId: 'c1', dueDate: '2026-10-20', contactIds: ['p1'] }),
      task({ id: 'b', categoryId: 'c1', dueDate: '2026-10-16', contactIds: ['p1', 'p2'] }),
      task({ id: 'c', categoryId: 'c1', columnId: 'done', dueDate: '2026-10-01' }),
    ];
    const [row] = categoryRows(cards, kinds, 'done');
    expect(row.open).toBe(2);
    expect(row.nextDue).toBe('2026-10-16');
    expect(row.contactIds).toEqual(['p1', 'p2']);
  });
});
