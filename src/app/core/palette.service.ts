import { Injectable, signal } from '@angular/core';

/**
 * Whether the command palette is open. Kept apart from the palette itself,
 * so the top bar and the keyboard shortcut can open it from anywhere.
 */
@Injectable({ providedIn: 'root' })
export class PaletteService {
  /** True while the palette is on screen. */
  readonly open = signal(false);

  /** Opens the palette. */
  show(): void {
    this.open.set(true);
  }

  /** Closes the palette. */
  hide(): void {
    this.open.set(false);
  }

  /** Opens it when closed and closes it when open. */
  toggle(): void {
    this.open.update((open) => !open);
  }
}
