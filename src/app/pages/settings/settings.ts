import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { AccessService } from '../../core/access.service';
import { LanguageService } from '../../core/language.service';
import { ThemeService, type Theme } from '../../core/theme.service';
import type { AccessRequest, Category } from '../../data/models';
import type { Dictionary } from '../../data/i18n';
import { ColorPicker } from '../../layout/color-picker/color-picker';
import { AccessList } from './access-list/access-list';
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

/** One choice in the appearance switch, named by the dictionary. */
interface ThemeChoice {
  value: Theme;
  label: string;
  note: string;
}

/** What the last action reported, kept as a key so it follows the language. */
interface DoneMessage {
  key: keyof Dictionary['settings'];
  who?: string;
}

/** Appearance, the board's name, and what belongs to the account. */
@Component({
  selector: 'app-settings',
  imports: [ColorPicker, CategoryManager, AccessList],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themes = inject(ThemeService);
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly access = inject(AccessService);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The signed-in user. */
  protected readonly user = this.auth.user;

  /** Whether this is the shared guest account. */
  protected readonly isGuest = computed(() => this.user()?.role === 'guest');

  /** Whether this account decides who may use the app. */
  protected readonly isOwner = computed(() => this.user()?.role === 'owner');

  /** The requests for access, for the owner's cards. */
  protected readonly requests = this.access.requests;

  /** True while the request list is being fetched. */
  protected readonly requestsLoading = this.access.loading;

  /** Id of the request a decision is currently running for. */
  protected readonly deciding = signal('');

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
  protected readonly done = signal<DoneMessage | null>(null);

  /** That confirmation as a sentence, in the language currently on screen. */
  protected readonly doneText = computed(() => sentenceFor(this.done(), this.t()));

  /** The three ways the appearance can be decided. */
  protected readonly choices = computed<ThemeChoice[]>(() => {
    const s = this.t().settings;
    return [
      { value: 'system', label: s.system, note: s.systemNote },
      { value: 'light', label: s.light, note: s.lightNote },
      { value: 'dark', label: s.dark, note: s.darkNote },
    ];
  });

  constructor() {
    this.store.load();
    if (this.isOwner()) {
      this.access.load();
    }
  }

  /** Lets one address in. */
  protected approve(request: AccessRequest): void {
    this.deciding.set(request.id);
    this.access.approve(request.id).subscribe({
      next: () => this.decided({ key: 'approved', who: request.email }),
      error: () => this.deciding.set(''),
    });
  }

  /** Turns one request down. */
  protected decline(request: AccessRequest): void {
    this.deciding.set(request.id);
    this.access.decline(request.id).subscribe({
      next: () => this.decided({ key: 'declined', who: request.email }),
      error: () => this.deciding.set(''),
    });
  }

  /**
   * Clears the running decision, says what happened, and reads the account
   * back so the badge in the navigation matches what is left.
   */
  private decided(message: DoneMessage): void {
    this.deciding.set('');
    this.done.set(message);
    this.auth.restore().subscribe();
  }

  /** Switches the accent colour. */
  protected pickAccent(color: string): void {
    this.themes.setAccent(color === this.accent() ? '' : color);
    this.done.set({ key: 'savedAccent' });
  }

  /** Adds a category to the board. */
  protected addCategory(draft: CategoryDraft): void {
    this.busy.set(true);
    this.store.createCategory(draft).subscribe({
      next: () => this.finish('addedCategory'),
      error: () => this.busy.set(false),
    });
  }

  /** Saves the changed name or colour of a category. */
  protected saveCategory(edit: CategoryEdit): void {
    this.busy.set(true);
    this.store.updateCategory(edit.id, { name: edit.name, color: edit.color }).subscribe({
      next: () => this.finish('savedCategory'),
      error: () => this.busy.set(false),
    });
  }

  /** Removes a category; the cards keep existing and simply lose it. */
  protected removeCategory(category: Category): void {
    this.busy.set(true);
    this.store.deleteCategory(category.id).subscribe({
      next: () => this.finish('removedCategory'),
      error: () => this.busy.set(false),
    });
  }

  /** Switches the appearance. */
  protected pickTheme(theme: Theme): void {
    this.themes.set(theme);
    this.done.set({ key: 'savedTheme' });
  }

  /** Saves a new name for the board. */
  protected renameBoard(event: Event): void {
    const name = (event.target as HTMLInputElement).value.trim();
    if (name === '' || name === this.boardName()) {
      return;
    }
    this.busy.set(true);
    this.store.renameBoard(name).subscribe({
      next: () => this.finish('savedName'),
      error: () => this.busy.set(false),
    });
  }

  /** Puts the demo board back to how a visitor first finds it. */
  protected resetDemo(): void {
    this.busy.set(true);
    this.store.resetDemo().subscribe({
      next: () => this.finish('savedDemo'),
      error: () => this.busy.set(false),
    });
  }

  /** Ends the session and returns to the sign-in screen. */
  protected signOut(): void {
    this.store.clear();
    this.auth.signOut().subscribe(() => void this.router.navigate(['/login']));
  }

  /** Clears the busy state and says what happened. */
  private finish(key: DoneMessage['key']): void {
    this.busy.set(false);
    this.done.set({ key });
  }
}

/** Turns the stored key back into a sentence, with the address in front of it. */
function sentenceFor(message: DoneMessage | null, t: Dictionary): string {
  if (!message) {
    return '';
  }
  const text = t.settings[message.key];
  return message.who ? `${message.who} ${text}` : text;
}
