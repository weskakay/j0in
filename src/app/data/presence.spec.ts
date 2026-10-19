import type { Contact, Task } from './models';
import { presenceOf } from './presence';

/** A contact with just enough filled in. */
function person(id: string): Contact {
  return { id, name: id, email: null, phone: null, color: 'blue' };
}

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

describe('presenceOf', () => {
  const people = [person('free'), person('busy'), person('focus')];
  const cards = [
    task({ id: 'a', contactIds: ['busy'] }),
    task({ id: 'b', contactIds: ['busy'] }),
    task({ id: 'run', title: 'Läuft', contactIds: ['focus'] }),
    task({ id: 'done', columnId: 'done', contactIds: ['free'] }),
  ];

  it('puts the one in focus first, then the busiest, then the free', () => {
    const order = presenceOf(people, cards, 'run', 'done').map((one) => one.contact.id);
    expect(order).toEqual(['focus', 'busy', 'free']);
  });

  it('names the card the timer runs on and counts only open cards', () => {
    const [focus, busy, free] = presenceOf(people, cards, 'run', 'done');
    expect(focus.focusTitle).toBe('Läuft');
    expect(busy.open).toBe(2);
    expect(free.state).toBe('free');
  });

  it('knows nobody in focus while no timer runs', () => {
    expect(presenceOf(people, cards, null, 'done')[0].state).toBe('busy');
  });
});
