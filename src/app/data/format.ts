import type { Lang } from './i18n';
import type { Contact, Task, TimeEntry, TimePhase } from './models';

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

/** Turns a date like 2026-09-15 into 15.09.2026, or 15/09/2026 in English. */
export function dateIn(value: string | null, lang: Lang): string {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-');
  return lang === 'en' ? `${day}/${month}/${year}` : `${day}.${month}.${year}`;
}

/** Today as the API writes dates, so due dates can be compared as strings. */
export function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Picks the contacts a task is assigned to, in board order. */
export function assigneesOf(task: Task, contacts: Contact[]): Contact[] {
  return contacts.filter((contact) => task.contactIds.includes(contact.id));
}

/** Seconds of one entry; a running one adds the time since the board was read. */
export function entrySeconds(entry: TimeEntry, sinceRead: number): number {
  return entry.running ? entry.seconds + sinceRead : entry.seconds;
}

/** All seconds booked on a task, a running timer included. */
export function taskSeconds(task: Task, sinceRead: number): number {
  return task.timeEntries.reduce((sum, entry) => sum + entrySeconds(entry, sinceRead), 0);
}

/** Seconds per phase id; entries without a phase are gathered under the empty key. */
export function secondsByPhase(task: Task, sinceRead: number): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const entry of task.timeEntries) {
    const key = entry.phaseId ?? '';
    sums[key] = (sums[key] ?? 0) + entrySeconds(entry, sinceRead);
  }
  return sums;
}

/** A duration the way people say it: 45 min, 2 h or 2 h 15 min. */
export function durationText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} min`;
  }
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** A running clock: 4:05 below an hour, 1:04:05 from then on. */
export function clockText(seconds: number): string {
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = Math.floor(seconds % 60);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** The phase of the entry started last anywhere on the board, or null. */
export function lastPhaseId(tasks: Task[]): string | null {
  const latest = tasks
    .flatMap((task) => task.timeEntries)
    .filter((entry) => entry.phaseId !== null)
    .reduce<TimeEntry | null>((best, entry) => (!best || entry.startedAt > best.startedAt ? entry : best), null);
  return latest?.phaseId ?? null;
}

/**
 * The phase a new timer starts on: the one picked last, else the one booked
 * last, else the first. A phase that no longer exists is skipped.
 */
export function pickPhase(phases: TimePhase[], ...wishes: (string | null)[]): string | null {
  const known = (id: string | null): boolean => phases.some((phase) => phase.id === id);
  return wishes.find(known) ?? phases[0]?.id ?? null;
}
