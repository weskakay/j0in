import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { BoardStore, type ColumnDisposal, type ColumnWithTasks } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import type { Category, Column, Task, TaskInput } from '../../data/models';
import { headingFor, withToggled, type DialogMode } from './board-dialog';
import { TaskCard } from './task-card/task-card';
import { Dialog } from '../../layout/dialog/dialog';
import { TaskDetail, type SubtaskToggle } from './task-detail/task-detail';
import { TaskForm } from './task-form/task-form';
import { BoardDrag, type Landing } from './drag/board-drag.service';
import { DragCard } from './drag/drag-card';
import { Loader } from '../../layout/loader/loader';
import { ColumnHead } from './column-head/column-head';
import { ColumnDelete } from './column-delete/column-delete';
import { ColumnGrip } from './resize/column-grip';
import { Planner } from './planner/planner';
import { ColumnStack } from './stack/column-stack.service';
import { focusCard, holdsFocus } from './stack/stack-focus';
import { ARROWS, VERTICAL, nextPlace } from './keys/card-move';
import { LayoutService } from '../../core/layout.service';
import { CalendarService } from '../../core/calendar.service';
import { ScheduleService } from '../../core/schedule.service';

/** The board: every column with its cards, plus the task dialog. */
@Component({
  selector: 'app-board',
  imports: [
    TaskCard,
    Dialog,
    TaskDetail,
    TaskForm,
    DragCard,
    Loader,
    ColumnHead,
    ColumnDelete,
    ColumnGrip,
    Planner,
  ],
  providers: [BoardDrag, ColumnStack],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly store = inject(BoardStore);
  /** The running drag, read straight by the template for the preview. */
  protected readonly drag = inject(BoardDrag);
  private readonly language = inject(LanguageService);
  private readonly layout = inject(LayoutService);
  private readonly calendar = inject(CalendarService);
  private readonly planned = inject(ScheduleService);
  /** Which card each column has in focus, read by the template as well. */
  protected readonly stack = inject(ColumnStack);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** How wide one column is, dragged by the edge between two of them. */
  protected readonly columnWidth = this.layout.columnWidth;

  /** Whether the day can be planned at all, see the schedule service. */
  protected readonly canPlan = this.planned.possible;

  /** True while the day stands beside the board. */
  protected readonly plannerOpen = computed(() => this.canPlan() && this.layout.plannerOpen());

  /** Shows the day beside the board, or puts it away. */
  protected togglePlanner(): void {
    this.layout.togglePlanner();
  }

  /** The name of the board, shown as the heading of the screen. */
  protected readonly boardName = this.store.name;

  /** Columns together with the cards that belong in them. */
  protected readonly board = this.store.board;

  /** The search found nothing, so the board says so instead of staying blank. */
  protected readonly noMatches = this.store.noMatches;

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
  protected readonly heading = computed(() =>
    headingFor(this.mode(), this.current(), this.t()),
  );

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
   * Moves a card with the keyboard. Alt and an arrow key shifts it, which
   * keeps the plain arrows free for scrolling and reading.
   */
  protected onCardKeydown(event: KeyboardEvent, task: Task, entry: ColumnWithTasks): void {
    if (!event.altKey && this.stack.stacked(entry) && VERTICAL.includes(event.key)) {
      event.preventDefault();
      this.browse(entry, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (!event.altKey || !ARROWS.includes(event.key)) {
      return;
    }
    event.preventDefault();
    this.nudge(task, entry, event.key);
  }

  /** Moves a card one place and keeps the stack looking at it. */
  private nudge(task: Task, entry: ColumnWithTasks, key: string): void {
    const target = nextPlace(this.board(), task, key);
    if (!target) {
      return;
    }
    if (this.stack.stacked(entry) && VERTICAL.includes(key)) {
      this.stack.step(entry, key === 'ArrowUp' ? -1 : 1);
    }
    this.store.moveTask(task.id, target.columnId, target.position).subscribe({
      next: () => this.store.load(),
    });
  }

  /**
   * Browses the stack and takes the keyboard along, otherwise it would be
   * left sitting on a card that has just slid out of the way.
   */
  private browse(entry: ColumnWithTasks, delta: number): void {
    this.stack.step(entry, delta);
    this.carryFocus(entry);
  }

  /** The wheel browses too, and keeps the keyboard on the card in focus. */
  protected onStackWheel(event: WheelEvent, entry: ColumnWithTasks, list: Element): void {
    if (this.stack.onWheel(event, entry) && holdsFocus(list)) {
      this.carryFocus(entry);
    }
  }

  /** Puts the keyboard on whichever card the stack now has in focus. */
  private carryFocus(entry: ColumnWithTasks): void {
    const task = entry.tasks[this.stack.focusOf(entry)];
    if (task) {
      requestAnimationFrame(() => focusCard(task.id));
    }
  }

  /**
   * Tabbing onto a card that merely peeks out brings it forward, so the
   * keyboard never sits on something faded out behind another card.
   */
  protected onCardFocus(entry: ColumnWithTasks, index: number): void {
    if (this.stack.stacked(entry) && this.stack.offset(entry, index) !== 0) {
      this.stack.to(entry, index);
    }
  }

  /**
   * A card that is merely peeking out is brought forward rather than
   * opened, so one click never does two things at once.
   */
  protected onCardOpen(entry: ColumnWithTasks, index: number, task: Task): void {
    if (this.stack.stacked(entry) && this.stack.offset(entry, index) !== 0) {
      this.stack.to(entry, index);
      return;
    }
    this.openTask(task);
  }

  /** Whether the insertion marker belongs in front of the given card. */
  protected showSlot(columnId: string, index: number): boolean {
    const drag = this.drag;
    return !!drag.task() && drag.overColumn() === columnId && drag.overIndex() === index;
  }

  /**
   * Moves a dropped card to where it was let go. The board is redrawn from
   * the server afterwards, so the order matches what was really stored.
   */
  protected onDrop(landing: Landing): void {
    if (landing.kind === 'slot') {
      this.planned.schedule(landing.task.id, landing.minutes, this.calendar.day());
      return;
    }
    this.store.moveTask(landing.task.id, landing.columnId, landing.position).subscribe({
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
