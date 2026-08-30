import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BoardStore } from '../../core/board.store';
import { initialsOf } from '../../data/format';

/** One entry in the main navigation. */
interface NavItem {
  path: string;
  label: string;
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

  /** The signed-in user, shown in the account menu. */
  protected readonly user = this.auth.user;

  /** Whether the account menu is open. */
  protected readonly menuOpen = signal(false);

  /** The screens reachable from the navigation. */
  protected readonly items: NavItem[] = [
    { path: '/summary', label: 'Übersicht' },
    { path: '/board', label: 'Board' },
    { path: '/contacts', label: 'Kontakte' },
    { path: '/settings', label: 'Einstellungen' },
  ];

  /** How many access requests are waiting, shown as a badge. */
  protected readonly pending = computed(() => this.user()?.pending ?? 0);

  /** Letters on the avatar button. */
  protected initials(): string {
    return initialsOf(this.user()?.name ?? '');
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
