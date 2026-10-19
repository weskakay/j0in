import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { LanguageService } from '../../core/language.service';
import type { Lang } from '../../data/i18n';

/**
 * What the account offers: who is signed in, the language and signing out.
 * Opened from the avatar in the top bar and from the card in the sidebar.
 */
@Component({
  selector: 'app-account-menu',
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu {
  private readonly auth = inject(AuthService);
  private readonly board = inject(BoardStore);
  private readonly language = inject(LanguageService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** The language currently on screen. */
  protected readonly lang = this.language.lang;

  /** The signed-in user. */
  protected readonly user = this.auth.user;

  /** The languages on offer. */
  protected readonly langs: Lang[] = ['de', 'en'];

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

  /** Ends the session and returns to sign-in. */
  protected signOut(): void {
    this.auth.leave();
  }
}
