import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { BoardStore } from '../../../core/board.store';
import { LanguageService } from '../../../core/language.service';

/** The last spot on the board: a button that turns into a field for a new column. */
@Component({
  selector: 'app-add-column',
  templateUrl: './add-column.html',
  styleUrl: './add-column.scss',
})
export class AddColumn {
  private readonly store = inject(BoardStore);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** True while the field for the name is open. */
  protected readonly naming = signal(false);

  /** Set by Escape, so the blur that follows does not create anything. */
  private cancelled = false;

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /** Puts the cursor into the name field as soon as it appears. */
  private readonly focusField = effect(() => this.field()?.nativeElement.focus());

  /** Opens the field. */
  protected start(): void {
    this.cancelled = false;
    this.naming.set(true);
  }

  /** Creates the column, unless the field was left empty. */
  protected add(event: Event): void {
    const name = (event.target as HTMLInputElement).value.trim();
    this.naming.set(false);
    if (name !== '' && !this.cancelled) {
      this.store.createColumn(name).subscribe({
        error: (failure: Error) => this.store.error.set(failure.message),
      });
    }
  }

  /**
   * Enter and Escape both leave the field; leaving it is what creates the
   * column, so each key runs only once. Escape marks the leave as a cancel.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancelled = true;
    }
    if (event.key === 'Enter' || event.key === 'Escape') {
      (event.target as HTMLInputElement).blur();
    }
  }
}
