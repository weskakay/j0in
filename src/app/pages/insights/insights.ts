import { Component, computed, inject } from '@angular/core';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { deadlineBuckets } from '../../data/home';
import { today } from '../../data/format';
import { Widget } from '../../ui/widget/widget';
import { Loader } from '../../layout/loader/loader';
import { Bars } from './charts/bars';
import type { ChartRow } from './charts/chart-row';
import { Donut } from './charts/donut';
import { Segments } from './charts/segments';

/** The board in figures: priorities, columns and due dates as charts. */
@Component({
  selector: 'app-insights',
  imports: [Widget, Bars, Donut, Segments, Loader],
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
})
export class Insights {
  private readonly store = inject(BoardStore);

  /** True while a load is running. */
  protected readonly loading = this.store.loading;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** How many cards carry each priority. */
  protected readonly byPriority = computed<ChartRow[]>(() => {
    const tasks = this.store.tasks();
    const count = (name: string) => tasks.filter((task) => task.priority === name).length;
    const words = this.t().task;
    return [
      { label: words.urgent, count: count('urgent'), color: 'var(--j0in-prio-urgent)' },
      { label: words.medium, count: count('medium'), color: 'var(--j0in-prio-medium)' },
      { label: words.low, count: count('low'), color: 'var(--j0in-prio-low)' },
    ];
  });

  /** How the cards are spread across the columns. */
  protected readonly byColumn = computed<ChartRow[]>(() =>
    this.store.board().map((entry) => ({
      label: entry.column.name,
      count: entry.tasks.length,
      color: 'var(--j0in-accent)',
    })),
  );

  /** How near the due dates are, from overdue to no date at all. */
  protected readonly byDeadline = computed<ChartRow[]>(() => {
    const buckets = deadlineBuckets(this.store.tasks(), today(), this.store.columns().at(-1)?.id ?? null);
    const words = this.t().charts;
    return [
      { label: words.overdue, count: buckets.overdue, color: 'var(--j0in-prio-urgent)' },
      { label: words.today, count: buckets.today, color: 'var(--j0in-warning)' },
      { label: words.thisWeek, count: buckets.week, color: 'var(--j0in-accent)' },
      { label: words.later, count: buckets.later, color: 'var(--j0in-success)' },
      { label: words.noDate, count: buckets.none, color: 'var(--j0in-border)' },
    ];
  });

  constructor() {
    this.store.load();
  }
}
