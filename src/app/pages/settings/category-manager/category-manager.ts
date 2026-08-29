import { Component, input, output, signal } from '@angular/core';
import type { Category } from '../../../data/models';
import { DEFAULT_SWATCH } from '../../../data/palette';
import { ColorPicker } from '../../../layout/color-picker/color-picker';

/** A category on its way to the server, before it has an id. */
export interface CategoryDraft {
  name: string;
  color: string;
}

/** A change to a category that already exists. */
export interface CategoryEdit extends CategoryDraft {
  id: string;
}

/** Lists the board's categories and lets them be added, renamed and removed. */
@Component({
  selector: 'app-category-manager',
  imports: [ColorPicker],
  templateUrl: './category-manager.html',
  styleUrl: './category-manager.scss',
})
export class CategoryManager {
  /** The categories of the board, in their stored order. */
  readonly categories = input<Category[]>([]);

  /** How many cards carry each category, keyed by its id. */
  readonly usage = input<Record<string, number>>({});

  /** True while a request is running. */
  readonly busy = input(false);

  /** Fires with the values of a new category. */
  readonly created = output<CategoryDraft>();

  /** Fires with the changed values of an existing one. */
  readonly edited = output<CategoryEdit>();

  /** Fires when a category should be removed. */
  readonly removed = output<Category>();

  /** Id of the category being edited, or empty. */
  protected readonly editing = signal('');

  /** True while the fields for a new category are open. */
  protected readonly adding = signal(false);

  /** The name currently typed into whichever form is open. */
  protected readonly draftName = signal('');

  /** The colour currently picked in whichever form is open. */
  protected readonly draftColor = signal(DEFAULT_SWATCH);

  /** How many cards carry the given category. */
  protected countFor(category: Category): number {
    return this.usage()[category.id] ?? 0;
  }

  /** Opens the fields for a new category. */
  protected startAdding(): void {
    this.editing.set('');
    this.draftName.set('');
    this.draftColor.set(DEFAULT_SWATCH);
    this.adding.set(true);
  }

  /** Opens one category for editing. */
  protected startEditing(category: Category): void {
    this.adding.set(false);
    this.draftName.set(category.name);
    this.draftColor.set(category.color);
    this.editing.set(category.id);
  }

  /** Closes whichever form is open without saving. */
  protected cancel(): void {
    this.adding.set(false);
    this.editing.set('');
  }

  /** Remembers what was typed. */
  protected onName(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  /** Remembers which colour was picked. */
  protected pickColor(color: string): void {
    this.draftColor.set(color);
  }

  /** Hands a new category up, unless the name is empty. */
  protected saveNew(): void {
    const name = this.draftName().trim();
    if (name === '') {
      return;
    }
    this.created.emit({ name, color: this.draftColor() });
    this.cancel();
  }

  /** Hands a changed category up, unless the name is empty. */
  protected saveEdit(id: string): void {
    const name = this.draftName().trim();
    if (name === '') {
      return;
    }
    this.edited.emit({ id, name, color: this.draftColor() });
    this.cancel();
  }
}
