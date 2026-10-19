import { weekDays } from './calendar-grid';
import type { Category, Contact, Task } from './models';

/** What the team page knows about one person. */
export interface Member {
  contact: Contact;
  open: Task[];
  doneWeek: number;
  /** Hours of the open cards due this week, from their estimates. */
  hours: number;
  /** The share of the weekly capacity those hours take, in percent, at most 100 for the bar. */
  load: number;
  project: Category | null;
}

/**
 * Every contact with the cards on them: open ones, those finished this week,
 * the hours this week's open cards are estimated at against the capacity, and
 * the project most of their open cards belong to.
 */
export function membersOf(contacts: Contact[], tasks: Task[], projects: Category[], context: TeamContext): Member[] {
  const week = weekDays(context.day);
  return contacts.map((contact) => memberOf(contact, tasks, projects, { ...context, week }));
}

/** One person, worked out for the week given. */
function memberOf(contact: Contact, tasks: Task[], projects: Category[], context: TeamContext & { week: string[] }): Member {
  const own = tasks.filter((task) => task.contactIds.includes(contact.id));
  const open = own.filter((task) => task.columnId !== context.lastId);
  const thisWeek = (day: string | null) => context.week.includes((day ?? '').slice(0, 10));
  const minutes = open.filter((task) => thisWeek(task.dueDate)).reduce((sum, task) => sum + (task.estimateMinutes ?? 0), 0);
  const hours = Math.round((minutes / 60) * 10) / 10;
  const doneWeek = own.filter((task) => task.columnId === context.lastId && thisWeek(task.doneAt)).length;
  return { contact, open, doneWeek, hours, load: loadOf(hours, context.capacity), project: mainProject(open, projects) };
}

/** The day, the column that means done and the hours of a week. */
export interface TeamContext {
  day: string;
  lastId: string | null;
  capacity: number;
}

/** Hours against the capacity, in percent, held to 100 for the bar. */
function loadOf(hours: number, capacity: number): number {
  return capacity <= 0 ? 0 : Math.min(100, Math.round((hours / capacity) * 100));
}

/** The project most of the cards belong to, or null. */
export function mainProject(tasks: Task[], projects: Category[]): Category | null {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.categoryId) {
      counts.set(task.categoryId, (counts.get(task.categoryId) ?? 0) + 1);
    }
  }
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return projects.find((project) => project.id === best?.[0]) ?? null;
}

/** The average load of everyone, in percent. */
export function averageLoad(members: Member[]): number {
  return members.length === 0 ? 0 : Math.round(members.reduce((sum, one) => sum + one.load, 0) / members.length);
}
