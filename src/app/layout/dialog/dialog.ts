import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The frame every dialog sits in: dim backdrop, a panel that scrolls on its
 * own, Escape to leave and focus that cannot wander behind it.
 */
@Component({
  selector: 'app-dialog',
  imports: [],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  /** Heading of the dialog, read out as its accessible name. */
  readonly heading = input.required<string>();

  /** Fires when the visitor closes the dialog. */
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  /** Moves focus into the panel as soon as it is on screen. */
  private readonly focusPanel = effect(() => {
    this.panel()?.nativeElement.focus();
  });

  /** Escape leaves the dialog, Tab keeps focus inside it. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /** Closing by the cross, the backdrop or Escape all end up here. */
  protected close(): void {
    this.closed.emit();
  }

  /** Wraps focus around the first and last control of the panel. */
  private trapFocus(event: KeyboardEvent): void {
    const stops = this.focusableStops();
    if (stops.length === 0) {
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const target = event.shiftKey ? first : last;
    if (document.activeElement === target || document.activeElement === this.panel()?.nativeElement) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  /** Every control inside the panel that can take focus, in reading order. */
  private focusableStops(): HTMLElement[] {
    const panel = this.panel()?.nativeElement;
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
  }
}
