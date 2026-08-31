import { Component, inject, input, output, signal } from '@angular/core';
import type { ColumnDisposal } from '../../../core/board.store';
import type { Column } from '../../../data/models';
import { LanguageService } from '../../../core/language.service';

/**
 * Asks what happens to the cards before a column disappears. The server
 * refuses to guess, and rightly so: silently dropping tasks would be the
 * worst possible outcome of a mis-click.
 */
@Component({
  selector: 'app-column-delete',
  imports: [],
  templateUrl: './column-delete.html',
  styleUrl: './column-delete.scss',
})
export class ColumnDelete {
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The column that is about to go. */
  readonly column = input.required<Column>();

  /** How many cards are in it. */
  readonly count = input(0);

  /** The columns its cards could move to. */
  readonly targets = input<Column[]>([]);

  /** True while the request is running. */
  readonly busy = input(false);

  /** Fires with what should happen to the cards. */
  readonly confirmed = output<ColumnDisposal>();

  /** Fires when the visitor backs out. */
  readonly cancelled = output<void>();

  /** Id of the column the cards should move to, empty when they go too. */
  protected readonly moveTo = signal('');

  /** Remembers the chosen target column. */
  protected pick(event: Event): void {
    this.moveTo.set((event.target as HTMLSelectElement).value);
  }

  /** Hands the decision up. */
  protected confirm(): void {
    const target = this.moveTo();
    this.confirmed.emit(target === '' ? { deleteTasks: true } : { moveTo: target });
  }
}
