import {
  assigneesOf,
  clockText,
  doneCount,
  donePercent,
  dateIn,
  durationText,
  hoursIn,
  initialsOf,
  lastPhaseId,
  pickPhase,
  secondsByPhase,
  taskSeconds,
} from './format';
import type { Contact, Task, TimeEntry, TimePhase } from './models';

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
    timeEntries: [],
    doneAt: null,
    estimateMinutes: null,
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

/** A booked entry with just enough filled in. */
function entry(parts: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    phaseId: 'ph1',
    note: null,
    startedAt: '2026-09-17 09:00:00',
    running: false,
    seconds: 600,
    target: null,
    ...parts,
  };
}

describe('Zeiterfassung', () => {
  it('zählt alle Einträge einer Karte zusammen', () => {
    const one = task({ timeEntries: [entry(), entry({ id: 'e2', seconds: 1200 })] });
    expect(taskSeconds(one, 0)).toBe(1800);
  });

  it('rechnet beim laufenden Timer die Zeit seit dem Laden dazu', () => {
    const one = task({ timeEntries: [entry(), entry({ id: 'e2', running: true, seconds: 60 })] });
    expect(taskSeconds(one, 30)).toBe(690);
  });

  it('sammelt nach Phase und legt Einträge ohne Phase unter den leeren Schlüssel', () => {
    const one = task({
      timeEntries: [entry(), entry({ id: 'e2', seconds: 300 }), entry({ id: 'e3', phaseId: null, seconds: 60 })],
    });
    expect(secondsByPhase(one, 0)).toEqual({ ph1: 900, '': 60 });
  });
});

describe('durationText', () => {
  it('schreibt unter einer Stunde nur Minuten', () => {
    expect(durationText(45 * 60 + 59)).toBe('45 min');
  });

  it('lässt volle Stunden ohne Minuten', () => {
    expect(durationText(2 * 3600)).toBe('2 h');
  });

  it('kombiniert Stunden und Minuten', () => {
    expect(durationText(2 * 3600 + 15 * 60)).toBe('2 h 15 min');
  });
});

describe('clockText', () => {
  it('zeigt Minuten und Sekunden', () => {
    expect(clockText(245)).toBe('4:05');
  });

  it('nimmt ab einer Stunde die Stunden dazu', () => {
    expect(clockText(3845)).toBe('1:04:05');
  });
});

describe('Phase für den nächsten Start', () => {
  const phases: TimePhase[] = [
    { id: 'ph1', name: 'Planen', position: 1 },
    { id: 'ph2', name: 'Testen', position: 2 },
  ];

  it('findet die zuletzt gestartete Phase auf dem ganzen Board', () => {
    const early = task({ timeEntries: [entry({ phaseId: 'ph1', startedAt: '2026-09-17 08:00:00' })] });
    const late = task({ id: 't2', timeEntries: [entry({ phaseId: 'ph2', startedAt: '2026-09-17 10:00:00' })] });
    expect(lastPhaseId([early, late])).toBe('ph2');
  });

  it('nimmt den ersten Wunsch, den es noch gibt', () => {
    expect(pickPhase(phases, 'weg', 'ph2')).toBe('ph2');
  });

  it('fällt auf die erste Phase zurück', () => {
    expect(pickPhase(phases, null, null)).toBe('ph1');
  });

  it('antwortet ohne Phasen mit null', () => {
    expect(pickPhase([], 'ph1')).toBeNull();
  });
});

describe('hoursIn', () => {
  it('writes hours with one decimal in each language', () => {
    expect(hoursIn(9000, 'de')).toBe('2,5');
    expect(hoursIn(9000, 'en')).toBe('2.5');
    expect(hoursIn(7200, 'de')).toBe('2');
  });
});
