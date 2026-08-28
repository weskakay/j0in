import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { BoardStore, type ColumnDisposal } from '../../core/board.store';
import type { Category, Column, Task, TaskInput } from '../../data/models';
import { TaskCard } from './task-card/task-card';
import { Dialog } from '../../layout/dialog/dialog';
import { TaskDetail, type SubtaskToggle } from './task-detail/task-detail';
import { TaskForm } from './task-form/task-form';
import { BoardDrag, type Drop } from './drag/board-drag.service';
import { DragCard } from './drag/drag-card';
import { Loader } from '../../layout/loader/loader';
import { ColumnHead } from './column-head/column-head';
import { ColumnDelete } from './column-delete/column-delete';

/** Which dialog is on screen, if any. */
type DialogMode = 'none' | 'detail' | 'edit' | 'create' | 'wipeColumn' | 'wipeTask';

/** The board: every column with its cards, plus the task dialog. */
@Component({
  selector: 'app-board',
  imports: [TaskCard, Dialog, TaskDetail, TaskForm, DragCard, Loader, ColumnHead, ColumnDelete],
  providers: [BoardDrag],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly store = inject(BoardStore);
  private readonly drag = inject(BoardDrag);

  /** The card being dragged, or null. Drives the preview under the pointer. */
  protected readonly dragged = this.drag.task;

  /** Column currently under the pointer, highlighted while dragging. */
  protected readonly overColumn = this.drag.overColumn;

  /** Where the pointer is, so the preview can follow it. */
  protected readonly dragPoint = this.drag.point;

  /** Where the card was grabbed, so it stays put under the hand. */
  protected readonly dragGrab = this.drag.grab;

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

  /** The column whose removal is being confirmed. */
  protected readonly doomed = signal<Column | null>(null);

  /** True while the field for a new column name is open. */
  protected readonly namingColumn = signal(false);

  private readonly columnField = viewChild<ElementRef<HTMLInputElement>>('columnField');

  /** Puts the cursor into the name field as soon as it appears. */
  private readonly focusColumnField = effect(() => {
    this.columnField()?.nativeElement.focus();
  });

  /** Heading of the open dialog. */
  protected readonly heading = computed(() => headingFor(this.mode(), this.current()));

  /** How many cards sit in the column that is about to go. */
  protected readonly doomedCount = computed(
    () => this.board().find((entry) => entry.column.id === this.doomed()?.id)?.tasks.length ?? 0,
  );

  /** The columns those cards could move to. */
  protected readonly doomedTargets = computed(() =>
    this.columns().filter((column) => column.id !== this.doomed()?.id),
  );

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
    this.doomed.set(null);
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

  /** Asks once before a task disappears. */
  protected askDelete(): void {
    this.mode.set('wipeTask');
  }

  /** Deletes the open task after the confirmation. */
  protected onDelete(): void {
    const task = this.current();
    if (!task) {
      return;
    }
    this.busy.set(true);
    this.store.deleteTask(task.id).subscribe({
      next: () => this.finish(),
      error: () => this.busy.set(false),
    });
  }

  /**
   * Moves a dropped card into its new column. The board is redrawn from the
   * server afterwards, so the positions match what was really stored.
   */
  protected onDrop(drop: Drop): void {
    this.store.moveTask(drop.task.id, drop.columnId, 1).subscribe({
      next: () => this.store.load(),
    });
  }

  /** Opens the field for the name of a new column. */
  protected startColumn(): void {
    this.namingColumn.set(true);
  }

  /** Closes that field without creating anything. */
  protected cancelColumn(): void {
    this.namingColumn.set(false);
  }

  /** Creates the column, unless the field was left empty. */
  protected addColumn(event: Event): void {
    const field = event.target as HTMLInputElement;
    const name = field.value.trim();
    this.namingColumn.set(false);
    if (name !== '') {
      this.store.createColumn(name).subscribe();
    }
  }

  /** Enter creates the column, Escape drops the field. */
  protected onColumnKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addColumn(event);
    }
    if (event.key === 'Escape') {
      this.cancelColumn();
    }
  }

  /** Saves a column's new name. */
  protected onRenameColumn(columnId: string, name: string): void {
    this.store.renameColumn(columnId, name).subscribe();
  }

  /** Opens the dialog that asks what happens to the cards. */
  protected askRemoveColumn(column: Column): void {
    this.doomed.set(column);
    this.mode.set('wipeColumn');
  }

  /** Removes the column once the visitor has decided about its cards. */
  protected onRemoveColumn(disposal: ColumnDisposal): void {
    const column = this.doomed();
    if (!column) {
      return;
    }
    this.busy.set(true);
    this.store.deleteColumn(column.id, disposal).subscribe({
      next: () => this.finishColumn(),
      error: () => this.busy.set(false),
    });
  }

  /** Leaves the column dialog once the removal went through. */
  private finishColumn(): void {
    this.busy.set(false);
    this.doomed.set(null);
    this.mode.set('none');
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

const HEADINGS: Partial<Record<DialogMode, string>> = {
  wipeColumn: 'Spalte löschen',
  wipeTask: 'Aufgabe löschen',
  create: 'Neue Aufgabe',
  edit: 'Aufgabe bearbeiten',
};

/** The heading the dialog carries in each of its uses. */
function headingFor(mode: DialogMode, task: Task | null): string {
  return HEADINGS[mode] ?? task?.title ?? '';
}

/** Copy of a task in which one subtask carries its new state. */
function withToggled(task: Task, change: SubtaskToggle): Task {
  const subtasks = task.subtasks.map((subtask) =>
    subtask.id === change.subtaskId ? { ...subtask, isDone: change.isDone } : subtask,
  );
  return { ...task, subtasks };
}
