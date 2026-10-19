import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { LayoutService } from '../../core/layout.service';
import { initialsOf } from '../../data/format';
import type { Dictionary } from '../../data/i18n';
import { SheenDirective } from '../../ui/sheen.directive';
import { AccountMenu } from '../account-menu/account-menu';
import { MoreMenu } from '../more-menu/more-menu';

/** One entry in the main navigation; the wording comes from the dictionary. */
export interface NavItem {
  path: string;
  key: keyof Dictionary['nav'];
  icon: string;
  /** True for the entries the phone bar shows; the rest sit behind "more". */
  phone?: boolean;
}

/** The screens reachable from the navigation, each with its own mark. */
const ITEMS: NavItem[] = [
  { path: '/home', key: 'home', icon: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6', phone: true },
  { path: '/board', key: 'board', icon: 'M4 5h5v14H4zM15 5h5v9h-5z', phone: true },
  { path: '/projects', key: 'projects', icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', phone: true },
  { path: '/calendar', key: 'calendar', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', phone: true },
  { path: '/insights', key: 'insights', icon: 'M4 19h16M7 16V9M12 16V5M17 16v-4' },
  { path: '/contacts', key: 'contacts', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
  { path: '/settings', key: 'settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4' },
];

/** How many categories the sidebar lists as shortcuts. */
const SHORTCUTS = 5;

/**
 * The navigation: a surface down the side on wide screens, a bar along the
 * bottom on a phone. Counts next to the entries show what is waiting.
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, SheenDirective, AccountMenu, MoreMenu],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '(keydown.escape)': 'closeMenu()', '(document:pointerdown)': 'onOutside($event)' },
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  private readonly store = inject(BoardStore);
  private readonly language = inject(LanguageService);
  private readonly layout = inject(LayoutService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** True while the side navigation shows icons only. */
  protected readonly folded = this.layout.folded;

  /** True when the glass look folds the navigation on its own, which hides the fold button. */
  protected readonly autoFolded = this.layout.autoFolded;

  /** The signed-in user, for the card at the bottom. */
  protected readonly user = this.auth.user;

  /** The entries, in the order they are listed. */
  protected readonly items = ITEMS;

  /** The pinned projects, listed as shortcuts to the board narrowed to each. */
  protected readonly pinned = computed(() =>
    this.store.categories().filter((project) => project.pinned).slice(0, SHORTCUTS),
  );

  /** The entries the phone bar keeps behind "more". */
  protected readonly extra = ITEMS.filter((item) => !item.phone);

  /** Whether the account menu above the user card is open. */
  protected readonly menuOpen = signal(false);

  /** Cards not yet in the last column, shown next to the board. */
  protected readonly open = computed(() => {
    const last = this.store.columns().at(-1)?.id;
    return this.store.tasks().filter((task) => task.columnId !== last).length;
  });

  /** How many access requests are waiting, shown next to the settings. */
  protected readonly pending = computed(() => this.user()?.pending ?? 0);

  /** The count shown beside one entry, or zero for none. */
  protected countFor(item: NavItem): number {
    if (item.key === 'board') {
      return this.open();
    }
    return item.key === 'settings' ? this.pending() : 0;
  }

  /** Letters on the avatar of the user card. */
  protected initials(): string {
    return initialsOf(this.user()?.name ?? '');
  }

  /** Opens or closes the account menu. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Closes the menu with Escape and hands the keyboard back to the card. */
  protected closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.toggleButton()?.nativeElement.focus();
    }
  }

  /** A press anywhere outside closes the menu. */
  protected onOutside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  /** Tabbing out of the menu closes it; a click without a target is left to the press outside. */
  protected onMenuLeave(event: FocusEvent, box: HTMLElement): void {
    const next = event.relatedTarget as Node | null;
    if (next && !box.contains(next)) {
      this.menuOpen.set(false);
    }
  }

  /** Folds the side navigation away, or brings the labels back. */
  protected toggle(): void {
    this.layout.toggleNav();
  }
}
