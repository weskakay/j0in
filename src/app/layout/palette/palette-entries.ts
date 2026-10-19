import type { Dictionary } from '../../data/i18n';
import type { Category, Contact, Task } from '../../data/models';
import { bestMatches } from '../../data/search';

/** The groups of the palette, in the order they are listed. */
export type PaletteGroup = 'pages' | 'actions' | 'tasks' | 'categories' | 'contacts';

/** What choosing an entry does, carried out by the palette. */
export type PaletteCommand =
  | { kind: 'go'; path: string[]; query?: Record<string, string> }
  | { kind: 'theme' }
  | { kind: 'look' }
  | { kind: 'focus'; taskId: string }
  | { kind: 'signOut' };

/** One line of the palette. */
export interface PaletteEntry {
  id: string;
  group: PaletteGroup;
  label: string;
  color?: string;
  command: PaletteCommand;
}

/** Everything the palette searches through. */
export interface PaletteSource {
  t: Dictionary;
  tasks: Task[];
  categories: Category[];
  contacts: Contact[];
  tracking: boolean;
  /** The length a focus run starts with, for the label. */
  focusMinutes: number;
}

/** The screens the palette can jump to, in the order of the navigation. */
type PageKey = 'home' | 'board' | 'projects' | 'calendar' | 'contacts' | 'insights' | 'settings';

const PAGES: PageKey[] = ['home', 'board', 'projects', 'calendar', 'contacts', 'insights', 'settings'];

/** How many hits each searched group shows at most. */
const PER_GROUP = 6;

/**
 * The entries matching a term, grouped and in the order they are listed.
 * Before anything is typed only the pages and actions show, so the list
 * opens short instead of with every card of the board.
 */
export function paletteEntries(source: PaletteSource, term: string): PaletteEntry[] {
  if (term.trim() === '') {
    return [...pages(source.t), ...actions(source.t)];
  }
  return [
    ...bestMatches(pages(source.t), term, labelOf, PER_GROUP),
    ...bestMatches(actions(source.t), term, labelOf, PER_GROUP),
    ...focusFor(source, term),
    ...bestMatches(taskEntries(source.tasks), term, labelOf, PER_GROUP),
    ...bestMatches(categoryEntries(source.categories), term, labelOf, PER_GROUP),
    ...bestMatches(contactEntries(source.contacts), term, labelOf, PER_GROUP),
  ];
}

/** The text an entry is searched by. */
function labelOf(entry: PaletteEntry): string {
  return entry.label;
}

/** The screens of the navigation. */
function pages(t: Dictionary): PaletteEntry[] {
  const page = (key: PageKey): PaletteEntry => ({
    id: `page-${key}`,
    group: 'pages',
    label: t.nav[key],
    command: { kind: 'go', path: [`/${key}`] },
  });
  return PAGES.map(page);
}

/** Things to do rather than places to go. */
function actions(t: Dictionary): PaletteEntry[] {
  return [
    { id: 'act-new', group: 'actions', label: t.palette.newTask, command: { kind: 'go', path: ['/board'], query: { new: '1' } } },
    { id: 'act-theme', group: 'actions', label: t.palette.theme, command: { kind: 'theme' } },
    { id: 'act-look', group: 'actions', label: t.palette.look, command: { kind: 'look' } },
    { id: 'act-out', group: 'actions', label: t.palette.signOut, command: { kind: 'signOut' } },
  ];
}

/** A focus run for the best few cards, offered once something was typed. */
function focusFor(source: PaletteSource, term: string): PaletteEntry[] {
  if (!source.tracking || term.trim() === '') {
    return [];
  }
  return bestMatches(source.tasks, term, (task) => task.title, 2).map((task) => ({
    id: `focus-${task.id}`,
    group: 'actions',
    label: `${source.t.palette.focus} ${source.focusMinutes} ${source.t.home.minutes}: ${task.title}`,
    command: { kind: 'focus', taskId: task.id },
  }));
}

/** Every card, opening its panel. */
function taskEntries(tasks: Task[]): PaletteEntry[] {
  return tasks.map((task) => ({
    id: `task-${task.id}`,
    group: 'tasks',
    label: task.title,
    command: { kind: 'go', path: ['/board', task.id] },
  }));
}

/** Every category, showing the board narrowed to it. */
function categoryEntries(categories: Category[]): PaletteEntry[] {
  return categories.map((category) => ({
    id: `cat-${category.id}`,
    group: 'categories',
    label: category.name,
    color: category.color,
    command: { kind: 'go', path: ['/board'], query: { category: category.id } },
  }));
}

/** Every contact, leading to the address book. */
function contactEntries(contacts: Contact[]): PaletteEntry[] {
  return contacts.map((contact) => ({
    id: `person-${contact.id}`,
    group: 'contacts',
    label: contact.name,
    color: contact.color,
    command: { kind: 'go', path: ['/contacts'] },
  }));
}
