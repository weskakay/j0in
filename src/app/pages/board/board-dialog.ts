import type { Dictionary } from '../../data/i18n';
import type { Task } from '../../data/models';
import type { SubtaskToggle } from './task-detail/task-detail';

/** What the one dialog of the board is being used for. */
export type DialogMode = 'none' | 'detail' | 'edit' | 'create' | 'wipeColumn' | 'wipeTask';

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

/** Copy of a task in which one subtask carries its new state. */
export function withToggled(task: Task, change: SubtaskToggle): Task {
  const subtasks = task.subtasks.map((subtask) =>
    subtask.id === change.subtaskId ? { ...subtask, isDone: change.isDone } : subtask,
  );
  return { ...task, subtasks };
}
