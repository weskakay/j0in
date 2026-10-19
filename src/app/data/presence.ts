import type { Contact, Task } from './models';

/** What a contact is up to, as far as the board can tell. */
export type PresenceState = 'focus' | 'busy' | 'free';

/** One contact with what they are up to. */
export interface Presence {
  contact: Contact;
  state: PresenceState;
  open: number;
  focusTitle: string | null;
}

/**
 * What each contact is up to, worked out from the board alone: in focus when
 * the timer runs on one of their cards, busy with open cards, free without.
 * Those in focus come first, then the busiest.
 */
export function presenceOf(contacts: Contact[], tasks: Task[], runningTaskId: string | null, lastId: string | null): Presence[] {
  const running = tasks.find((task) => task.id === runningTaskId) ?? null;
  return contacts
    .map((contact) => {
      const open = tasks.filter((task) => task.columnId !== lastId && task.contactIds.includes(contact.id)).length;
      const inFocus = !!running && running.contactIds.includes(contact.id);
      const state: PresenceState = inFocus ? 'focus' : open > 0 ? 'busy' : 'free';
      return { contact, state, open, focusTitle: inFocus ? running.title : null };
    })
    .sort((a, b) => rank(a) - rank(b) || b.open - a.open);
}

/** Focus first, then busy, then free. */
function rank(entry: Presence): number {
  return ['focus', 'busy', 'free'].indexOf(entry.state);
}
