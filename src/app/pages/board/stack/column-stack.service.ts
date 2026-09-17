import { Injectable, inject, signal } from '@angular/core';
import type { ColumnWithTasks } from '../../../core/board.store';
import { BoardDrag } from '../drag/board-drag.service';
import { FeaturesService } from '../../../core/features.service';

/** Up to this many cards a column simply lists. */
export const STACK_LIMIT = 3;

/** How many cards stay visible above and below the one in focus. */
const STACK_REACH = 2;

/** Which card each column has in focus, and which are open as a list. */
@Injectable()
export class ColumnStack {
  private readonly drag = inject(BoardDrag);
  private readonly features = inject(FeaturesService);

  private readonly focus = signal<Record<string, number>>({});
  private readonly opened = signal<ReadonlySet<string>>(new Set<string>());

  /** Whether a column holds enough cards for the stack to be offered. */
  many(entry: ColumnWithTasks): boolean {
    return this.features.cardStack() && entry.tasks.length > STACK_LIMIT;
  }

  /**
   * Whether the column shows as a stack right now. While a card is dragged
   * every column falls back to the list, so the drop position stays readable.
   */
  stacked(entry: ColumnWithTasks): boolean {
    return this.many(entry) && !this.drag.task() && !this.isOpen(entry);
  }

  /** The card in focus, kept inside the column however the board changed. */
  focusOf(entry: ColumnWithTasks): number {
    return clamp(this.focus()[entry.column.id] ?? 0, entry.tasks.length);
  }

  /** How far a card sits from the one in focus: 0 is the focused card. */
  offset(entry: ColumnWithTasks, index: number): number {
    return index - this.focusOf(entry);
  }

  /** How deep a card lies in the stack: 0 in focus, 1 and 2 behind it. */
  depth(entry: ColumnWithTasks, index: number): number {
    return Math.min(Math.abs(this.offset(entry, index)), STACK_REACH);
  }

  /** Which side of the focused card one card lies on. */
  side(entry: ColumnWithTasks, index: number): 'focus' | 'above' | 'below' {
    const offset = this.offset(entry, index);
    if (offset === 0) {
      return 'focus';
    }
    return offset < 0 ? 'above' : 'below';
  }

  /** Whether a card is far enough away to be left out of the stack. */
  hidden(entry: ColumnWithTasks, index: number): boolean {
    return Math.abs(this.offset(entry, index)) > STACK_REACH;
  }

  /** True while the focused card is the first one of the column. */
  atStart(entry: ColumnWithTasks): boolean {
    return this.focusOf(entry) === 0;
  }

  /** True while the focused card is the last one of the column. */
  atEnd(entry: ColumnWithTasks): boolean {
    return this.focusOf(entry) >= entry.tasks.length - 1;
  }

  /** Moves the focus by the given number of cards. */
  step(entry: ColumnWithTasks, delta: number): void {
    this.to(entry, this.focusOf(entry) + delta);
  }

  /** Puts a particular card into focus. */
  to(entry: ColumnWithTasks, index: number): void {
    const at = clamp(index, entry.tasks.length);
    this.focus.update((all) => ({ ...all, [entry.column.id]: at }));
  }

  /**
   * The wheel flicks through the stack. At either end the event is left
   * alone, so the page scrolls on instead of the stack sticking.
   */
  onWheel(event: WheelEvent, entry: ColumnWithTasks): boolean {
    const down = event.deltaY > 0;
    if (!this.stacked(entry) || event.deltaY === 0) {
      return false;
    }
    if (down ? this.atEnd(entry) : this.atStart(entry)) {
      return false;
    }
    event.preventDefault();
    this.step(entry, down ? 1 : -1);
    return true;
  }

  /** Switches one column between the stack and the full list. */
  toggle(entry: ColumnWithTasks): void {
    this.opened.update((all) => {
      const next = new Set(all);
      if (!next.delete(entry.column.id)) {
        next.add(entry.column.id);
      }
      return next;
    });
  }

  /** Whether the visitor has unfolded this column. */
  isOpen(entry: ColumnWithTasks): boolean {
    return this.opened().has(entry.column.id);
  }
}

/** Keeps an index inside the column, and at zero while it is empty. */
function clamp(index: number, count: number): number {
  return Math.max(0, Math.min(index, Math.max(0, count - 1)));
}
