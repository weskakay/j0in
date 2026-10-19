import type { Category, Task } from './models';
import { entrySeconds } from './format';
import { dateOf, shift, weekAround } from './board-filter';

/** One day of the week chart. */
export interface DayCount {
  day: string;
  count: number;
}

/** How far one category has come. */
export interface CategoryProgress {
  category: Category;
  done: number;
  total: number;
  percent: number;
}

/** Morning, day or evening, by the hour. */
export function partOfDay(hour: number): 'morning' | 'day' | 'evening' {
  if (hour < 11) {
    return 'morning';
  }
  return hour < 18 ? 'day' : 'evening';
}

/** The date part of a timestamp the server wrote, such as 2026-10-18. */
function dayOf(stamp: string | null): string {
  return (stamp ?? '').slice(0, 10);
}

/** Cards in the last column that were finished on the given day. */
export function doneOn(tasks: Task[], day: string, lastId: string | null): Task[] {
  return tasks.filter((task) => task.columnId === lastId && dayOf(task.doneAt) === day);
}

/** Open cards due on the given day. */
export function dueOn(tasks: Task[], day: string, lastId: string | null): Task[] {
  return tasks.filter((task) => task.columnId !== lastId && task.dueDate === day);
}

/** Open cards whose due date lies before the given day. */
export function overdue(tasks: Task[], day: string, lastId: string | null): Task[] {
  return tasks.filter((task) => task.columnId !== lastId && !!task.dueDate && task.dueDate < day);
}

/** Open cards due on the day or before it, the oldest first. */
export function mineFor(tasks: Task[], day: string, lastId: string | null): Task[] {
  return [...overdue(tasks, day, lastId), ...dueOn(tasks, day, lastId)].sort((a, b) =>
    (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
  );
}

/** The next open cards due from the day on, the nearest first. */
export function dueNext(tasks: Task[], day: string, lastId: string | null, limit: number): Task[] {
  return tasks
    .filter((task) => task.columnId !== lastId && !!task.dueDate && task.dueDate >= day)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, limit);
}

/** Seconds booked per phase on runs started on the given day; no phase is the empty key. */
export function phaseSecondsOn(tasks: Task[], day: string, sinceRead: number): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const entry of tasks.flatMap((task) => task.timeEntries)) {
    if (dayOf(entry.startedAt) === day) {
      const key = entry.phaseId ?? '';
      sums[key] = (sums[key] ?? 0) + entrySeconds(entry, sinceRead);
    }
  }
  return sums;
}

/** All seconds booked on runs started on the given day. */
export function secondsOn(tasks: Task[], day: string, sinceRead: number): number {
  return Object.values(phaseSecondsOn(tasks, day, sinceRead)).reduce((sum, seconds) => sum + seconds, 0);
}

/** Cards finished on each day of the week the given day falls in, Monday first. */
export function weekCounts(tasks: Task[], day: string, lastId: string | null): DayCount[] {
  const monday = dateOf(weekAround(day)[0]);
  return Array.from({ length: 7 }, (_, index) => {
    const date = shift(monday, index);
    return { day: date, count: doneOn(tasks, date, lastId).length };
  });
}

/** Every category with the share of its cards that reached the last column. */
export function categoryProgress(tasks: Task[], categories: Category[], lastId: string | null): CategoryProgress[] {
  return categories.map((category) => {
    const own = tasks.filter((task) => task.categoryId === category.id);
    const done = own.filter((task) => task.columnId === lastId).length;
    const percent = own.length === 0 ? 0 : Math.round((done / own.length) * 100);
    return { category, done, total: own.length, percent };
  });
}

/** A share between 0 and 1, safe for an empty whole. */
export function share(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.min(1, part / whole);
}

/** The five windows the due dates are sorted into. */
export interface DeadlineBuckets {
  overdue: number;
  today: number;
  week: number;
  later: number;
  none: number;
}

/** How many open cards fall into each due-date window, seen from the given day. */
export function deadlineBuckets(tasks: Task[], day: string, lastId: string | null): DeadlineBuckets {
  const weekEnd = shift(dateOf(day), 7);
  const buckets: DeadlineBuckets = { overdue: 0, today: 0, week: 0, later: 0, none: 0 };
  for (const task of tasks.filter((one) => one.columnId !== lastId)) {
    buckets[bucketFor(task.dueDate, day, weekEnd)] += 1;
  }
  return buckets;
}

/** Which window one due date belongs to. */
function bucketFor(due: string | null, day: string, weekEnd: string): keyof DeadlineBuckets {
  if (!due) {
    return 'none';
  }
  if (due < day) {
    return 'overdue';
  }
  if (due === day) {
    return 'today';
  }
  return due <= weekEnd ? 'week' : 'later';
}

/** Whole days from one day to another; negative when the second lies before. */
export function daysUntil(due: string, day: string): number {
  return Math.round((dateOf(due).getTime() - dateOf(day).getTime()) / 86_400_000);
}

/** Cards finished in the week before the one the day falls in. */
export function lastWeekTotal(tasks: Task[], day: string, lastId: string | null): number {
  const weekBefore = shift(dateOf(day), -7);
  return weekCounts(tasks, weekBefore, lastId).reduce((sum, one) => sum + one.count, 0);
}

/** One category as the home screen lists it. */
export interface CategoryRow extends CategoryProgress {
  open: number;
  nextDue: string | null;
  contactIds: string[];
}

/** Every category with its progress, open cards, next date and the people on it. */
export function categoryRows(tasks: Task[], categories: Category[], lastId: string | null): CategoryRow[] {
  return categoryProgress(tasks, categories, lastId).map((row) => {
    const own = tasks.filter((task) => task.categoryId === row.category.id);
    const open = own.filter((task) => task.columnId !== lastId);
    const dates = open.map((task) => task.dueDate).filter((date): date is string => !!date).sort();
    const contactIds = [...new Set(own.flatMap((task) => task.contactIds))];
    return { ...row, open: open.length, nextDue: dates[0] ?? null, contactIds };
  });
}
