import type { Category, Task } from './models';
import { filterProjects, milestoneOf, projectStats } from './projects';

/** A project with just enough filled in. */
function project(id: string, parts: Partial<Category> = {}): Category {
  return {
    id, name: id, color: 'blue', position: 1, icon: null, description: null,
    status: 'active', dueDate: null, pinned: false, ...parts,
  };
}

/** A card with just enough filled in. */
function task(id: string, parts: Partial<Task> = {}): Task {
  return {
    id, columnId: 'todo', categoryId: 'p1', title: id, description: null, dueDate: null,
    priority: 'medium', position: 1, subtasks: [], contactIds: [], timeEntries: [],
    doneAt: null, estimateMinutes: null, ...parts,
  };
}

const DAY = '2026-10-14';

describe('filterProjects', () => {
  const all = [
    project('a', { position: 1 }),
    project('b', { position: 2, status: 'shipped' }),
    project('c', { position: 3, pinned: true }),
  ];

  it('puts pinned projects first', () => {
    expect(filterProjects(all, 'all').map((one) => one.id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps only the wanted state', () => {
    expect(filterProjects(all, 'shipped').map((one) => one.id)).toEqual(['b']);
  });
});

describe('projectStats', () => {
  it('counts active, shipped, on track and due this month', () => {
    const projects = [
      project('p1', { dueDate: '2026-10-30' }),
      project('p2', { dueDate: '2026-10-01' }),
      project('p3', { status: 'shipped' }),
      project('p4', { status: 'planning', dueDate: '2026-12-01' }),
    ];
    const tasks = [task('late', { categoryId: 'p4', dueDate: '2026-10-10' })];
    expect(projectStats(projects, tasks, 'done', DAY)).toEqual({ active: 2, shipped: 1, onTrack: 33, dueMonth: 2 });
  });

  it('calls everything on track when nothing is running', () => {
    expect(projectStats([], [], 'done', DAY).onTrack).toBe(100);
  });
});

describe('milestoneOf', () => {
  it('picks the open card that comes due first', () => {
    const tasks = [
      task('later', { dueDate: '2026-10-20' }),
      task('none'),
      task('soon', { dueDate: '2026-10-16' }),
      task('done', { columnId: 'done', dueDate: '2026-10-01' }),
    ];
    expect(milestoneOf(project('p1'), tasks, 'done')).toEqual({ title: 'soon', dueDate: '2026-10-16' });
  });

  it('has none without open cards', () => {
    expect(milestoneOf(project('p1'), [], 'done')).toBeNull();
  });
});
