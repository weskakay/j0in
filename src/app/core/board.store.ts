import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type { BoardData, Category, Column, Contact, Task, TaskInput } from '../data/models';
import { ApiService } from './api.service';

/** A column together with the cards that sit in it, ready to render. */
export interface ColumnWithTasks {
  column: Column;
  tasks: Task[];
}

/**
 * Holds the whole board in memory. The API delivers it in one call, so the
 * screens read from here instead of fetching for themselves.
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly api = inject(ApiService);
  private readonly data = signal<BoardData | null>(null);
  private readonly query = signal('');

  /** True while the board is being fetched. */
  readonly loading = signal(false);

  /** Message of the last failed call, or null. */
  readonly error = signal<string | null>(null);

  /** Whether anything has been loaded yet. */
  readonly ready = computed(() => this.data() !== null);

  /** The board's columns in their stored order. */
  readonly columns = computed<Column[]>(() => this.data()?.columns ?? []);

  /** All categories of the board. */
  readonly categories = computed<Category[]>(() => this.data()?.categories ?? []);

  /** All contacts of the board. */
  readonly contacts = computed<Contact[]>(() => this.data()?.contacts ?? []);

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
    this.api.get<BoardData>('/board').subscribe({
      next: (board) => this.accept(board),
      error: (failure: Error) => this.reject(failure),
    });
  }

  /** Narrows the board to cards whose title or description match. */
  setSearch(term: string): void {
    this.query.set(term.trim().toLowerCase());
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
