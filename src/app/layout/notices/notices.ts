import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccessService } from '../../core/access.service';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';

/** How many requests the list shows before pointing to the settings. */
const SHOWN = 5;

/**
 * The owner's bell: a dot while access requests wait, and on a press a short
 * list of them with the way to the settings where they are decided.
 */
@Component({
  selector: 'app-notices',
  imports: [RouterLink],
  templateUrl: './notices.html',
  styleUrl: './notices.scss',
  host: { '(document:pointerdown)': 'onOutside($event)', '(keydown.escape)': 'open.set(false)' },
})
export class Notices {
  private readonly access = inject(AccessService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly auth = inject(AuthService);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = inject(LanguageService).dict;

  /** How many requests wait, as the account reports it. */
  protected readonly count = computed(() => this.auth.user()?.pending ?? 0);

  /** Whether the list is open. */
  protected readonly open = signal(false);

  /** The first few open requests. */
  protected readonly requests = computed(() => this.access.pending().slice(0, SHOWN));

  /** Opens or closes the list, fetching the requests on the way in. */
  protected toggle(): void {
    if (!this.open()) {
      this.access.load();
    }
    this.open.update((open) => !open);
  }

  /** A press anywhere outside closes the list. */
  protected onOutside(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
