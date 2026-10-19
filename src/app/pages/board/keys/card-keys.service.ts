import { Injectable, inject } from '@angular/core';
import { BoardStore, type ColumnWithTasks } from '../../../core/board.store';
import type { Task } from '../../../data/models';
import { BoardView } from '../filters/board-view.service';
import { ColumnStack } from '../stack/column-stack.service';
import { focusCard, holdsFocus } from '../stack/stack-focus';
import { ARROWS, VERTICAL, nextPlace } from './card-move';

/**
 * Everything the keyboard and the wheel do with the cards: browsing a stack,
 * moving a card with Alt and an arrow, and keeping the focus on the card
 * that is in front.
 */
@Injectable()
export class CardKeys {
  private readonly store = inject(BoardStore);
  private readonly view = inject(BoardView);
  private readonly stack = inject(ColumnStack);

  /**
   * Moves a card with the keyboard. Alt and an arrow key shifts it, which
   * keeps the plain arrows free for scrolling and reading.
   */
  onKeydown(event: KeyboardEvent, task: Task, entry: ColumnWithTasks): void {
    if (!event.altKey && this.stack.stacked(entry) && VERTICAL.includes(event.key)) {
      event.preventDefault();
      this.browse(entry, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (!event.altKey || !ARROWS.includes(event.key)) {
      return;
    }
    event.preventDefault();
    this.nudge(task, entry, event.key);
  }

  /** The wheel browses too, and keeps the keyboard on the card in focus. */
  onWheel(event: WheelEvent, entry: ColumnWithTasks, list: Element): void {
    if (this.stack.onWheel(event, entry) && holdsFocus(list)) {
      this.carryFocus(entry);
    }
  }

  /**
   * Tabbing onto a card that merely peeks out brings it forward, so the
   * keyboard never sits on something faded out behind another card.
   */
  onFocus(entry: ColumnWithTasks, index: number): void {
    if (this.stack.stacked(entry) && this.stack.offset(entry, index) !== 0) {
      this.stack.to(entry, index);
    }
  }

  /** Moves a card one place and keeps the stack looking at it. */
  private nudge(task: Task, entry: ColumnWithTasks, key: string): void {
    const target = nextPlace(this.view.board(), task, key);
    if (!target) {
      return;
    }
    if (this.stack.stacked(entry) && VERTICAL.includes(key)) {
      this.stack.step(entry, key === 'ArrowUp' ? -1 : 1);
    }
    const position = this.view.positionIn(target.columnId, target.position);
    this.store.moveTask(task.id, target.columnId, position).subscribe({
      next: () => this.store.load(),
    });
  }

  /**
   * Browses the stack and takes the keyboard along, otherwise it would be
   * left sitting on a card that has just slid out of the way.
   */
  private browse(entry: ColumnWithTasks, delta: number): void {
    this.stack.step(entry, delta);
    this.carryFocus(entry);
  }

  /** Puts the keyboard on whichever card the stack now has in focus. */
  private carryFocus(entry: ColumnWithTasks): void {
    const task = entry.tasks[this.stack.focusOf(entry)];
    if (task) {
      requestAnimationFrame(() => focusCard(task.id));
    }
  }
}
