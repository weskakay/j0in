import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { LayoutService } from '../../core/layout.service';
import { initialsOf } from '../../data/format';
import type { Dictionary, Lang } from '../../data/i18n';

/** One entry in the main navigation; the wording comes from the dictionary. */
interface NavItem {
  path: string;
  key: keyof Dictionary['nav'];
  icon: string;
}

/**
 * Frame around every signed-in screen: navigation on the side on wide
 * displays, along the bottom on a phone, and the account menu on top.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly board = inject(BoardStore);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly layout = inject(LayoutService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The language currently on screen, for the switch in the header. */
  protected readonly lang = this.language.lang;

  /** The signed-in user, shown in the account menu. */
  protected readonly user = this.auth.user;

  /** Whether the account menu is open. */
  protected readonly menuOpen = signal(false);

  /** True while the side navigation shows icons only. */
  protected readonly navFolded = this.layout.navFolded;

  /** The screens reachable from the navigation, each with its own mark. */
  protected readonly items: NavItem[] = [
    { path: '/summary', key: 'summary', icon: 'M4 19h16M7 16V9M12 16V5M17 16v-4' },
    { path: '/board', key: 'board', icon: 'M4 5h5v14H4zM15 5h5v9h-5z' },
    { path: '/contacts', key: 'contacts', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6' },
    { path: '/settings', key: 'settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4' },
  ];

  /** How many access requests are waiting, shown as a badge. */
  protected readonly pending = computed(() => this.user()?.pending ?? 0);

  /** Letters on the avatar button. */
  protected initials(): string {
    return initialsOf(this.user()?.name ?? '');
  }

  /**
   * Switches the interface language. On the guest board the seeded cards are
   * rewritten as well, since their wording sits on the server and cannot
   * follow the interface on its own. Cards a visitor wrote stay untouched.
   */
  protected setLang(lang: Lang): void {
    if (lang === this.lang()) {
      return;
    }
    this.language.set(lang);
    if (this.auth.isGuest()) {
      this.board.switchLanguage().subscribe({ error: () => undefined });
    }
  }

  /** Folds the side navigation away, or brings the labels back. */
  protected toggleNav(): void {
    this.layout.toggleNav();
  }

  /** Opens or closes the account menu. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Closes the account menu, used when focus leaves it. */
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Ends the session, drops the cached board and returns to sign-in. */
  protected signOut(): void {
    this.board.clear();
    this.auth.signOut().subscribe(() => void this.router.navigate(['/login']));
  }
}
