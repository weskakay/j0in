import { dateOf, shift, weekAround } from './board-filter';
import type { Category, Task } from './models';

/** One day cell of the month view. */
export interface DayCell {
  day: string;
  inMonth: boolean;
}

/** One entry on a day: a card that comes due, or an event from the calendar. */
export interface DayEntry {
  id: string;
  kind: 'due' | 'event';
  title: string;
  color: string;
  taskId: string | null;
  /** Minutes after midnight for events with a time, null for the whole day. */
  start: number | null;
  end: number | null;
}

/** An event as the calendar service hands it over. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  taskId: string | null;
}

/** Minutes in a day, where an event that runs past midnight ends. */
const DAY_MINUTES = 24 * 60;

/** The colour of events, which have no project of their own. */
const EVENT_COLOR = 'var(--j0in-accent)';

/**
 * The days of a month view: from the Monday on or before the first to the
 * Sunday on or after the last, so five or six whole weeks.
 */
export function monthCells(year: number, month: number): DayCell[] {
  const first = shift(new Date(year, month, 1), 0);
  const last = shift(new Date(year, month + 1, 0), 0);
  const start = dateOf(weekAround(first)[0]);
  const end = weekAround(last)[1];
  const cells: DayCell[] = [];
  for (let offset = 0; shift(start, offset) <= end; offset++) {
    const day = shift(start, offset);
    cells.push({ day, inMonth: day.slice(0, 7) === first.slice(0, 7) });
  }
  return cells;
}

/** The seven days of the week a day falls in, Monday first. */
export function weekDays(day: string): string[] {
  const monday = dateOf(weekAround(day)[0]);
  return Array.from({ length: 7 }, (_, index) => shift(monday, index));
}

/** Minutes after midnight of a timestamp, in this browser's time. */
export function minutesOf(stamp: string): number {
  const date = new Date(stamp);
  return date.getHours() * 60 + date.getMinutes();
}

/** Every entry of one day: events by their start, cards due that day at the end. */
export function entriesOn(day: string, tasks: Task[], events: CalendarEvent[], projects: Category[]): DayEntry[] {
  const timed = events
    .filter((event) => touches(event, day))
    .map((event) => eventEntry(event, day))
    .sort((a, b) => (a.start ?? -1) - (b.start ?? -1));
  const due = tasks.filter((task) => task.dueDate === day).map((task) => dueEntry(task, projects));
  return [...timed, ...due];
}

/** The day a timestamp falls on in this browser, or the date of an all-day event. */
function dayOf(stamp: string): string {
  return stamp.length === 10 ? stamp : shift(new Date(stamp), 0);
}

/** Whether an event reaches into a day. All-day ends and a midnight end are exclusive. */
function touches(event: CalendarEvent, day: string): boolean {
  const first = dayOf(event.start);
  const exclusive = event.allDay || minutesOf(event.end) === 0;
  const last = exclusive ? shift(dateOf(dayOf(event.end)), -1) : dayOf(event.end);
  return first <= day && day <= (last < first ? first : last);
}

/** An event as an entry; on the days after its start it counts as all-day. */
function eventEntry(event: CalendarEvent, day: string): DayEntry {
  const timed = !event.allDay && dayOf(event.start) === day;
  const end = timed && dayOf(event.end) === day ? minutesOf(event.end) : DAY_MINUTES;
  return {
    id: `event-${event.id}`,
    kind: 'event',
    title: event.title,
    color: EVENT_COLOR,
    taskId: event.taskId,
    start: timed ? minutesOf(event.start) : null,
    end: timed ? end : null,
  };
}

/** A card that comes due, in the colour of its project. */
function dueEntry(task: Task, projects: Category[]): DayEntry {
  const color = projects.find((project) => project.id === task.categoryId)?.color ?? 'var(--j0in-text-muted)';
  return { id: `due-${task.id}`, kind: 'due', title: task.title, color, taskId: task.id, start: null, end: null };
}

/** Clock time of minutes after midnight, such as 9:05 or 14:30. */
export function clockOf(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${`${minutes % 60}`.padStart(2, '0')}`;
}
