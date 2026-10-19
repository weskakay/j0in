import type { Category, Contact, Task } from './models';
import { averageLoad, mainProject, membersOf } from './team';

/** A contact with just enough filled in. */
function person(id: string): Contact {
  return { id, name: id, email: null, phone: null, color: 'blue' };
}

/** A project with just enough filled in. */
function project(id: string): Category {
  return { id, name: id, color: 'blue', position: 1, icon: null, description: null, status: 'active', dueDate: null, pinned: false };
}

/** A card with just enough filled in. */
function task(id: string, parts: Partial<Task> = {}): Task {
  return {
    id, columnId: 'todo', categoryId: null, title: id, description: null, dueDate: null,
    priority: 'medium', position: 1, subtasks: [], contactIds: ['ana'], timeEntries: [],
    doneAt: null, estimateMinutes: null, ...parts,
  };
}

const CONTEXT = { day: '2026-10-14', lastId: 'done', capacity: 10 };

describe('membersOf', () => {
  const tasks = [
    task('a', { dueDate: '2026-10-15', estimateMinutes: 180, categoryId: 'p1' }),
    task('b', { dueDate: '2026-10-30', estimateMinutes: 600, categoryId: 'p2' }),
    task('c', { dueDate: '2026-10-12', estimateMinutes: 120, categoryId: 'p1' }),
    task('d', { columnId: 'done', doneAt: '2026-10-13 10:00:00' }),
    task('e', { columnId: 'done', doneAt: '2026-10-01 10:00:00' }),
  ];

  it('sums this week’s estimates and sets them against the capacity', () => {
    const [ana] = membersOf([person('ana')], tasks, [project('p1'), project('p2')], CONTEXT);
    expect(ana.hours).toBe(5);
    expect(ana.load).toBe(50);
    expect(ana.open.length).toBe(3);
    expect(ana.doneWeek).toBe(1);
    expect(ana.project?.id).toBe('p1');
  });

  it('holds the bar at full', () => {
    const [ana] = membersOf([person('ana')], tasks, [], { ...CONTEXT, capacity: 1 });
    expect(ana.load).toBe(100);
  });
});

describe('mainProject', () => {
  it('has none for cards without a project', () => {
    expect(mainProject([task('x')], [project('p1')])).toBeNull();
  });
});

describe('averageLoad', () => {
  it('averages the loads and copes with nobody', () => {
    const members = membersOf([person('ana'), person('bo')], [], [], CONTEXT);
    expect(averageLoad(members)).toBe(0);
    expect(averageLoad([])).toBe(0);
  });
});
