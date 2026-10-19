import { Component, computed, inject, output } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { LayoutService } from '../../../core/layout.service';
import { ScheduleService } from '../../../core/schedule.service';
import { BoardView, type BoardLayout } from '../filters/board-view.service';

/**
 * The top of the board: its name, the figures of the day, board or list,
 * the planner and a new card. Everything here concerns the board as a
 * whole rather than one column.
 */
@Component({
  selector: 'app-board-head',
  templateUrl: './board-head.html',
  styleUrl: './board-head.scss',
})
export class BoardHead {
  private readonly store = inject(BoardStore);
  private readonly view = inject(BoardView);
  private readonly layout = inject(LayoutService);
  private readonly planned = inject(ScheduleService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Fires when a new card is asked for. */
  readonly create = output<void>();

  /** The name of the board, shown as the heading of the screen. */
  protected readonly name = this.store.name;

  /** The figures above the board. */
  protected readonly stats = this.view.stats;

  /** Board or list. */
  protected readonly current = this.view.layout;

  /** How many categories the open cards are spread over. */
  protected readonly spread = computed(() => {
    const last = this.store.columns().at(-1)?.id;
    const open = this.store.tasks().filter((task) => task.columnId !== last && task.categoryId);
    return new Set(open.map((task) => task.categoryId)).size;
  });

  /** Whether the day can be planned at all, see the schedule service. */
  protected readonly canPlan = this.planned.possible;

  /** True while the day stands beside the board. */
  protected readonly plannerOpen = computed(() => this.canPlan() && this.layout.plannerOpen());

  /** Switches between board and list. */
  protected show(layout: BoardLayout): void {
    this.view.setLayout(layout);
  }

  /** Shows the day beside the board, or puts it away. */
  protected togglePlanner(): void {
    this.layout.togglePlanner();
  }
}
