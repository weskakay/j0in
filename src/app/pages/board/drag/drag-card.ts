import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';
import type { Task } from '../../../data/models';
import { BoardDrag, type Drop } from './board-drag.service';

/** How far a mouse must travel before a press turns into a drag. */
const MOUSE_THRESHOLD = 5;

/**
 * Makes one card draggable.
 *
 * With a mouse the whole card can be grabbed. A finger has to use the grip,
 * because the browser decides at the moment of touch whether the page may
 * scroll, and a card that swallowed that decision would make the board
 * impossible to scroll on a phone.
 */
@Directive({
  selector: '[appDragCard]',
})
export class DragCard {
  /** The card this handle belongs to. */
  readonly appDragCard = input.required<Task>();

  /** Fires when the card was let go over another column. */
  readonly dropped = output<Drop>();

  private readonly drag = inject(BoardDrag);
  private readonly host = inject(ElementRef<HTMLElement>);
  /** Where a mouse press started, until it becomes a drag. */
  private origin: { x: number; y: number } | null = null;
  private active = false;
  private justDragged = false;

  /** Swallows the click that follows a drag, so the card does not open. */
  @HostListener('click', ['$event'])
  protected onClick(event: MouseEvent): void {
    if (this.justDragged) {
      event.preventDefault();
      event.stopPropagation();
      this.justDragged = false;
    }
  }

  /** Starts a drag from the grip, or arms one for the mouse. */
  @HostListener('pointerdown', ['$event'])
  protected onDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    // A drag does not always end in a click. Clearing here stops a leftover
    // block from swallowing the next ordinary tap on the card.
    this.justDragged = false;
    if (onGrip(event)) {
      this.begin(event);
    } else if (event.pointerType === 'mouse') {
      this.origin = { x: event.clientX, y: event.clientY };
    }
  }

  /** Follows the pointer while dragging, or waits for the mouse to commit. */
  @HostListener('pointermove', ['$event'])
  protected onMove(event: PointerEvent): void {
    if (this.active) {
      event.preventDefault();
      this.drag.move({ x: event.clientX, y: event.clientY });
      return;
    }
    this.considerStarting(event);
  }

  /** Ends the drag and reports where the card was let go. */
  @HostListener('pointerup')
  @HostListener('pointercancel')
  protected onUp(): void {
    this.origin = null;
    if (!this.active) {
      return;
    }
    const drop = this.drag.end();
    this.finishDrag();
    if (drop) {
      this.dropped.emit(drop);
    }
  }

  /** Puts the card back into its normal state after a drag. */
  private finishDrag(): void {
    this.active = false;
    this.justDragged = true;
    this.host.nativeElement.style.touchAction = '';
  }

  /** A mouse starts dragging once it has moved far enough to mean it. */
  private considerStarting(event: PointerEvent): void {
    if (!this.origin) {
      return;
    }
    const travelled = distance(this.origin, { x: event.clientX, y: event.clientY });
    if (travelled > MOUSE_THRESHOLD) {
      this.begin(event);
    }
  }

  /**
   * Turns the press into a real drag. The pointer is only captured here,
   * never on the press itself: capturing early would redirect the click that
   * follows an ordinary tap, and the card would stop opening.
   */
  private begin(event: PointerEvent): void {
    this.active = true;
    this.host.nativeElement.setPointerCapture(event.pointerId);
    const box = this.host.nativeElement.getBoundingClientRect();
    this.drag.start(this.appDragCard(), { x: event.clientX, y: event.clientY }, {
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
      width: box.width,
    });
  }
}

/** Whether the press landed on the grip rather than somewhere on the card. */
function onGrip(event: PointerEvent): boolean {
  const target = event.target as HTMLElement | null;
  return target?.closest('[data-drag-handle]') !== null && target !== null;
}

/** Straight-line distance between two points. */
function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
