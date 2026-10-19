import type { Task } from './models';
import { clockOf, entriesOn, monthCells, weekDays, type CalendarEvent } from './calendar-grid';

/** A card with just enough filled in. */
function task(id: string, parts: Partial<Task> = {}): Task {
  return {
    id, columnId: 'c1', categoryId: null, title: id, description: null, dueDate: null,
    priority: 'medium', position: 1, subtasks: [], contactIds: [], timeEntries: [],
    doneAt: null, estimateMinutes: null, ...parts,
  };
}

describe('monthCells', () => {
  it('runs from the Monday before the first to the Sunday after the last', () => {
    const cells = monthCells(2026, 9);
    expect(cells[0]).toEqual({ day: '2026-09-28', inMonth: false });
    expect(cells.at(-1)).toEqual({ day: '2026-11-01', inMonth: false });
    expect(cells.length).toBe(35);
  });

  it('takes six weeks when the month needs them', () => {
    expect(monthCells(2026, 7).length).toBe(42);
  });
});

describe('weekDays', () => {
  it('lists Monday to Sunday', () => {
    expect(weekDays('2026-10-15')).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ]);
  });
});

describe('entriesOn', () => {
  const events: CalendarEvent[] = [
    { id: 'b', title: 'Später', start: '2026-10-15T14:00:00', end: '2026-10-15T15:00:00', allDay: false, taskId: null },
    { id: 'a', title: 'Früher', start: '2026-10-15T09:30:00', end: '2026-10-15T10:00:00', allDay: false, taskId: 't9' },
    { id: 'c', title: 'Anderer Tag', start: '2026-10-16T09:00:00', end: '2026-10-16T10:00:00', allDay: false, taskId: null },
  ];

  it('orders events by start and puts due cards last', () => {
    const tasks = [task('t1', { dueDate: '2026-10-15' }), task('t2', { dueDate: '2026-10-16' })];
    const entries = entriesOn('2026-10-15', tasks, events, []);
    expect(entries.map((one) => one.title)).toEqual(['Früher', 'Später', 't1']);
    expect(entries[0].start).toBe(570);
    expect(entries[2].kind).toBe('due');
  });

  it('shows an all-day event on every day up to its exclusive end', () => {
    const trip: CalendarEvent[] = [{ id: 't', title: 'Reise', start: '2026-10-14', end: '2026-10-17', allDay: true, taskId: null }];
    expect(entriesOn('2026-10-16', [], trip, []).length).toBe(1);
    expect(entriesOn('2026-10-17', [], trip, []).length).toBe(0);
  });

  it('ends an event past midnight at the end of its first day', () => {
    const late: CalendarEvent[] = [{ id: 'n', title: 'Nacht', start: '2026-10-15T23:00:00', end: '2026-10-16T01:00:00', allDay: false, taskId: null }];
    expect(entriesOn('2026-10-15', [], late, [])[0].end).toBe(24 * 60);
    expect(entriesOn('2026-10-16', [], late, [])[0].start).toBeNull();
  });

  it('leaves the next day alone when an event ends exactly at midnight', () => {
    const evening: CalendarEvent[] = [{ id: 'm', title: 'Abend', start: '2026-10-15T23:00:00', end: '2026-10-16T00:00:00', allDay: false, taskId: null }];
    expect(entriesOn('2026-10-15', [], evening, [])[0].end).toBe(24 * 60);
    expect(entriesOn('2026-10-16', [], evening, []).length).toBe(0);
  });

  it('shows a timed event over several days as all-day on the days after its start', () => {
    const fair: CalendarEvent[] = [{ id: 'f', title: 'Messe', start: '2026-10-14T12:00:00', end: '2026-10-16T12:00:00', allDay: false, taskId: null }];
    expect(entriesOn('2026-10-14', [], fair, [])[0].start).toBe(12 * 60);
    expect(entriesOn('2026-10-15', [], fair, [])[0].start).toBeNull();
    expect(entriesOn('2026-10-16', [], fair, []).length).toBe(1);
  });
});

describe('clockOf', () => {
  it('writes minutes after midnight as a clock time', () => {
    expect(clockOf(545)).toBe('9:05');
    expect(clockOf(870)).toBe('14:30');
  });
});
