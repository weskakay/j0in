import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import type { Dictionary } from '../../data/i18n';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { PaletteService } from '../../core/palette.service';
import { ThemeService } from '../../core/theme.service';
import { initialsOf } from '../../data/format';
import { AccountMenu } from '../account-menu/account-menu';
import { FocusPill } from '../focus-pill/focus-pill';
import { Notices } from '../notices/notices';

/**
 * The tools along the top: the way into the command palette, a new task,
 * light or dark, and the account. A bar across the width in the J0IN look,
 * a floating pill at the top right in the glass look.
 */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink, FocusPill, AccountMenu, Notices],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  host: {
    '(keydown.escape)': 'closeMenu()',
    '(document:pointerdown)': 'onOutside($event)',
    '(window:scroll)': 'onScroll()',
  },
})
export class Topbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themes = inject(ThemeService);
  private readonly palette = inject(PaletteService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The page address, kept current. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** True once the page has scrolled past its title. */
  protected readonly scrolled = signal(false);

  /** The name of the page on screen, for the title in the bar once the page scrolls. */
  protected readonly pageTitle = computed(() => {
    const key = this.url().split(/[/?]/)[1] as keyof Dictionary['nav'];
    return PAGES.includes(key) ? this.t().nav[key] : '';
  });

  /** The signed-in user. */
  protected readonly user = this.auth.user;

  /** The shortcut as this keyboard writes it. */
  protected readonly shortcut = computed(() => (onMac() ? '⌘ K' : this.t().topbar.shortcut));

  /** Whether the account menu is open. */
  protected readonly menuOpen = signal(false);

  /** Whether the owner's bell shows at all. */
  protected readonly owner = computed(() => this.user()?.role === 'owner');

  /** Whether the screen is dark right now, whatever the choice behind it. */
  protected readonly dark = computed(() => this.themes.isDark());

  /** Shows the page title in the bar once the page has scrolled past it. */
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > SCROLLED);
  }

  /** Opens the command palette. */
  protected openPalette(): void {
    this.palette.show();
  }

  /** Opens the form for a new card on the board. */
  protected newTask(): void {
    void this.router.navigate(['/board'], { queryParams: { new: 1 } });
  }

  /** Switches between light and dark. */
  protected toggleTheme(): void {
    this.themes.toggle();
  }

  /** Letters on the avatar button. */
  protected initials(): string {
    return initialsOf(this.user()?.name ?? '');
  }

  /** Opens or closes the account menu. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Closes the menu with Escape and hands the keyboard back to its button. */
  protected closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.toggle()?.nativeElement.focus();
    }
  }

  /** A press anywhere outside closes the menu. */
  protected onOutside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  /**
   * Tabbing out of the menu closes it. Some browsers do not focus a button on
   * click and report no target at all; that case is left to the press outside.
   */
  protected onMenuLeave(event: FocusEvent, menu: HTMLElement): void {
    const next = event.relatedTarget as Node | null;
    if (next && !menu.contains(next)) {
      this.menuOpen.set(false);
    }
  }
}

/** How far the page scrolls before its title shows in the bar. */
const SCROLLED = 96;

/** The pages whose name the bar can show. */
const PAGES: (keyof Dictionary['nav'])[] = ['home', 'board', 'projects', 'calendar', 'contacts', 'insights', 'settings'];

/** Whether this is an Apple keyboard, which opens the palette with the command key. */
function onMac(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}
