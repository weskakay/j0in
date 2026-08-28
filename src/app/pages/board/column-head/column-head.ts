import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import type { Column } from '../../../data/models';

/** Heading of one column: its name, its card count and what can be done to it. */
@Component({
  selector: 'app-column-head',
  imports: [],
  templateUrl: './column-head.html',
  styleUrl: './column-head.scss',
})
export class ColumnHead {
  /** The column this heading belongs to. */
  readonly column = input.required<Column>();

  /** How many cards sit in it. */
  readonly count = input(0);

  /** Fires with the new name once renaming is confirmed. */
  readonly renamed = output<string>();

  /** Fires when the visitor wants this column gone. */
  readonly removed = output<void>();

  /** Fires when a new card should be created here. */
  readonly added = output<void>();

  /** True while the name is being edited in place. */
  protected readonly editing = signal(false);

  /** True while the small menu is open. */
  protected readonly menuOpen = signal(false);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /** Puts the cursor into the name field as soon as it appears. */
  private readonly focusField = effect(() => {
    this.field()?.nativeElement.select();
  });

  /** Opens or closes the small menu. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Switches the heading into an editable field. */
  protected startEdit(): void {
    this.menuOpen.set(false);
    this.editing.set(true);
  }

  /** Leaves editing without changing anything. */
  protected cancelEdit(): void {
    this.editing.set(false);
  }

  /** Asks for the column to be removed. */
  protected requestRemove(): void {
    this.menuOpen.set(false);
    this.removed.emit();
  }

  /** Hands the typed name up, unless it is empty or unchanged. */
  protected confirm(): void {
    const name = this.field()?.nativeElement.value.trim() ?? '';
    this.editing.set(false);
    if (name !== '' && name !== this.column().name) {
      this.renamed.emit(name);
    }
  }

  /** Enter confirms the new name, Escape drops it. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.confirm();
    }
    if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }
}
