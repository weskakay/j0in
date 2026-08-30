import { Injectable, signal } from '@angular/core';
import type { Task } from '../../../data/models';

/** How close to the edge the pointer has to be before the page creeps along. */
const EDGE = 90;

/** How many pixels each frame moves while creeping. */
const STEP = 12;

/** Where the pointer currently is, so the preview can follow it. */
export interface Point {
  x: number;
  y: number;
}

/** What a finished drag asks the board to do. */
export interface Drop {
  task: Task;
  columnId: string;
  position: number;
}

/**
 * Where inside the card the pointer took hold, and how wide the card was.
 * Without this the card would jump under the pointer the moment it lifts.
 */
export interface Grab {
  dx: number;
  dy: number;
  width: number;
}

/**
 * Holds the state of one drag. The card directive feeds it, the board reads
 * it to draw the preview and to highlight the column under the pointer.
 */
@Injectable()
export class BoardDrag {
  /** The card being dragged, or null when nothing is. */
  readonly task = signal<Task | null>(null);

  /** Id of the column under the pointer, or null. */
  readonly overColumn = signal<string | null>(null);

  /** Where in that column the card would land, counted from zero. */
  readonly overIndex = signal(0);

  /** Current pointer position in the viewport. */
  readonly point = signal<Point>({ x: 0, y: 0 });

  /** Where the card was taken hold of, so it keeps sitting under the hand. */
  readonly grab = signal<Grab>({ dx: 0, dy: 0, width: 0 });

  private frame: number | null = null;

  /** Begins a drag and remembers where it started. */
  start(task: Task, at: Point, grab: Grab): void {
    this.task.set(task);
    this.point.set(at);
    this.grab.set(grab);
    this.aimAt(at);
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /**
   * Scrolls the page while the pointer rests near the top or bottom edge.
   * On a phone the columns sit above each other, so without this the target
   * column is simply out of reach.
   */
  private creepAlong(): void {
    const { y } = this.point();
    const up = y < EDGE;
    const down = y > window.innerHeight - EDGE;
    if (up || down) {
      window.scrollBy(0, up ? -STEP : STEP);
      this.aimAt(this.point());
    }
    this.frame = requestAnimationFrame(() => this.creepAlong());
  }

  /** Follows the pointer and notes which column it is over. */
  move(at: Point): void {
    this.point.set(at);
    this.aimAt(at);
  }

  /** Works out which column and which gap the pointer is over. */
  private aimAt(at: Point): void {
    const column = columnUnder(at);
    this.overColumn.set(column);
    this.overIndex.set(column === null ? 0 : gapUnder(column, at, this.task()?.id ?? ''));
  }

  /**
   * Ends the drag. Returns what to move where, or null when the card was
   * let go outside any column. A drop into its own column is allowed, that
   * is how a card is reordered.
   */
  end(): Drop | null {
    const task = this.task();
    const columnId = this.overColumn();
    const position = this.overIndex() + 1;
    this.cancel();
    if (!task || !columnId) {
      return null;
    }
    return { task, columnId, position };
  }

  /** Drops the drag without moving anything. */
  cancel(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.task.set(null);
    this.overColumn.set(null);
  }
}

/**
 * The gap the pointer sits over, counted from zero. Every card is split at
 * its middle: above it the card lands before, below it after. The card being
 * dragged is skipped, otherwise it would count itself.
 */
function gapUnder(columnId: string, at: Point, draggedId: string): number {
  const column = document.querySelector(`[data-column-id="${columnId}"]`);
  const cards = [...(column?.querySelectorAll('[data-task-id]') ?? [])].filter(
    (card) => card.getAttribute('data-task-id') !== draggedId,
  );
  const before = cards.filter((card) => at.y > middleOf(card));
  return before.length;
}

/** The vertical middle of an element. */
function middleOf(element: Element): number {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
}

/** Id of the column the given point sits over, or null. */
function columnUnder(at: Point): string | null {
  const element = document.elementFromPoint(at.x, at.y);
  const column = element?.closest<HTMLElement>('[data-column-id]');
  return column?.dataset['columnId'] ?? null;
}
