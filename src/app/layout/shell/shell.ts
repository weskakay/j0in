import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import { initialsOf } from '../../data/format';
import type { Dictionary, Lang } from '../../data/i18n';

/** One entry in the main navigation; the wording comes from the dictionary. */
interface NavItem {
  path: string;
  key: keyof Dictionary['nav'];
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

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The language currently on screen, for the switch in the header. */
  protected readonly lang = this.language.lang;

  /** The signed-in user, shown in the account menu. */
  protected readonly user = this.auth.user;

  /** Whether the account menu is open. */
  protected readonly menuOpen = signal(false);

  /** The screens reachable from the navigation. */
  protected readonly items: NavItem[] = [
    { path: '/summary', key: 'summary' },
    { path: '/board', key: 'board' },
    { path: '/contacts', key: 'contacts' },
    { path: '/settings', key: 'settings' },
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
