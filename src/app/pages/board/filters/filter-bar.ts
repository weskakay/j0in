import { Component, inject } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';
import { priorityFrom } from '../../../data/board-filter';
import { BoardView } from './board-view.service';

/** Narrows the board by category, priority and free text. */
@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class FilterBar {
  private readonly store = inject(BoardStore);
  private readonly view = inject(BoardView);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The categories to narrow by. */
  protected readonly categories = this.store.categories;

  /** The filter as the address bar holds it. */
  protected readonly filter = this.view.filter;

  /** Whether anything is narrowed, which brings up the reset button. */
  protected readonly filtering = this.view.filtering;

  constructor() {
    // The field starts empty, so the search behind it has to as well.
    this.store.setSearch('');
  }

  /** Narrows the visible cards to those matching the typed term. */
  protected onSearch(event: Event): void {
    this.store.setSearch((event.target as HTMLInputElement).value);
  }

  /** Narrows to the picked category, or to none. */
  protected onCategory(event: Event): void {
    this.view.setCategory((event.target as HTMLSelectElement).value || null);
  }

  /** Narrows to the picked priority, or to none. */
  protected onPriority(event: Event): void {
    this.view.setPriority(priorityFrom((event.target as HTMLSelectElement).value));
  }

  /** Lifts category and priority. */
  protected reset(): void {
    this.view.reset();
  }
}
