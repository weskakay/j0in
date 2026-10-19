import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { BoardStore, type ColumnDisposal, type ColumnWithTasks } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import type { Category, Column, Task, TaskInput } from '../../data/models';
import { headingFor, withNewSubtask, type DialogMode } from './board-dialog';
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
import { LayoutService } from '../../core/layout.service';
import { CalendarService } from '../../core/calendar.service';
import { ScheduleService } from '../../core/schedule.service';
import { BoardHead } from './board-head/board-head';
import { FilterBar } from './filters/filter-bar';
import { BoardView } from './filters/board-view.service';
import { CardKeys } from './keys/card-keys.service';
import { TaskList } from './list/task-list';
import { AddColumn } from './add-column/add-column';
import { ColumnDots } from './column-dots/column-dots';
import { FeaturesService } from '../../core/features.service';

/**
 * The board: every column with its cards, or the same cards as a list. A
 * card opens in a panel beside the board under its own address, so it can
 * be linked to and the back button closes it again.
 */
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
    BoardHead,
    FilterBar,
    TaskList,
    AddColumn,
    ColumnDots,
  ],
  providers: [BoardDrag, ColumnStack, BoardView, CardKeys],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private readonly store = inject(BoardStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly layout = inject(LayoutService);
  private readonly calendar = inject(CalendarService);
  private readonly planned = inject(ScheduleService);
  /** The running drag, read straight by the template for the preview. */
  protected readonly drag = inject(BoardDrag);
  /** Which card each column has in focus, read by the template as well. */
  protected readonly stack = inject(ColumnStack);
  /** Filter, layout and the filtered columns. */
  protected readonly view = inject(BoardView);
  /** What the keyboard and the wheel do with the cards. */
  protected readonly keys = inject(CardKeys);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Whether a phone shows one column at a time, swiped sideways. */
  protected readonly swipe = inject(FeaturesService).swipeColumns;

  /** The column on screen while they are swiped, counted from zero. */
  protected readonly shownColumn = signal(0);

  /** The names of the columns on screen, for the dots below them. */
  protected readonly columnNames = computed(() => this.view.board().map((entry) => entry.column.name));

  /** How wide one column is, dragged by the edge between two of them. */
  protected readonly columnWidth = this.layout.columnWidth;

  /** True while the day stands beside the board. */
  protected readonly plannerOpen = computed(() => this.planned.possible() && this.layout.plannerOpen());

  /** All columns, offered in the form. */
  protected readonly columns = this.store.columns;

  /** The column that means done, so its cards are never shown as overdue. */
  protected readonly lastColumnId = computed(() => this.columns().at(-1)?.id ?? '');

  /** All categories, offered in the form. */
  protected readonly categories = this.store.categories;

  /** All contacts, for avatars and for assigning. */
  protected readonly contacts = this.store.contacts;

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** The last failure, in the language on screen. */
  protected readonly error = computed(() => this.language.message(this.store.error()));

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** The id of the card open in the panel, read from the address. */
  protected readonly taskId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.openId()),
    ),
    { initialValue: this.openId() },
  );

  /** The open card as the store holds it, so a started timer shows at once. */
  protected readonly shownTask = computed(() => this.store.tasks().find((task) => task.id === this.taskId()) ?? null);

  /** Which dialog is open on top of the board. */
  protected readonly mode = signal<DialogMode>('none');

  /** The task being edited or deleted, or null while creating. */
  protected readonly current = signal<Task | null>(null);

  /** The column a newly created task lands in. */
  protected readonly targetColumn = signal('');

  /** True while a save or delete is in flight. */
  protected readonly busy = signal(false);

  /** The column whose removal is being confirmed. */
  protected readonly doomed = signal<Column | null>(null);

  /** Heading of the open dialog. */
  protected readonly heading = computed(() => headingFor(this.mode(), this.current(), this.t()));

  /** How many cards sit in the column that is about to go. */
  protected readonly doomedCount = computed(
    () => this.store.tasks().filter((task) => task.columnId === this.doomed()?.id).length,
  );

  /** The columns those cards could move to. */
  protected readonly doomedTargets = computed(() =>
    this.columns().filter((column) => column.id !== this.doomed()?.id),
  );

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  /** A link with ?new=1, from the top bar or the palette, opens the empty form. */
  private readonly newFromLink = effect(() => {
    const first = this.columns()[0];
    if (this.params().has('new') && first) {
      untracked(() => this.openNew(first.id));
      const keep = { relativeTo: this.route, queryParamsHandling: 'merge' as const, replaceUrl: true };
      void this.router.navigate([], { ...keep, queryParams: { new: null } });
    }
  });

  constructor() {
    this.store.load();
  }

  /** The id in the address below /board, or null. */
  private openId(): string | null {
    return this.route.firstChild?.snapshot.paramMap.get('taskId') ?? null;
  }

  /** The category of a task, for the coloured label on its card. */
  protected categoryOf(task: Task): Category | null {
    return this.store.categoryOf(task);
  }

  /** Opens a card in the panel, keeping filter and layout. */
  protected openTask(task: Task): void {
    void this.router.navigate(['/board', task.id], { queryParamsHandling: 'preserve' });
  }

  /** Closes the panel. */
  protected closePanel(): void {
    void this.router.navigate(['/board'], { queryParamsHandling: 'preserve' });
  }

  /** Opens the empty form for a new card in the given column. */
  protected openNew(columnId: string): void {
    this.current.set(null);
    this.targetColumn.set(columnId);
    this.mode.set('create');
  }

  /** Opens the empty form for the first column. */
  protected openNewFirst(): void {
    const first = this.columns()[0];
    if (first) {
      this.openNew(first.id);
    }
  }

  /** Opens the open card in the form. */
  protected startEdit(): void {
    this.current.set(this.shownTask());
    this.mode.set('edit');
  }

  /** Closes the dialog on top; the panel stays. */
  protected closeDialog(): void {
    this.mode.set('none');
    this.current.set(null);
    this.doomed.set(null);
  }

  /** Ticks a subtask off straight from the panel. */
  protected onToggle(change: SubtaskToggle): void {
    const id = this.taskId();
    if (id) {
      this.store.toggleSubtask(id, change.subtaskId, change.isDone);
    }
  }

  /** Moves the open card to the end of another column. */
  protected onMove(columnId: string): void {
    const id = this.taskId();
    const position = this.store.tasks().filter((task) => task.columnId === columnId).length + 1;
    if (id) {
      this.store.moveTask(id, columnId, position).subscribe({
        next: () => this.store.refresh(),
        error: (failure: Error) => this.store.error.set(failure.message),
      });
    }
  }

  /** Adds a subtask to the open card. */
  protected onAddSubtask(title: string): void {
    const task = this.shownTask();
    if (task) {
      this.store.updateTask(task.id, withNewSubtask(task, title)).subscribe({
        error: (failure: Error) => this.store.error.set(failure.message),
      });
    }
  }

  /** Saves the form, either as a new task or over the one being edited. */
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
    this.current.set(this.shownTask());
    this.mode.set('wipeTask');
  }

  /** Deletes the task after the confirmation and closes its panel. */
  protected onDelete(): void {
    const task = this.current();
    if (!task) {
      return;
    }
    this.busy.set(true);
    this.store.deleteTask(task.id).subscribe({
      next: () => this.finish(true),
      error: () => this.busy.set(false),
    });
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
    const position = this.view.positionIn(landing.columnId, landing.position);
    this.store.moveTask(landing.task.id, landing.columnId, position).subscribe({
      next: () => this.store.load(),
      error: (failure: Error) => this.store.error.set(failure.message),
    });
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
      next: () => this.finish(),
      error: () => this.busy.set(false),
    });
  }

  /** Tries the load again after a failure. */
  protected retry(): void {
    this.store.load();
  }

  /** Leaves the dialog once a write went through, and the panel too after a delete. */
  private finish(closePanel = false): void {
    this.busy.set(false);
    this.closeDialog();
    if (closePanel) {
      this.closePanel();
    }
  }

  /** Notes which column has come into view after a swipe. */
  protected followColumns(row: HTMLElement): void {
    if (this.swipe()) {
      const last = Math.max(0, this.columnNames().length - 1);
      this.shownColumn.set(Math.min(last, Math.round(row.scrollLeft / columnStep(row))));
    }
  }

  /** Brings one column into view, picked from the dots. */
  protected showColumn(row: HTMLElement, index: number): void {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    row.scrollTo({ left: index * columnStep(row), behavior: calm ? 'auto' : 'smooth' });
  }
}

/** How far apart two columns sit in the row, gap included. */
function columnStep(row: HTMLElement): number {
  const [first, second] = Array.from(row.querySelectorAll<HTMLElement>('.column'));
  return second ? second.offsetLeft - first.offsetLeft : Math.max(1, row.clientWidth);
}
