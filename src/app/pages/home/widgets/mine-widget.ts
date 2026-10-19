import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import type { Category, Task } from '../../../data/models';
import { Widget } from '../../../ui/widget/widget';
import { dueLabel } from '../due-label';
import { HomeData } from '../home-data.service';

/** How many cards the widget lists at most. */
const SHOWN = 7;

/** The cards due today or already overdue, each ticked off with one tap. */
@Component({
  selector: 'app-mine-widget',
  imports: [Widget, RouterLink],
  templateUrl: './mine-widget.html',
  styleUrl: './mine.scss',
})
export class MineWidget {
  private readonly data = inject(HomeData);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The cards to list. */
  protected readonly cards = computed(() => this.data.mine().slice(0, SHOWN));

  /** Today, to tell overdue from due. */
  protected readonly day = this.data.day;

  /** The category of a card. */
  protected categoryOf(task: Task): Category | null {
    return this.store.categoryOf(task);
  }

  /** How far off a card's date is. */
  protected due(task: Task): string {
    return dueLabel(task, this.data.day(), this.t(), this.language.lang());
  }

  /** Moves a card into the last column. */
  protected finish(task: Task): void {
    const lastId = this.data.lastId();
    if (!lastId) {
      return;
    }
    const position = this.store.tasks().filter((one) => one.columnId === lastId).length + 1;
    this.store.moveTask(task.id, lastId, position).subscribe({
      next: () => this.store.refresh(),
      error: (failure: Error) => this.store.error.set(failure.message),
    });
  }
}
