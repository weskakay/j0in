import { Component, computed, inject, signal } from '@angular/core';
import { BoardStore } from '../../core/board.store';
import type { Category, Task, TaskInput } from '../../data/models';
import { TaskCard } from './task-card/task-card';
import { TaskDialog } from './task-dialog/task-dialog';
import { TaskDetail, type SubtaskToggle } from './task-detail/task-detail';
import { TaskForm } from './task-form/task-form';

/** Which dialog is on screen, if any. */
type DialogMode = 'none' | 'detail' | 'edit' | 'create';

/** The board: every column with its cards, plus the task dialog. */
@Component({
  selector: 'app-board',
  imports: [TaskCard, TaskDialog, TaskDetail, TaskForm],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly store = inject(BoardStore);

  /** Columns together with the cards that belong in them. */
  protected readonly board = this.store.board;

  /** All columns, offered in the form. */
  protected readonly columns = this.store.columns;

  /** All categories, offered in the form. */
  protected readonly categories = this.store.categories;

  /** All contacts, for avatars and for assigning. */
  protected readonly contacts = this.store.contacts;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Message of a failed call, or null. */
  protected readonly error = this.store.error;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Which dialog is open. */
  protected readonly mode = signal<DialogMode>('none');

  /** The task the dialog is about, or null while creating. */
  protected readonly current = signal<Task | null>(null);

  /** The column a newly created task lands in. */
  protected readonly targetColumn = signal('');

  /** True while a save or delete is in flight. */
  protected readonly busy = signal(false);

  /** Heading of the open dialog. */
  protected readonly heading = computed(() => headingFor(this.mode(), this.current()));

  constructor() {
    this.store.load();
  }

  /** The category of a task, for the coloured label on its card. */
  protected categoryOf(task: Task): Category | null {
    return this.store.categoryOf(task);
  }

  /** Narrows the visible cards to those matching the typed term. */
  protected onSearch(event: Event): void {
    this.store.setSearch((event.target as HTMLInputElement).value);
  }

  /** Opens a card for reading. */
  protected openTask(task: Task): void {
    this.current.set(task);
    this.mode.set('detail');
  }

  /** Opens the empty form for a new card in the given column. */
  protected openNew(columnId: string): void {
    this.current.set(null);
    this.targetColumn.set(columnId);
    this.mode.set('create');
  }

  /** Switches the open dialog from reading to editing. */
  protected startEdit(): void {
    this.mode.set('edit');
  }

  /** Closes whatever dialog is open. */
  protected closeDialog(): void {
    this.mode.set('none');
    this.current.set(null);
  }

  /** Ticks a subtask off straight from the detail view. */
  protected onToggle(change: SubtaskToggle): void {
    const task = this.current();
    if (!task) {
      return;
    }
    this.store.toggleSubtask(task.id, change.subtaskId, change.isDone);
    this.current.set(withToggled(task, change));
  }

  /** Saves the form, either as a new task or over the open one. */
  protected onSubmit(input: TaskInput): void {
    const task = this.current();
    this.busy.set(true);
    const request = task ? this.store.updateTask(task.id, input) : this.store.createTask(input);
    request.subscribe({
      next: () => this.finish(),
      error: () => this.busy.set(false),
    });
  }

  /** Deletes the open task after a confirmation. */
  protected onDelete(): void {
    const task = this.current();
    if (!task || !confirm(`„${task.title}" wirklich löschen?`)) {
      return;
    }
    this.busy.set(true);
    this.store.deleteTask(task.id).subscribe({
      next: () => this.finish(),
      error: () => this.busy.set(false),
    });
  }

  /** Tries the load again after a failure. */
  protected retry(): void {
    this.store.load();
  }

  /** Leaves the dialog once a write went through. */
  private finish(): void {
    this.busy.set(false);
    this.closeDialog();
  }
}

/** The heading the dialog carries in each of its three uses. */
function headingFor(mode: DialogMode, task: Task | null): string {
  if (mode === 'create') {
    return 'Neue Aufgabe';
  }
  if (mode === 'edit') {
    return 'Aufgabe bearbeiten';
  }
  return task?.title ?? '';
}

/** Copy of a task in which one subtask carries its new state. */
function withToggled(task: Task, change: SubtaskToggle): Task {
  const subtasks = task.subtasks.map((subtask) =>
    subtask.id === change.subtaskId ? { ...subtask, isDone: change.isDone } : subtask,
  );
  return { ...task, subtasks };
}
