import type { Category, ProjectStatus, Task } from './models';

/** The figures above the projects. */
export interface ProjectStats {
  active: number;
  shipped: number;
  onTrack: number;
  dueMonth: number;
}

/** A project's next step: the open card that comes due first. */
export interface Milestone {
  title: string;
  dueDate: string | null;
}

/** Which projects a filter lets through; 'all' lets every one. */
export type ProjectFilter = ProjectStatus | 'all';

/** The projects matching a filter, pinned ones first, otherwise in their order. */
export function filterProjects(projects: Category[], filter: ProjectFilter): Category[] {
  return projects
    .filter((project) => filter === 'all' || project.status === filter)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position);
}

/**
 * Counts for the head of the page. A project is on track when it is not
 * shipped, its own date has not passed and none of its open cards is overdue;
 * the share is given in percent of the projects still running.
 */
export function projectStats(projects: Category[], tasks: Task[], lastId: string | null, day: string): ProjectStats {
  const running = projects.filter((project) => project.status !== 'shipped');
  const late = (project: Category) =>
    (!!project.dueDate && project.dueDate < day) ||
    tasks.some((task) => task.categoryId === project.id && task.columnId !== lastId && !!task.dueDate && task.dueDate < day);
  const fine = running.filter((project) => !late(project)).length;
  return {
    active: projects.filter((project) => project.status === 'active').length,
    shipped: projects.length - running.length,
    onTrack: running.length === 0 ? 100 : Math.round((fine / running.length) * 100),
    dueMonth: running.filter((project) => (project.dueDate ?? '').slice(0, 7) === day.slice(0, 7)).length,
  };
}

/** The open card of a project that comes due first, cards without a date last. */
export function milestoneOf(project: Category, tasks: Task[], lastId: string | null): Milestone | null {
  const open = tasks
    .filter((task) => task.categoryId === project.id && task.columnId !== lastId)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  return open[0] ? { title: open[0].title, dueDate: open[0].dueDate } : null;
}
