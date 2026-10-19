import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../core/language.service';
import type { NavItem } from '../sidebar/sidebar';

/** The last entry of the phone bar: the screens that did not fit, in a list that opens upwards. */
@Component({
  selector: 'app-more-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './more-menu.html',
  styleUrl: './more-menu.scss',
  host: { '(document:pointerdown)': 'onOutside($event)', '(keydown.escape)': 'close()', '(focusout)': 'onLeave($event)' },
})
export class MoreMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** The screens behind "more". */
  readonly items = input.required<NavItem[]>();

  /** How many access requests wait, shown on the button since the settings sit behind it. */
  readonly pending = input(0);

  /** Whether the list is open. */
  protected readonly open = signal(false);

  /** Whether the page on screen is one of those behind "more". */
  protected here(): boolean {
    return this.items().some((item) => this.router.url.startsWith(item.path));
  }

  /** Escape closes the list and puts focus back on the button. */
  protected close(): void {
    this.open.set(false);
    this.button().nativeElement.focus();
  }

  /** Tabbing out of the list closes it. */
  protected onLeave(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) {
      this.open.set(false);
    }
  }

  /** A press anywhere outside closes the list. */
  protected onOutside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
