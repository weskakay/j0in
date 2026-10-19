import type { Dictionary } from '../../data/i18n';
import type { Task, TaskInput } from '../../data/models';

/** What the one dialog of the board is being used for. */
export type DialogMode = 'none' | 'edit' | 'create' | 'wipeColumn' | 'wipeTask';

/** The heading the dialog carries in each of its uses. */
export function headingFor(mode: DialogMode, task: Task | null, t: Dictionary): string {
  const fixed: Partial<Record<DialogMode, string>> = {
    wipeColumn: t.board.deleteColumn,
    wipeTask: t.task.deleteTask,
    create: t.task.newTask,
    edit: t.task.editTask,
  };
  return fixed[mode] ?? task?.title ?? '';
}

/**
 * A task as the form would send it, with one more subtask at the end. The
 * server rewrites subtasks as a whole, so adding one means sending them all.
 */
export function withNewSubtask(task: Task, title: string): TaskInput {
  return {
    columnId: task.columnId,
    categoryId: task.categoryId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? '',
    priority: task.priority,
    contactIds: task.contactIds,
    subtasks: [...task.subtasks.map(({ title: name, isDone }) => ({ title: name, isDone })), { title, isDone: false }],
    estimateMinutes: task.estimateMinutes,
  };
}
