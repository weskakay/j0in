import {
  assigneesOf,
  doneCount,
  donePercent,
  dateIn,
  initialsOf,
} from './format';
import type { Contact, Task } from './models';

/** A task with just enough filled in for the function under test. */
function task(parts: Partial<Task> = {}): Task {
  return {
    id: 't1',
    columnId: 'c1',
    categoryId: null,
    title: 'Titel',
    description: null,
    dueDate: null,
    priority: 'medium',
    position: 1,
    subtasks: [],
    contactIds: [],
    ...parts,
  };
}

describe('initialsOf', () => {
  it('nimmt den ersten und den letzten Namen', () => {
    expect(initialsOf('Josefin Brandt')).toBe('JB');
  });

  it('kommt mit einem einzelnen Namen aus', () => {
    expect(initialsOf('Gast')).toBe('G');
  });

  it('überspringt doppelte Leerzeichen', () => {
    expect(initialsOf('  Nuno   Sanchez  ')).toBe('NS');
  });

  it('nimmt bei drei Namen den ersten und den letzten', () => {
    expect(initialsOf('Anna Maria Weber')).toBe('AW');
  });

  it('antwortet auf einen leeren Namen mit einem Fragezeichen', () => {
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('Teilaufgaben', () => {
  it('zählt nur die erledigten', () => {
    const one = task({
      subtasks: [
        { id: 's1', title: 'a', isDone: true, position: 1 },
        { id: 's2', title: 'b', isDone: false, position: 2 },
      ],
    });
    expect(doneCount(one)).toBe(1);
    expect(donePercent(one)).toBe(50);
  });

  it('teilt ohne Teilaufgaben nicht durch null', () => {
    expect(donePercent(task())).toBe(0);
  });

  it('rundet auf ganze Prozent', () => {
    const three = task({
      subtasks: [
        { id: 's1', title: 'a', isDone: true, position: 1 },
        { id: 's2', title: 'b', isDone: false, position: 2 },
        { id: 's3', title: 'c', isDone: false, position: 3 },
      ],
    });
    expect(donePercent(three)).toBe(33);
  });
});

describe('dateIn', () => {
  it('dreht die Reihenfolge um', () => {
    expect(dateIn('2026-09-12', 'de')).toBe('12.09.2026');
  });

  it('schreibt englisch mit Schrägstrichen', () => {
    expect(dateIn('2026-09-12', 'en')).toBe('12/09/2026');
  });

  it('gibt bei fehlendem Datum nichts zurück', () => {
    expect(dateIn(null, 'de')).toBe('');
  });
});

describe('assigneesOf', () => {
  const people: Contact[] = [
    { id: 'p1', name: 'Josefin Brandt', email: null, phone: null, color: '#29abe2' },
    { id: 'p2', name: 'Nuno Sanchez', email: null, phone: null, color: '#ff4646' },
  ];

  it('nimmt nur die zugewiesenen, in der Reihenfolge des Boards', () => {
    const picked = assigneesOf(task({ contactIds: ['p2'] }), people);
    expect(picked.map((one) => one.name)).toEqual(['Nuno Sanchez']);
  });

  it('ignoriert Kennungen, die es nicht mehr gibt', () => {
    expect(assigneesOf(task({ contactIds: ['weg'] }), people)).toEqual([]);
  });
});
