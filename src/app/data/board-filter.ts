import type { Priority, Task } from './models';

/** What the filter bar narrows the board to; null means no limit. */
export interface BoardFilter {
  category: string | null;
  priority: Priority | null;
}

/** The figures above the board. */
export interface BoardStats {
  open: number;
  dueWeek: number;
  overdue: number;
  doneWeek: number;
}

/** The cards that pass the filter. */
export function filterTasks(tasks: Task[], filter: BoardFilter): Task[] {
  return tasks.filter(
    (task) =>
      (filter.category === null || task.categoryId === filter.category) &&
      (filter.priority === null || task.priority === filter.priority),
  );
}

/** Whether a filter limits anything at all. */
export function isFiltering(filter: BoardFilter): boolean {
  return filter.category !== null || filter.priority !== null;
}

/** Reads a priority from the address bar, dropping anything unknown. */
export function priorityFrom(value: string | null): Priority | null {
  return value === 'urgent' || value === 'medium' || value === 'low' ? value : null;
}

/**
 * Counts the cards for the figures above the board. A card counts as done
 * once it sits in the last column. Dates are compared as the API writes
 * them, YYYY-MM-DD, with the week running from Monday to Sunday.
 */
export function boardStats(tasks: Task[], lastColumnId: string | null, day: string): BoardStats {
  const [monday, sunday] = weekAround(day);
  const open = tasks.filter((task) => task.columnId !== lastColumnId);
  const due = (task: Task) => task.dueDate ?? '';
  return {
    open: open.length,
    dueWeek: open.filter((task) => due(task) >= day && due(task) <= sunday).length,
    overdue: open.filter((task) => due(task) !== '' && due(task) < day).length,
    doneWeek: tasks.filter((task) => (task.doneAt ?? '').slice(0, 10) >= monday && task.columnId === lastColumnId)
      .length,
  };
}

/** Monday and Sunday of the week a day falls in. */
export function weekAround(day: string): [string, string] {
  const date = dateOf(day);
  const back = (date.getDay() + 6) % 7;
  return [shift(date, -back), shift(date, 6 - back)];
}

/** A day plus or minus some days, written as the API writes dates. */
export function shift(date: Date, days: number): string {
  const moved = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const month = `${moved.getMonth() + 1}`.padStart(2, '0');
  return `${moved.getFullYear()}-${month}-${`${moved.getDate()}`.padStart(2, '0')}`;
}

/** A YYYY-MM-DD day as a local date at midnight. */
export function dateOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}
