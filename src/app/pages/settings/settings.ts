import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { ThemeService, type Theme } from '../../core/theme.service';
import type { Category } from '../../data/models';
import { ColorPicker } from '../../layout/color-picker/color-picker';
import {
  CategoryManager,
  type CategoryDraft,
  type CategoryEdit,
} from './category-manager/category-manager';

/** How many cards carry each category, keyed by its id. */
function countByCategory(tasks: { categoryId: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const task of tasks) {
    if (task.categoryId) {
      counts[task.categoryId] = (counts[task.categoryId] ?? 0) + 1;
    }
  }
  return counts;
}

/** One choice in the appearance switch. */
interface ThemeChoice {
  value: Theme;
  label: string;
  note: string;
}

/** Appearance, the board's name, and what belongs to the account. */
@Component({
  selector: 'app-settings',
  imports: [ColorPicker, CategoryManager],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themes = inject(ThemeService);
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** The signed-in user. */
  protected readonly user = this.auth.user;

  /** Whether this is the shared guest account. */
  protected readonly isGuest = computed(() => this.user()?.role === 'guest');

  /** The current appearance choice. */
  protected readonly theme = this.themes.theme;

  /** The accent colour in use, empty for the built-in one. */
  protected readonly accent = this.themes.accent;

  /** The categories of the board. */
  protected readonly categories = this.store.categories;

  /** How many cards carry each category, keyed by its id. */
  protected readonly categoryUsage = computed(() => countByCategory(this.store.tasks()));

  /** The name of the board. */
  protected readonly boardName = this.store.name;

  /** Whether a board has arrived at all. */
  protected readonly ready = this.store.ready;

  /** Message of a failed call, or null. */
  protected readonly error = this.store.error;

  /** True while a request is running. */
  protected readonly busy = signal(false);

  /** What the last finished action reported, shown as a short confirmation. */
  protected readonly done = signal('');

  /** The three ways the appearance can be decided. */
  protected readonly choices: ThemeChoice[] = [
    { value: 'system', label: 'Wie das System', note: 'folgt der Einstellung deines Geräts' },
    { value: 'light', label: 'Hell', note: 'immer heller Hintergrund' },
    { value: 'dark', label: 'Dunkel', note: 'immer dunkler Hintergrund' },
  ];

  constructor() {
    this.store.load();
  }

  /** Switches the accent colour. */
  protected pickAccent(color: string): void {
    this.themes.setAccent(color === this.accent() ? '' : color);
    this.done.set('Akzentfarbe geändert');
  }

  /** Adds a category to the board. */
  protected addCategory(draft: CategoryDraft): void {
    this.busy.set(true);
    this.store.createCategory(draft).subscribe({
      next: () => this.finish('Kategorie angelegt'),
      error: () => this.busy.set(false),
    });
  }

  /** Saves the changed name or colour of a category. */
  protected saveCategory(edit: CategoryEdit): void {
    this.busy.set(true);
    this.store.updateCategory(edit.id, { name: edit.name, color: edit.color }).subscribe({
      next: () => this.finish('Kategorie gespeichert'),
      error: () => this.busy.set(false),
    });
  }

  /** Removes a category; the cards keep existing and simply lose it. */
  protected removeCategory(category: Category): void {
    this.busy.set(true);
    this.store.deleteCategory(category.id).subscribe({
      next: () => this.finish('Kategorie gelöscht'),
      error: () => this.busy.set(false),
    });
  }

  /** Switches the appearance. */
  protected pickTheme(theme: Theme): void {
    this.themes.set(theme);
    this.done.set('Aussehen geändert');
  }

  /** Saves a new name for the board. */
  protected renameBoard(event: Event): void {
    const name = (event.target as HTMLInputElement).value.trim();
    if (name === '' || name === this.boardName()) {
      return;
    }
    this.busy.set(true);
    this.store.renameBoard(name).subscribe({
      next: () => this.finish('Name gespeichert'),
      error: () => this.busy.set(false),
    });
  }

  /** Puts the demo board back to how a visitor first finds it. */
  protected resetDemo(): void {
    this.busy.set(true);
    this.store.resetDemo().subscribe({
      next: () => this.finish('Demo zurückgesetzt'),
      error: () => this.busy.set(false),
    });
  }

  /** Ends the session and returns to the sign-in screen. */
  protected signOut(): void {
    this.store.clear();
    this.auth.signOut().subscribe(() => void this.router.navigate(['/login']));
  }

  /** Clears the busy state and says what happened. */
  private finish(message: string): void {
    this.busy.set(false);
    this.done.set(message);
  }
}
