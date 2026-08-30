import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import type { Task } from '../../data/models';
import { germanDate, greeting, today } from '../../data/format';
import { Loader } from '../../layout/loader/loader';
import { Bars } from './charts/bars';
import { Donut } from './charts/donut';
import { Segments } from './charts/segments';
import type { ChartRow } from './charts/chart-row';

/** The colours the three bar groups use, taken from the design tokens. */
const COLORS = {
  accent: 'var(--j0in-accent)',
  urgent: 'var(--j0in-prio-urgent)',
  medium: 'var(--j0in-prio-medium)',
  low: 'var(--j0in-prio-low)',
  muted: 'var(--j0in-border)',
  warn: 'var(--j0in-warning)',
  done: 'var(--j0in-success)',
};

/** One column with the number of cards in it. */
interface ColumnCount {
  name: string;
  count: number;
}

/** The numbers behind the board, so the day starts with an overview. */
@Component({
  selector: 'app-summary',
  imports: [RouterLink, Loader, Bars, Donut, Segments],
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
})
export class Summary {
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Message of a failed call, or null. */
  protected readonly error = this.store.error;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Time of day plus the name, as the heading of the screen. */
  protected readonly hello = computed(
    () => `${greeting(new Date().getHours())}, ${this.auth.user()?.name ?? ''}`,
  );

  /** The name of the board, so the line below the greeting names it. */
  protected readonly boardName = this.store.name;

  /** How many cards there are in total. */
  protected readonly total = computed(() => this.store.tasks().length);

  /** Every column with the number of cards in it. */
  protected readonly perColumn = computed<ColumnCount[]>(() =>
    this.store.board().map((entry) => ({ name: entry.column.name, count: entry.tasks.length })),
  );

  /** The cards marked as urgent. */
  protected readonly urgent = computed(() =>
    this.store.tasks().filter((task) => task.priority === 'urgent'),
  );

  /** The cards whose due date has passed. */
  protected readonly overdue = computed(() =>
    this.store.tasks().filter((task) => !!task.dueDate && task.dueDate < today()),
  );

  /** The nearest due date still ahead, written out in German. */
  protected readonly nextDue = computed(() => germanDate(earliestFrom(this.urgent())));

  /** How many subtasks are ticked off across the whole board. */
  protected readonly subtasksDone = computed(() =>
    this.store.tasks().reduce((sum, task) => sum + task.subtasks.filter((s) => s.isDone).length, 0),
  );

  /** How many subtasks there are in total. */
  protected readonly subtasksTotal = computed(() =>
    this.store.tasks().reduce((sum, task) => sum + task.subtasks.length, 0),
  );

  /** How the cards are spread across the columns. */
  protected readonly byColumn = computed<ChartRow[]>(() =>
    this.perColumn().map((entry) => ({
      label: entry.name,
      count: entry.count,
      color: COLORS.accent,
    })),
  );

  /** How many cards carry each priority. */
  protected readonly byPriority = computed<ChartRow[]>(() => {
    const tasks = this.store.tasks();
    const count = (name: string) => tasks.filter((task) => task.priority === name).length;
    return [
      { label: 'Dringend', count: count('urgent'), color: COLORS.urgent },
      { label: 'Mittel', count: count('medium'), color: COLORS.medium },
      { label: 'Niedrig', count: count('low'), color: COLORS.low },
    ];
  });

  /** How near the deadlines are, from overdue to no date at all. */
  protected readonly byDeadline = computed<ChartRow[]>(() => {
    const buckets = countDeadlines(this.store.tasks());
    return [
      { label: 'Überfällig', count: buckets.overdue, color: COLORS.urgent },
      { label: 'Heute', count: buckets.today, color: COLORS.warn },
      { label: 'Diese Woche', count: buckets.week, color: COLORS.accent },
      { label: 'Später', count: buckets.later, color: COLORS.done },
      { label: 'Ohne Datum', count: buckets.none, color: COLORS.muted },
    ];
  });

  constructor() {
    this.store.load();
  }

  /** Tries the load again after a failure. */
  protected retry(): void {
    this.store.load();
  }
}

/** How many cards fall into each deadline window. */
function countDeadlines(tasks: Task[]): DeadlineBuckets {
  const now = today();
  const weekEnd = inDays(7);
  const buckets: DeadlineBuckets = { overdue: 0, today: 0, week: 0, later: 0, none: 0 };
  for (const task of tasks) {
    buckets[bucketFor(task.dueDate, now, weekEnd)] += 1;
  }
  return buckets;
}

/** Which window one due date belongs to. */
function bucketFor(due: string | null, now: string, weekEnd: string): keyof DeadlineBuckets {
  if (!due) {
    return 'none';
  }
  if (due < now) {
    return 'overdue';
  }
  if (due === now) {
    return 'today';
  }
  return due <= weekEnd ? 'week' : 'later';
}

/** The five windows the deadlines are sorted into. */
interface DeadlineBuckets {
  overdue: number;
  today: number;
  week: number;
  later: number;
  none: number;
}

/** A date the given number of days from today, in the API's notation. */
function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The earliest due date among the given cards, or null when there is none. */
function earliestFrom(tasks: Task[]): string | null {
  const dates = tasks.map((task) => task.dueDate).filter((date): date is string => !!date);
  return dates.length === 0 ? null : dates.sort()[0];
}
