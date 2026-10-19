import { Component, ElementRef, type OnDestroy, effect, inject, input, output, viewChild } from '@angular/core';
import { LanguageService } from '../../core/language.service';

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
  host: { '(document:keydown.escape)': 'onEscape($event)' },
})
export class Dialog implements OnDestroy {
  private readonly language = inject(LanguageService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Every piece of text, in the language currently on screen. */
  protected readonly t = this.language.dict;

  /** Heading of the dialog, read out as its accessible name. */
  readonly heading = input.required<string>();

  /**
   * True for a panel that slides in from the right edge on wide screens and
   * runs the full height, used for reading a task beside the board.
   */
  readonly side = input(false);

  /** Fires when the visitor closes the dialog. */
  readonly closed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  /** The control that opened the dialog, which gets focus back when it closes. */
  private readonly opener = document.activeElement as HTMLElement | null;

  /** Moves focus into the panel as soon as it is on screen. */
  private readonly focusPanel = effect(() => {
    this.panel()?.nativeElement.focus();
  });

  /** Hands focus back to the control that opened the dialog, if it is still there. */
  ngOnDestroy(): void {
    if (this.opener?.isConnected) {
      this.opener.focus();
    }
  }

  /** Tab keeps focus inside the dialog. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /**
   * Escape leaves the dialog wherever focus happens to be, but only the one
   * on top: with the form open over a task, the task stays.
   */
  protected onEscape(event: Event): void {
    const open = document.querySelectorAll('app-dialog');
    if (!event.defaultPrevented && open[open.length - 1] === this.host.nativeElement) {
      event.preventDefault();
      this.close();
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
