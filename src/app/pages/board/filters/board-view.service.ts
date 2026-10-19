import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BoardStore, type ColumnWithTasks } from '../../../core/board.store';
import { boardStats, filterTasks, isFiltering, priorityFrom, type BoardFilter } from '../../../data/board-filter';
import { today } from '../../../data/format';
import type { Priority } from '../../../data/models';

/** The two ways the cards can be laid out. */
export type BoardLayout = 'board' | 'list';

/**
 * What the board screen shows: the filter and the layout, both kept in the
 * address bar so a link from the palette or the sidebar lands right on them
 * and the back button undoes a change.
 */
@Injectable()
export class BoardView {
  private readonly store = inject(BoardStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  /** The filter as the address bar holds it. */
  readonly filter = computed<BoardFilter>(() => ({
    category: this.params().get('category'),
    priority: priorityFrom(this.params().get('priority')),
  }));

  /** Board or list. */
  readonly layout = computed<BoardLayout>(() => (this.params().get('view') === 'list' ? 'list' : 'board'));

  /** Whether the filter limits anything. */
  readonly filtering = computed(() => isFiltering(this.filter()));

  /** Columns with the cards that pass both the search and the filter. */
  readonly board = computed<ColumnWithTasks[]>(() =>
    this.store.board().map((entry) => ({ ...entry, tasks: filterTasks(entry.tasks, this.filter()) })),
  );

  /** Nothing is left to show although something was searched or filtered. */
  readonly noMatches = computed(
    () => (this.store.search() !== '' || this.filtering()) && this.board().every((e) => e.tasks.length === 0),
  );

  /** The figures above the board, over every card regardless of the filter. */
  readonly stats = computed(() =>
    boardStats(this.store.tasks(), this.store.columns().at(-1)?.id ?? null, today()),
  );

  /**
   * Turns a place among the visible cards into a place in the whole column.
   * With a filter on, the cards in between are hidden, and the server counts
   * them all; the card dropped in front of stays the one it lands in front of.
   */
  positionIn(columnId: string, visible: number): number {
    const shown = this.board().find((entry) => entry.column.id === columnId)?.tasks ?? [];
    const all = this.store.tasks().filter((task) => task.columnId === columnId);
    const before = shown[visible - 1];
    return before ? all.indexOf(before) + 1 : all.length + 1;
  }

  /** Narrows the board to one category, or lifts that limit with null. */
  setCategory(category: string | null): void {
    this.write({ category });
  }

  /** Narrows the board to one priority, or lifts that limit with null. */
  setPriority(priority: Priority | null): void {
    this.write({ priority });
  }

  /** Switches between board and list. */
  setLayout(layout: BoardLayout): void {
    this.write({ view: layout === 'list' ? 'list' : null });
  }

  /** Lifts every filter, the layout stays. */
  reset(): void {
    this.write({ category: null, priority: null });
  }

  /** Writes into the address bar, leaving the other parameters alone. */
  private write(change: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: change,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
