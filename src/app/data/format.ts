import type { Contact, Priority, Task } from './models';

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Dringend',
  medium: 'Mittel',
  low: 'Niedrig',
};

/** German wording for a priority, since the API stores the English key. */
export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

/** First letters of the first and last word, used on the small avatars. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** How many subtasks are ticked off. */
export function doneCount(task: Task): number {
  return task.subtasks.filter((subtask) => subtask.isDone).length;
}

/** Share of finished subtasks between 0 and 100, for the progress bar. */
export function donePercent(task: Task): number {
  if (task.subtasks.length === 0) {
    return 0;
  }
  return Math.round((doneCount(task) / task.subtasks.length) * 100);
}

/** Turns a date like 2026-09-15 into 15.09.2026. */
export function germanDate(value: string | null): string {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

/** Today as the API writes dates, so due dates can be compared as strings. */
export function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Morning, afternoon or evening, for the greeting on the summary. */
export function greeting(hour: number): string {
  if (hour < 11) {
    return 'Guten Morgen';
  }
  if (hour < 18) {
    return 'Guten Tag';
  }
  return 'Guten Abend';
}

/** Picks the contacts a task is assigned to, in board order. */
export function assigneesOf(task: Task, contacts: Contact[]): Contact[] {
  return contacts.filter((contact) => task.contactIds.includes(contact.id));
}
