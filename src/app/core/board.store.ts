import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type {
  BoardData,
  Category,
  CategoryInput,
  Column,
  Contact,
  ContactInput,
  Task,
  TaskInput,
  TimePhase,
} from '../data/models';
import { ApiService } from './api.service';
import { LanguageService } from './language.service';

/** A column together with the cards that sit in it, ready to render. */
export interface ColumnWithTasks {
  column: Column;
  tasks: Task[];
}

/** How long the loading state stays on screen once it has been shown. */
const MIN_WAIT = 1400;

/** What happens to the cards of a column that is being removed. */
export interface ColumnDisposal {
  moveTo?: string;
  deleteTasks?: boolean;
}

/**
 * Holds the whole board in memory. The API delivers it in one call, so the
 * screens read from here instead of fetching for themselves.
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly api = inject(ApiService);
  private readonly language = inject(LanguageService);
  private readonly data = signal<BoardData | null>(null);
  private readonly query = signal('');
  private readonly read = signal(0);

  /** When the board on screen arrived, so a running timer can count on from there. */
  readonly readAt = this.read.asReadonly();

  /** True while the board is being fetched. */
  readonly loading = signal(false);

  /** Message of the last failed call, or null. */
  readonly error = signal<string | null>(null);

  /** Whether anything has been loaded yet. */
  readonly ready = computed(() => this.data() !== null);

  /** The name of the board. */
  readonly name = computed(() => this.data()?.name ?? '');

  /** The board's columns in their stored order. */
  readonly columns = computed<Column[]>(() => this.data()?.columns ?? []);

  /** All categories of the board. */
  readonly categories = computed<Category[]>(() => this.data()?.categories ?? []);

  /** All contacts of the board. */
  readonly contacts = computed<Contact[]>(() => this.data()?.contacts ?? []);

  /**
   * Whether this board offers the timer and the time log on its cards. False
   * until the board has arrived, so nothing flashes up that is switched off.
   */
  readonly timeTracking = computed(() => this.data()?.timeTracking ?? false);

  /** The phases time is booked on, in their stored order. */
  readonly phases = computed<TimePhase[]>(() => this.data()?.phases ?? []);

  /** All tasks, unfiltered. */
  readonly tasks = computed<Task[]>(() => this.data()?.tasks ?? []);

  /** The current search term. */
  readonly search = this.query.asReadonly();

  /** Columns with their matching cards, which is what the board renders. */
  readonly board = computed<ColumnWithTasks[]>(() => {
    const visible = matching(this.tasks(), this.query());
    return this.columns().map((column) => ({
      column,
      tasks: visible.filter((task) => task.columnId === column.id),
    }));
  });

  /** Fetches the board; call it when a screen that needs it opens. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const started = Date.now();
    this.api.get<BoardData>('/board').subscribe({
      next: (board) => this.after(started, () => this.accept(board)),
      error: (failure: Error) => this.after(started, () => this.reject(failure)),
    });
  }

  /**
   * Reads the board again without the loading state and without holding the
   * answer back. Meant for small changes such as a started timer, where the
   * card should react at once.
   */
  refresh(): void {
    this.api.get<BoardData>('/board').subscribe({
      next: (board) => this.accept(board),
      error: (failure: Error) => this.error.set(failure.message),
    });
  }

  /**
   * Holds a very fast answer back for a moment. A spinner that appears and
   * vanishes within a blink reads as a glitch, not as progress.
   */
  private after(started: number, done: () => void): void {
    const left = MIN_WAIT - (Date.now() - started);
    if (left <= 0) {
      done();
      return;
    }
    setTimeout(done, left);
  }

  /** Narrows the board to cards whose title or description match. */
  setSearch(term: string): void {
    this.query.set(term.trim().toLowerCase());
  }

  /** Gives the board another name. */
  renameBoard(name: string): Observable<unknown> {
    return this.api.put('/board', { name }).pipe(tap(() => this.load()));
  }

  /** Puts the demo board back to how a visitor first finds it. */
  resetDemo(): Observable<unknown> {
    const body = { lang: this.language.lang() };
    return this.api.post('/board/reset', body).pipe(tap(() => this.load()));
  }

  /** Puts the seeded demo cards into the language now on screen. */
  switchLanguage(): Observable<unknown> {
    const body = { lang: this.language.lang() };
    return this.api.post('/board/language', body).pipe(tap(() => this.load()));
  }

  /** Adds a category to the board. */
  createCategory(input: CategoryInput): Observable<unknown> {
    return this.api.post('/categories', input).pipe(tap(() => this.load()));
  }

  /** Saves an edited category. */
  updateCategory(categoryId: string, input: CategoryInput): Observable<unknown> {
    return this.api.put(`/categories/${categoryId}`, input).pipe(tap(() => this.load()));
  }

  /** Removes a category; the cards keep existing and simply lose it. */
  deleteCategory(categoryId: string): Observable<unknown> {
    return this.api.delete(`/categories/${categoryId}`).pipe(tap(() => this.load()));
  }

  /** Turns time tracking on or off for the whole board. */
  setTimeTracking(on: boolean): Observable<unknown> {
    return this.api.put('/board/time-tracking', { on }).pipe(tap(() => this.load()));
  }

  /** Adds a phase time can be booked on. */
  createPhase(name: string): Observable<unknown> {
    return this.api.post('/phases', { name }).pipe(tap(() => this.load()));
  }

  /** Gives a phase another name. */
  renamePhase(phaseId: string, name: string): Observable<unknown> {
    return this.api.put(`/phases/${phaseId}`, { name }).pipe(tap(() => this.load()));
  }

  /** Removes a phase; the time booked on it stays, without a phase. */
  deletePhase(phaseId: string): Observable<unknown> {
    return this.api.delete(`/phases/${phaseId}`).pipe(tap(() => this.load()));
  }

  /** Adds a contact to the board. */
  createContact(input: ContactInput): Observable<unknown> {
    return this.api.post('/contacts', input).pipe(tap(() => this.load()));
  }

  /** Saves an edited contact. */
  updateContact(contactId: string, input: ContactInput): Observable<unknown> {
    return this.api.put(`/contacts/${contactId}`, input).pipe(tap(() => this.load()));
  }

  /** Removes a contact; its assignments fall away with it. */
  deleteContact(contactId: string): Observable<unknown> {
    return this.api.delete(`/contacts/${contactId}`).pipe(tap(() => this.load()));
  }

  /** Adds a column at the end of the board. */
  createColumn(name: string): Observable<unknown> {
    return this.api.post('/columns', { name }).pipe(tap(() => this.load()));
  }

  /** Gives a column another name. */
  renameColumn(columnId: string, name: string): Observable<unknown> {
    return this.api.put(`/columns/${columnId}`, { name }).pipe(tap(() => this.load()));
  }

  /**
   * Removes a column. The server insists on knowing what happens to its
   * cards, so the caller passes either a target column or an explicit delete.
   */
  deleteColumn(columnId: string, disposal: ColumnDisposal): Observable<unknown> {
    return this.api.delete(`/columns/${columnId}`, disposal).pipe(tap(() => this.load()));
  }

  /** Creates a task, then reads the board back so positions stay right. */
  createTask(input: TaskInput): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/tasks', input).pipe(tap(() => this.load()));
  }

  /** Saves an edited task and reads the board back. */
  updateTask(taskId: string, input: TaskInput): Observable<unknown> {
    return this.api.put(`/tasks/${taskId}`, input).pipe(tap(() => this.load()));
  }

  /** Deletes a task and reads the board back. */
  deleteTask(taskId: string): Observable<unknown> {
    return this.api.delete(`/tasks/${taskId}`).pipe(tap(() => this.load()));
  }

  /** Moves a task into another column at the given position. */
  moveTask(taskId: string, columnId: string, position: number): Observable<unknown> {
    return this.api.put(`/tasks/${taskId}/move`, { columnId, position });
  }

  /**
   * Ticks a subtask off. The card updates at once and the server call runs
   * behind it, because waiting for a round trip on a checkbox feels broken.
   */
  toggleSubtask(taskId: string, subtaskId: string, isDone: boolean): void {
    this.applySubtask(taskId, subtaskId, isDone);
    this.api.put(`/subtasks/${subtaskId}`, { isDone }).subscribe({
      error: (failure: Error) => this.undoSubtask(taskId, subtaskId, isDone, failure),
    });
  }

  /** Writes the new state of one subtask into the board held in memory. */
  private applySubtask(taskId: string, subtaskId: string, isDone: boolean): void {
    this.data.update((board) => (board ? withSubtask(board, taskId, subtaskId, isDone) : board));
  }

  /** Puts a failed tick back and says what went wrong. */
  private undoSubtask(taskId: string, subtaskId: string, isDone: boolean, failure: Error): void {
    this.applySubtask(taskId, subtaskId, !isDone);
    this.error.set(failure.message);
  }

  /** Looks a category up by id, for the coloured label on a card. */
  categoryOf(task: Task): Category | null {
    return this.categories().find((category) => category.id === task.categoryId) ?? null;
  }

  /** Forgets everything, so a second account never sees the first one's board. */
  clear(): void {
    this.data.set(null);
    this.query.set('');
    this.error.set(null);
  }

  /** Stores a freshly loaded board. */
  private accept(board: BoardData): void {
    this.read.set(Date.now());
    this.data.set(board);
    this.loading.set(false);
  }

  /** Keeps the old board on screen and reports what went wrong. */
  private reject(failure: Error): void {
    this.error.set(failure.message);
    this.loading.set(false);
  }
}

/** Returns a copy of the board in which one subtask carries the new state. */
function withSubtask(
  board: BoardData,
  taskId: string,
  subtaskId: string,
  isDone: boolean,
): BoardData {
  const tasks = board.tasks.map((task) =>
    task.id === taskId
      ? { ...task, subtasks: task.subtasks.map((s) => (s.id === subtaskId ? { ...s, isDone } : s)) }
      : task,
  );
  return { ...board, tasks };
}

/** Filters tasks by a lower-cased search term; an empty term keeps all. */
function matching(tasks: Task[], term: string): Task[] {
  if (term === '') {
    return tasks;
  }
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(term) ||
      (task.description ?? '').toLowerCase().includes(term),
  );
}
